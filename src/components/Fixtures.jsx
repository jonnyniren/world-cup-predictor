import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { getRanking, getRankTier } from '../rankings.js';

// ── Comprehensive flag mapping ────────────────────────────────────────────────
const FLAG_MAP = {
  // Americas
  'USA': '🇺🇸', 'United States': '🇺🇸',
  'Canada': '🇨🇦',
  'Mexico': '🇲🇽',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴',
  'Ecuador': '🇪🇨',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Paraguay': '🇵🇾',
  'Venezuela': '🇻🇪',
  'Bolivia': '🇧🇴',
  'Panama': '🇵🇦',
  'Costa Rica': '🇨🇷',
  'Honduras': '🇭🇳',
  'Jamaica': '🇯🇲',
  'Haiti': '🇭🇹',
  'Trinidad and Tobago': '🇹🇹', 'Trinidad & Tobago': '🇹🇹',
  'El Salvador': '🇸🇻',
  'Guatemala': '🇬🇹',
  'Cuba': '🇨🇺',
  'Guyana': '🇬🇾',
  'Suriname': '🇸🇷',
  // Europe
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain': '🇪🇸',
  'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Italy': '🇮🇹',
  'Croatia': '🇭🇷',
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
  'Albania': '🇦🇱',
  'Slovenia': '🇸🇮',
  'Georgia': '🇬🇪',
  'Finland': '🇫🇮',
  'Ireland': '🇮🇪', 'Republic of Ireland': '🇮🇪',
  'Israel': '🇮🇱',
  'Montenegro': '🇲🇪',
  'North Macedonia': '🇲🇰',
  'Bulgaria': '🇧🇬',
  'Luxembourg': '🇱🇺',
  'Kosovo': '🇽🇰',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia & Herzegovina': '🇧🇦', 'Bosnia-Herzegovina': '🇧🇦', 'Bosnia': '🇧🇦',
  'Northern Ireland': '🇬🇧',
  'Russia': '🇷🇺',
  // Africa
  'Morocco': '🇲🇦',
  'Senegal': '🇸🇳',
  'Nigeria': '🇳🇬',
  'Cameroon': '🇨🇲',
  'Ghana': '🇬🇭',
  'Egypt': '🇪🇬',
  'Ivory Coast': '🇨🇮', "Côte d'Ivoire": '🇨🇮', 'Cote d\'Ivoire': '🇨🇮',
  'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩', 'Democratic Republic of Congo': '🇨🇩',
  'Algeria': '🇩🇿',
  'Tunisia': '🇹🇳',
  'South Africa': '🇿🇦',
  'Mali': '🇲🇱',
  'Guinea': '🇬🇳',
  'Cape Verde': '🇨🇻',
  'Benin': '🇧🇯',
  'Ethiopia': '🇪🇹',
  'Tanzania': '🇹🇿',
  'Zimbabwe': '🇿🇼',
  'Zambia': '🇿🇲',
  'Angola': '🇦🇴',
  'Uganda': '🇺🇬',
  'Mozambique': '🇲🇿',
  'Burkina Faso': '🇧🇫',
  'Libya': '🇱🇾',
  'Sudan': '🇸🇩',
  'Kenya': '🇰🇪',
  'Gabon': '🇬🇦',
  // Asia
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'Australia': '🇦🇺',
  'Saudi Arabia': '🇸🇦',
  'Iran': '🇮🇷',
  'Qatar': '🇶🇦',
  'Iraq': '🇮🇶',
  'Uzbekistan': '🇺🇿',
  'Indonesia': '🇮🇩',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
  'China': '🇨🇳', 'China PR': '🇨🇳',
  'India': '🇮🇳',
  'Jordan': '🇯🇴',
  'Oman': '🇴🇲',
  'UAE': '🇦🇪', 'United Arab Emirates': '🇦🇪',
  'Kyrgyzstan': '🇰🇬',
  'Tajikistan': '🇹🇯',
  'Philippines': '🇵🇭',
  'Bahrain': '🇧🇭',
  'Kuwait': '🇰🇼',
  'Syria': '🇸🇾',
  'Palestine': '🇵🇸',
  // Oceania
  'New Zealand': '🇳🇿',
  'Fiji': '🇫🇯',
  'Papua New Guinea': '🇵🇬',
  'Solomon Islands': '🇸🇧',
  'Vanuatu': '🇻🇺',
  'Tahiti': '🇵🇫',
};

function getFlag(name) {
  if (!name) return '⚽';
  if (FLAG_MAP[name]) return FLAG_MAP[name];
  // Partial match fallback — handles e.g. "Bosnia and Herzegovina (AET)"
  const lower = name.toLowerCase();
  for (const [key, flag] of Object.entries(FLAG_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return flag;
  }
  return '⚽';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CACHE_KEY = 'wc2026_fixtures_cache';
const CACHE_TTL = 5 * 60 * 1000;

function formatBST(utcString) {
  if (!utcString) return '';
  try {
    return new Date(utcString).toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDateLabel(utcString) {
  if (!utcString) return '';
  try {
    return new Date(utcString).toLocaleDateString('en-GB', {
      timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return utcString.slice(0, 10); }
}

function getDateKey(utcString) {
  if (!utcString) return 'unknown';
  try { return new Date(utcString).toLocaleDateString('en-GB', { timeZone: 'Europe/London' }); }
  catch { return utcString.slice(0, 10); }
}

function getMatchStatus(match) {
  if (match.status === 'FINISHED') return 'final';
  if (match.status === 'IN_PLAY' || match.status === 'PAUSED') return 'live';
  if (new Date() >= new Date(match.utcDate)) return 'locked';
  return 'upcoming';
}

function getResult(h, a) {
  if (h > a) return 'home'; if (a > h) return 'away'; return 'draw';
}

function getPredictionPoints(pred, match) {
  if (!pred || pred.home === '' || pred.away === '') return null;
  const aH = match.score?.fullTime?.home, aA = match.score?.fullTime?.away;
  if (aH == null || aA == null) return null;
  const pH = Number(pred.home), pA = Number(pred.away);
  const actualH = Number(aH), actualA = Number(aA);
  if (pH === actualH && pA === actualA) return { pts: 3, label: '🎉 Exact score! +3pts' };
  if (getResult(pH, pA) === getResult(actualH, actualA)) return { pts: 1, label: '✓ Correct result +1pt' };
  return { pts: 0, label: '✗ No points' };
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
  const [predictions, setPredictions] = useState({});
  const [unsaved, setUnsaved] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [filter, setFilter] = useState('all');
  const toastTimer = useRef(null);

  useEffect(() => { if (user) loadPredictions(); }, [user]);
  useEffect(() => { fetchFixtures(); }, []);

  async function loadPredictions() {
    try {
      const { data, error } = await supabase.from('predictions').select('*').eq('user_id', user.id);
      if (error) throw error;
      const loaded = {};
      (data || []).forEach(row => {
        loaded[row.match_id] = { home: String(row.home_score), away: String(row.away_score) };
      });
      setPredictions(loaded);
    } catch (e) { console.warn('Could not load predictions:', e); }
  }

  async function fetchFixtures(forceRefresh = false) {
    setLoading(true); setError(null); setRateLimitMsg(null);

    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, cachedAt } = JSON.parse(cached);
          if (Date.now() - cachedAt < CACHE_TTL) { setMatches(data); setLoading(false); return; }
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch('/api/fixtures');
      const remaining = res.headers.get('X-Requests-Available-Minute');
      if (res.status === 429 || remaining === '0') {
        setRateLimitMsg('Loading fixtures... rate limit reached. Retrying in 60 seconds.');
        setTimeout(() => fetchFixtures(true), 60000);
        setLoading(false); return;
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      const data = json.matches || [];
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
      setMatches(data);
    } catch (e) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) { setMatches(JSON.parse(cached).data); setError('Using cached data (offline or API error)'); }
        else setError(e.message || 'Failed to load fixtures');
      } catch { setError(e.message || 'Failed to load fixtures'); }
    } finally { setLoading(false); }
  }

  function showToast(msg) {
    setToastMsg(msg); setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }

  async function handleBlur(matchId) {
    if (!user) return;
    const pred = predictions[matchId];
    if (!pred || pred.home === '' || pred.away === '') return;
    try {
      const { error } = await supabase.from('predictions').upsert({
        id: `${user.id}_${matchId}`,
        user_id: user.id,
        match_id: Number(matchId),
        home_score: Number(pred.home),
        away_score: Number(pred.away),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setUnsaved(prev => { const s = new Set(prev); s.delete(matchId); return s; });
      showToast('Saved ✓');
    } catch (e) { console.error(e); showToast('Save failed — check connection'); }
  }

  function handleScoreChange(matchId, side, value) {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 2);
    const num = parseInt(sanitized, 10);
    if (sanitized !== '' && (num < 0 || num > 20)) return;
    setPredictions(prev => ({ ...prev, [matchId]: { ...(prev[matchId] || {}), [side]: sanitized } }));
    setUnsaved(prev => new Set([...prev, matchId]));
  }

  async function saveAll() {
    if (!user || unsaved.size === 0) return;
    setSaving(true);
    try {
      const rows = [];
      for (const matchId of unsaved) {
        const pred = predictions[matchId];
        if (!pred || pred.home === '' || pred.away === '') continue;
        rows.push({ id: `${user.id}_${matchId}`, user_id: user.id, match_id: Number(matchId), home_score: Number(pred.home), away_score: Number(pred.away), updated_at: new Date().toISOString() });
      }
      if (rows.length > 0) { const { error } = await supabase.from('predictions').upsert(rows); if (error) throw error; }
      setUnsaved(new Set());
      showToast(`${rows.length} prediction${rows.length !== 1 ? 's' : ''} saved! ✓`);
    } catch (e) { console.error(e); showToast('Save failed — check connection'); }
    finally { setSaving(false); }
  }

  const grouped = React.useMemo(() => {
    const result = {};
    const filtered = matches.filter(m => {
      if (filter === 'group') return m.stage && m.stage.includes('GROUP');
      if (filter === 'knockout') return m.stage && !m.stage.includes('GROUP');
      if (filter === 'upcoming') return getMatchStatus(m) === 'upcoming';
      return true; // 'all'
    });
    for (const m of filtered) {
      const key = getDateKey(m.utcDate);
      if (!result[key]) result[key] = { label: formatDateLabel(m.utcDate), matches: [] };
      result[key].matches.push(m);
    }
    return result;
  }, [matches, filter]);

  const dateKeys = Object.keys(grouped).sort((a, b) => {
    const da = grouped[a].matches[0]?.utcDate;
    const db = grouped[b].matches[0]?.utcDate;
    return new Date(da) - new Date(db);
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
      <div className="filter-bar">
        {[
          ['all', '🌍 All'],
          ['group', '📋 Groups'],
          ['knockout', '⚡ Knockout'],
          ['upcoming', '⏰ Upcoming'],
        ].map(([f, label]) => (
          <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {label}
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
          <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={() => fetchFixtures(true)}>🔄 Refresh</button>
        </div>
      )}
      {dateKeys.length === 0 && matches.length > 0 && (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <div className="empty-icon">✅</div>
          <div className="empty-text">You're all caught up!<br />No upcoming matches to predict right now.</div>
        </div>
      )}

      {dateKeys.map(key => (
        <div className="date-group" key={key}>
          <div className="date-header">📅 {grouped[key].label}</div>
          <div className="card">
            {grouped[key].matches.map(match => {
              const status = getMatchStatus(match);
              const isLocked = status === 'locked' || status === 'live' || status === 'final';
              const homeName = match.homeTeam?.name || 'TBD';
              const awayName = match.awayTeam?.name || 'TBD';
              const homeFlag = getFlag(match.homeTeam?.name);
              const awayFlag = getFlag(match.awayTeam?.name);
              const homeRank = getRanking(match.homeTeam?.name);
              const awayRank = getRanking(match.awayTeam?.name);
              const pred = predictions[match.id] || { home: '', away: '' };
              const hasPred = pred.home !== '' && pred.away !== '';
              const actualHome = status === 'final' && match.score?.fullTime?.home != null ? String(match.score.fullTime.home) : null;
              const actualAway = status === 'final' && match.score?.fullTime?.away != null ? String(match.score.fullTime.away) : null;
              const pointsInfo = status === 'final' ? getPredictionPoints(hasPred ? pred : null, match) : null;

              return (
                <div key={match.id} className={`match-row${isLocked ? ' locked' : ''}${hasPred && !isLocked ? ' has-prediction' : ''}`}>
                  <div className="team-side home">
                    <div className="team-info home">
                      <span className="team-name">{homeName}</span>
                      {homeRank && <span className={`rank-badge ${getRankTier(homeRank)}`}>#{homeRank}</span>}
                    </div>
                    <span className="team-flag">{homeFlag}</span>
                  </div>

                  <div className="match-center">
                    <div className="score-input-wrapper">
                      {status === 'final' ? (
                        <>
                          <div className="score-display">{actualHome}</div>
                          <span className="score-separator">:</span>
                          <div className="score-display">{actualAway}</div>
                        </>
                      ) : (
                        <>
                          <input
                            className={`score-input${isLocked ? ' locked' : ''}`}
                            type="number" inputMode="numeric" min="0" max="20" placeholder="?"
                            value={pred.home}
                            onChange={e => !isLocked && handleScoreChange(match.id, 'home', e.target.value)}
                            onBlur={() => !isLocked && handleBlur(match.id)}
                            disabled={isLocked}
                            aria-label={`${homeName} score`}
                          />
                          <span className="score-separator">:</span>
                          <input
                            className={`score-input${isLocked ? ' locked' : ''}`}
                            type="number" inputMode="numeric" min="0" max="20" placeholder="?"
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

                    {/* Inline prediction result for finished matches */}
                    {status === 'final' && hasPred && pointsInfo && (
                      <div className={`pred-result pts-${pointsInfo.pts}`}>
                        <span className="pred-your-pick">You: {pred.home}–{pred.away}</span>
                        <span className="pred-pts-label">{pointsInfo.label}</span>
                      </div>
                    )}
                    {status === 'final' && !hasPred && (
                      <div className="pred-result pts-none">
                        <span className="pred-your-pick" style={{ color: '#bbb' }}>No prediction</span>
                      </div>
                    )}
                  </div>

                  <div className="team-side away">
                    <span className="team-flag">{awayFlag}</span>
                    <div className="team-info away">
                      <span className="team-name">{awayName}</span>
                      {awayRank && <span className={`rank-badge ${getRankTier(awayRank)}`}>#{awayRank}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {unsaved.size > 0 && (
        <div className="save-bar">
          <span className="save-bar-text"><span className="unsaved-dot" />{unsaved.size} unsaved prediction{unsaved.size !== 1 ? 's' : ''}</span>
          <button className="btn btn-gold" onClick={saveAll} disabled={saving} style={{ minHeight: 40, padding: '8px 20px', fontSize: '0.9rem' }}>
            {saving ? 'Saving...' : 'Save All ✓'}
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <button className="refresh-btn" onClick={() => fetchFixtures(true)}>🔄 Refresh Fixtures</button>
      </div>

      <div className={`toast${toastVisible ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
