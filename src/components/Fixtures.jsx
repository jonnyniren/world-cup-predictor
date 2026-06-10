import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase.js';
import { doc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';

// ── Flag mapping ──────────────────────────────────────────────────────────────
const FLAG_MAP = {
  'USA': '🇺🇸', 'United States': '🇺🇸',
  'Canada': '🇨🇦',
  'Mexico': '🇲🇽',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'England': '🇬🇧',
  'Spain': '🇪🇸',
  'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Italy': '🇮🇹',
  'Croatia': '🇭🇷',
  'Morocco': '🇲🇦',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'Australia': '🇦🇺',
  'Saudi Arabia': '🇸🇦',
  'Iran': '🇮🇷',
  'Senegal': '🇸🇳',
  'Nigeria': '🇳🇬',
  'Cameroon': '🇨🇲',
  'Ghana': '🇬🇭',
  'Ecuador': '🇪🇨',
  'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴',
  'Chile': '🇨🇱',
  'Switzerland': '🇨🇭',
  'Poland': '🇵🇱',
  'Serbia': '🇷🇸',
  'Austria': '🇦🇹',
  'Ukraine': '🇺🇦',
  'Denmark': '🇩🇰',
  'Norway': '🇳🇴',
  'Sweden': '🇸🇪',
  'Turkey': '🇹🇷', 'Türkiye': '🇹🇷',
  'Greece': '🇬🇷',
  'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  'Romania': '🇷🇴',
  'Slovakia': '🇸🇰',
  'Hungary': '🇭🇺',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Qatar': '🇶🇦',
  'Egypt': '🇪🇬',
  'Ivory Coast': '🇨🇮', "Côte d'Ivoire": '🇨🇮',
  'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩',
  'Algeria': '🇩🇿',
  'Tunisia': '🇹🇳',
  'Panama': '🇵🇦',
  'Costa Rica': '🇨🇷',
  'Honduras': '🇭🇳',
  'Jamaica': '🇯🇲',
  'New Zealand': '🇳🇿',
  'Peru': '🇵🇪',
  'Paraguay': '🇵🇾',
  'Venezuela': '🇻🇪',
  'Bolivia': '🇧🇴',
  'Iraq': '🇮🇶',
  'Uzbekistan': '🇺🇿',
  'Indonesia': '🇮🇩',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
};

function getFlag(name) {
  if (!name) return '⚽';
  return FLAG_MAP[name] || '⚽';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CACHE_KEY = 'wc2026_fixtures_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY || 'f882d1fa200843c78dc1d9da8e200b34';

function formatBST(utcString) {
  if (!utcString) return '';
  try {
    const d = new Date(utcString);
    return d.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatDateLabel(utcString) {
  if (!utcString) return '';
  try {
    const d = new Date(utcString);
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return utcString.slice(0, 10);
  }
}

function getDateKey(utcString) {
  if (!utcString) return 'unknown';
  try {
    const d = new Date(utcString);
    // Get date in London timezone
    return d.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
  } catch {
    return utcString.slice(0, 10);
  }
}

function getMatchStatus(match) {
  const status = match.status;
  if (status === 'FINISHED') return 'final';
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live';
  const kickoff = new Date(match.utcDate);
  if (new Date() >= kickoff) return 'locked';
  return 'upcoming';
}

function StatusBadge({ status }) {
  const map = {
    upcoming: ['badge-upcoming', 'UPCOMING'],
    locked:   ['badge-locked', '🔒 LOCKED'],
    live:     ['badge-live', 'LIVE ⚽'],
    final:    ['badge-final', 'FINAL ✓'],
  };
  const [cls, label] = map[status] || map.upcoming;
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Fixtures({ user }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimitMsg, setRateLimitMsg] = useState(null);
  const [predictions, setPredictions] = useState({}); // { matchId: { home, away } }
  const [unsaved, setUnsaved] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [filter, setFilter] = useState('all');
  const toastTimer = useRef(null);

  // Load predictions from Firestore on mount
  useEffect(() => {
    if (!user) return;
    loadPredictions();
  }, [user]);

  // Load fixtures
  useEffect(() => {
    fetchFixtures();
  }, []);

  async function loadPredictions() {
    try {
      const q = query(collection(db, 'predictions'), where('userId', '==', user.id));
      const snap = await getDocs(q);
      const loaded = {};
      snap.forEach(docSnap => {
        const d = docSnap.data();
        loaded[d.matchId] = { home: String(d.homeScore), away: String(d.awayScore) };
      });
      setPredictions(loaded);
    } catch (e) {
      console.warn('Could not load predictions from Firestore:', e);
    }
  }

  async function fetchFixtures(forceRefresh = false) {
    setLoading(true);
    setError(null);
    setRateLimitMsg(null);

    // Check cache
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, cachedAt } = JSON.parse(cached);
          if (Date.now() - cachedAt < CACHE_TTL) {
            setMatches(data);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch(
        'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
        { headers: { 'X-Auth-Token': API_KEY } }
      );

      // Rate limit handling
      const remaining = res.headers.get('X-Requests-Available-Minute');
      if (res.status === 429 || remaining === '0') {
        setRateLimitMsg('Loading fixtures... rate limit reached. Retrying in 60 seconds.');
        setTimeout(() => fetchFixtures(true), 60000);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const data = json.matches || [];

      // Cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
      setMatches(data);
    } catch (e) {
      // Fallback: try cache even if stale
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data } = JSON.parse(cached);
          setMatches(data);
          setError('Using cached data (offline or API error)');
        } else {
          setError(e.message || 'Failed to load fixtures');
        }
      } catch {
        setError(e.message || 'Failed to load fixtures');
      }
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg) {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }

  // Auto-save single prediction on blur
  async function handleBlur(matchId) {
    if (!user) return;
    const pred = predictions[matchId];
    if (!pred || (pred.home === '' && pred.away === '')) return;
    if (pred.home === '' || pred.away === '') return; // need both

    try {
      const docId = `${user.id}_${matchId}`;
      const batch = writeBatch(db);
      batch.set(doc(db, 'predictions', docId), {
        userId: user.id,
        matchId: Number(matchId),
        homeScore: Number(pred.home),
        awayScore: Number(pred.away),
        updatedAt: new Date(),
      });
      await batch.commit();
      setUnsaved(prev => { const s = new Set(prev); s.delete(matchId); return s; });
      showToast('Saved ✓');
    } catch (e) {
      console.error('Save error', e);
      showToast('Save failed — check connection');
    }
  }

  function handleScoreChange(matchId, side, value) {
    // Only allow 0-20
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 2);
    const num = parseInt(sanitized, 10);
    if (sanitized !== '' && (num < 0 || num > 20)) return;

    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || {}),
        [side]: sanitized,
      }
    }));
    setUnsaved(prev => new Set([...prev, matchId]));
  }

  // Save all unsaved predictions
  async function saveAll() {
    if (!user || unsaved.size === 0) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const matchId of unsaved) {
        const pred = predictions[matchId];
        if (!pred || pred.home === '' || pred.away === '') continue;
        const docId = `${user.id}_${matchId}`;
        batch.set(doc(db, 'predictions', docId), {
          userId: user.id,
          matchId: Number(matchId),
          homeScore: Number(pred.home),
          awayScore: Number(pred.away),
          updatedAt: new Date(),
        });
        count++;
      }
      if (count > 0) await batch.commit();
      setUnsaved(new Set());
      showToast(`${count} prediction${count !== 1 ? 's' : ''} saved! ✓`);
    } catch (e) {
      console.error(e);
      showToast('Save failed — check connection');
    } finally {
      setSaving(false);
    }
  }

  // Group matches by date
  const grouped = React.useMemo(() => {
    const result = {};
    const filtered = filter === 'all' ? matches : matches.filter(m => {
      if (filter === 'group') return m.stage && m.stage.includes('GROUP');
      if (filter === 'knockout') return m.stage && !m.stage.includes('GROUP');
      if (filter === 'upcoming') return getMatchStatus(m) === 'upcoming';
      if (filter === 'my') return predictions[m.id] && (predictions[m.id].home !== '' || predictions[m.id].away !== '');
      return true;
    });
    for (const m of filtered) {
      const key = getDateKey(m.utcDate);
      if (!result[key]) result[key] = { label: formatDateLabel(m.utcDate), matches: [] };
      result[key].matches.push(m);
    }
    return result;
  }, [matches, filter, predictions]);

  const dateKeys = Object.keys(grouped).sort((a, b) => {
    // Sort by original date
    const da = grouped[a].matches[0]?.utcDate;
    const db2 = grouped[b].matches[0]?.utcDate;
    return new Date(da) - new Date(db2);
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span className="loading-text">Loading World Cup fixtures... ⚽</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="filter-bar">
        {['all', 'group', 'knockout', 'upcoming', 'my'].map(f => (
          <button
            key={f}
            className={`filter-chip${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' && '🌍 All'}
            {f === 'group' && '📋 Group Stage'}
            {f === 'knockout' && '⚡ Knockout'}
            {f === 'upcoming' && '⏰ Upcoming'}
            {f === 'my' && '✏️ My Picks'}
          </button>
        ))}
      </div>

      {rateLimitMsg && (
        <div className="card card-sm" style={{ margin: '12px', background: '#fff8e1', borderLeft: '4px solid #FFD700' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>⏳ {rateLimitMsg}</p>
        </div>
      )}

      {error && (
        <div className="card card-sm" style={{ margin: '12px', background: '#fff3f3', borderLeft: '4px solid #ffcdd2' }}>
          <p style={{ fontSize: '0.85rem', color: '#c62828', fontWeight: 600 }}>⚠️ {error}</p>
        </div>
      )}

      {matches.length === 0 && !loading && !error && (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <div className="empty-icon">📅</div>
          <div className="empty-text">No fixtures available yet.<br />Check back soon!</div>
          <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={() => fetchFixtures(true)}>
            🔄 Refresh
          </button>
        </div>
      )}

      {dateKeys.length === 0 && matches.length > 0 && (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <div className="empty-icon">🔍</div>
          <div className="empty-text">No matches found for this filter.</div>
        </div>
      )}

      {dateKeys.map(key => (
        <div className="date-group" key={key}>
          <div className="date-header">
            📅 {grouped[key].label}
          </div>
          <div className="card">
            {grouped[key].matches.map((match, idx) => {
              const status = getMatchStatus(match);
              const isLocked = status === 'locked' || status === 'live' || status === 'final';
              const homeName = match.homeTeam?.name || 'TBD';
              const awayName = match.awayTeam?.name || 'TBD';
              const homeFlag = match.homeTeam?.name ? getFlag(match.homeTeam.name) : '⚽';
              const awayFlag = match.awayTeam?.name ? getFlag(match.awayTeam.name) : '⚽';
              const pred = predictions[match.id] || { home: '', away: '' };
              const hasPred = pred.home !== '' && pred.away !== '';

              // Show actual score if finished
              const actualHome = status === 'final' && match.score?.fullTime?.home != null
                ? String(match.score.fullTime.home) : null;
              const actualAway = status === 'final' && match.score?.fullTime?.away != null
                ? String(match.score.fullTime.away) : null;

              return (
                <div
                  key={match.id}
                  className={`match-row${isLocked ? ' locked' : ''}${hasPred ? ' has-prediction' : ''}`}
                >
                  {/* Home team */}
                  <div className="team-side home">
                    <span className="team-name" title={homeName}>{homeName}</span>
                    <span className="team-flag">{homeFlag}</span>
                  </div>

                  {/* Score inputs / actual score */}
                  <div className="match-center">
                    <div className="score-input-wrapper">
                      {status === 'final' ? (
                        <>
                          <div className="score-input locked" style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>
                            {actualHome}
                          </div>
                          <span className="score-separator">:</span>
                          <div className="score-input locked" style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>
                            {actualAway}
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            className={`score-input${isLocked ? ' locked' : ''}`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="20"
                            placeholder="?"
                            value={pred.home}
                            onChange={e => !isLocked && handleScoreChange(match.id, 'home', e.target.value)}
                            onBlur={() => !isLocked && handleBlur(match.id)}
                            disabled={isLocked}
                            aria-label={`${homeName} score`}
                          />
                          <span className="score-separator">:</span>
                          <input
                            className={`score-input${isLocked ? ' locked' : ''}`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="20"
                            placeholder="?"
                            value={pred.away}
                            onChange={e => !isLocked && handleScoreChange(match.id, 'away', e.target.value)}
                            onBlur={() => !isLocked && handleBlur(match.id)}
                            disabled={isLocked}
                            aria-label={`${awayName} score`}
                          />
                        </>
                      )}
                    </div>
                    <span className="match-time">{formatBST(match.utcDate)}</span>
                    <StatusBadge status={status} />
                  </div>

                  {/* Away team */}
                  <div className="team-side away">
                    <span className="team-flag">{awayFlag}</span>
                    <span className="team-name" title={awayName}>{awayName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save bar */}
      {unsaved.size > 0 && (
        <div className="save-bar">
          <span className="save-bar-text">
            <span className="unsaved-dot" />
            {unsaved.size} unsaved prediction{unsaved.size !== 1 ? 's' : ''}
          </span>
          <button
            className="btn btn-gold"
            onClick={saveAll}
            disabled={saving}
            style={{ minHeight: 40, padding: '8px 20px', fontSize: '0.9rem' }}
          >
            {saving ? 'Saving...' : 'Save All ✓'}
          </button>
        </div>
      )}

      {/* Refresh */}
      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <button className="refresh-btn" onClick={() => fetchFixtures(true)}>
          🔄 Refresh Fixtures
        </button>
      </div>

      {/* Toast */}
      <div className={`toast${toastVisible ? ' show' : ''}`}>
        {toastMsg}
      </div>
    </div>
  );
}
