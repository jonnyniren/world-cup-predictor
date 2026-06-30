import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { getRanking, getRankTier } from '../rankings.js';
import { updateFinishedCache, mergeWithFinishedCache } from '../finishedCache.js';

// ── Flag images via flagcdn.com (works on all platforms including Windows) ────
const FLAG_CODES = {
  'USA': 'us', 'United States': 'us',
  'Canada': 'ca', 'Mexico': 'mx', 'Brazil': 'br', 'Argentina': 'ar',
  'Germany': 'de', 'France': 'fr', 'England': 'gb-eng', 'Spain': 'es',
  'Portugal': 'pt', 'Netherlands': 'nl', 'Belgium': 'be', 'Italy': 'it',
  'Croatia': 'hr', 'Morocco': 'ma', 'Japan': 'jp',
  'South Korea': 'kr', 'Korea Republic': 'kr',
  'Australia': 'au', 'Saudi Arabia': 'sa', 'Iran': 'ir',
  'Senegal': 'sn', 'Nigeria': 'ng', 'Cameroon': 'cm', 'Ghana': 'gh',
  'Ecuador': 'ec', 'Uruguay': 'uy', 'Colombia': 'co', 'Chile': 'cl',
  'Switzerland': 'ch', 'Poland': 'pl', 'Serbia': 'rs', 'Austria': 'at',
  'Ukraine': 'ua', 'Denmark': 'dk', 'Norway': 'no', 'Sweden': 'se',
  'Turkey': 'tr', 'Turkiye': 'tr', 'Greece': 'gr',
  'Czech Republic': 'cz', 'Czechia': 'cz',
  'Romania': 'ro', 'Slovakia': 'sk', 'Hungary': 'hu',
  'Scotland': 'gb-sct', 'Wales': 'gb-wls', 'Northern Ireland': 'gb-nir',
  'Qatar': 'qa', 'Egypt': 'eg',
  'Ivory Coast': 'ci', 'Cote d\'Ivoire': 'ci', 'Cote dIvoire': 'ci',
  'DR Congo': 'cd', 'Congo DR': 'cd', 'Democratic Republic of Congo': 'cd',
  'Algeria': 'dz', 'Tunisia': 'tn', 'Panama': 'pa', 'Costa Rica': 'cr',
  'Honduras': 'hn', 'Jamaica': 'jm', 'New Zealand': 'nz', 'Peru': 'pe',
  'Paraguay': 'py', 'Venezuela': 've', 'Bolivia': 'bo', 'Iraq': 'iq',
  'Uzbekistan': 'uz', 'Indonesia': 'id', 'Thailand': 'th', 'Vietnam': 'vn',
  'South Africa': 'za',
  'Bosnia and Herzegovina': 'ba', 'Bosnia & Herzegovina': 'ba', 'Bosnia-Herzegovina': 'ba', 'Bosnia': 'ba',
  'Haiti': 'ht', 'Albania': 'al', 'Slovenia': 'si', 'Georgia': 'ge',
  'Finland': 'fi', 'Ireland': 'ie', 'Republic of Ireland': 'ie',
  'Israel': 'il', 'Montenegro': 'me', 'North Macedonia': 'mk',
  'Bulgaria': 'bg', 'Kosovo': 'xk', 'Luxembourg': 'lu',
  'Trinidad and Tobago': 'tt', 'Trinidad & Tobago': 'tt',
  'El Salvador': 'sv', 'Cuba': 'cu', 'Guyana': 'gy', 'Suriname': 'sr',
  'China': 'cn', 'China PR': 'cn', 'India': 'in', 'Jordan': 'jo',
  'Oman': 'om', 'UAE': 'ae', 'United Arab Emirates': 'ae',
  'Kyrgyzstan': 'kg', 'Tajikistan': 'tj', 'Philippines': 'ph',
  'Tanzania': 'tz', 'Zimbabwe': 'zw', 'Zambia': 'zm', 'Angola': 'ao',
  'Uganda': 'ug', 'Mali': 'ml', 'Guinea': 'gn', 'Cape Verde': 'cv',
  'Benin': 'bj', 'Ethiopia': 'et', 'Mozambique': 'mz',
  'Burkina Faso': 'bf', 'Libya': 'ly', 'Kenya': 'ke',
  'Fiji': 'fj', 'Papua New Guinea': 'pg', 'Solomon Islands': 'sb',
};

function getFlagCode(name) {
  if (!name) return null;
  if (FLAG_CODES[name]) return FLAG_CODES[name];
  const lower = name.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  for (const [key, code] of Object.entries(FLAG_CODES)) {
    const kl = key.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (lower.includes(kl) || kl.includes(lower)) return code;
  }
  return null;
}

function TeamFlag({ name }) {
  const code = getFlagCode(name);
  if (!code) return <span className="team-flag-fallback">&#9917;</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={name || ''}
      className="team-flag-img"
      loading="lazy"
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CACHE_KEY = 'wc2026_fixtures_cache';
const CACHE_TTL = 2 * 60 * 1000;

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

function getMatchStatus(match, dbResults = {}) {
  if (match.status === 'FINISHED' || dbResults[match.id]) return 'final';
  if (match.status === 'IN_PLAY' || match.status === 'PAUSED') return 'live';
  if (new Date() >= new Date(match.utcDate)) return 'locked';
  return 'upcoming';
}

function getResult(h, a) {
  if (h > a) return 'home'; if (a > h) return 'away'; return 'draw';
}

function getPredictionPoints(pred, match, dbResult) {
  if (!pred || pred.home === '' || pred.away === '') return null;
  const aH = match.score?.fullTime?.home ?? dbResult?.home_score;
  const aA = match.score?.fullTime?.away ?? dbResult?.away_score;
  if (aH == null || aA == null) return null;
  const pH = Number(pred.home), pA = Number(pred.away);
  const actualH = Number(aH), actualA = Number(aA);
  if (pH === actualH && pA === actualA) return { pts: 3, label: '&#127881; Exact score! +3pts' };
  if (getResult(pH, pA) === getResult(actualH, actualA)) return { pts: 1, label: '&#10003; Correct result +1pt' };
  return { pts: 0, label: '&#10007; No points' };
}

function StatusBadge({ status }) {
  const map = {
    upcoming: ['badge-upcoming', 'UPCOMING'],
    locked:   ['badge-locked', 'LOCKED'],
    live:     ['badge-live', 'LIVE'],
    final:    ['badge-final', 'FINAL'],
  };
  const [cls, label] = map[status] || map.upcoming;
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Fixtures({ user }) {
  const [matches, setMatches] = useState([]);
  const [dbResults, setDbResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimitMsg, setRateLimitMsg] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [unsaved, setUnsaved] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [filter, setFilter] = useState('all');
  const [navbarHeight, setNavbarHeight] = useState(0);
  const toastTimer = useRef(null);
  const scrollTargetRef = useRef(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const navbarEl = document.querySelector('.navbar');
    if (navbarEl) setNavbarHeight(navbarEl.getBoundingClientRect().height);
  }, []);

  useEffect(() => { if (user?.id) loadPredictions(); }, [user?.id]);
  useEffect(() => { fetchFixtures(); loadDbResults(); }, []);

  // After fixtures load, scroll to 3rd-from-last finished match once
  useEffect(() => {
    if (loading || hasScrolled.current || !scrollTargetRef.current) return;
    hasScrolled.current = true;
    const stickyBarEl = document.querySelector('.fixtures-sticky-bar');
    const stickyH = stickyBarEl ? stickyBarEl.getBoundingClientRect().height : 0;
    const offset = navbarHeight + stickyH;
    const top = scrollTargetRef.current.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [loading, matches, dbResults, navbarHeight]);

  async function loadDbResults() {
    try {
      const { data } = await supabase.from('match_results').select('*');
      if (data && data.length > 0) {
        const map = {};
        data.forEach(r => { map[r.match_id] = r; });
        setDbResults(map);
      }
    } catch (e) { console.warn('Could not load match results:', e); }
  }

  async function loadPredictions() {
    try {
      const { data, error } = await supabase.from('predictions').select('*').eq('user_id', user.id);
      if (error) throw error;
      if (!data || data.length === 0) return; // don't overwrite existing predictions with empty
      const loaded = {};
      data.forEach(row => {
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
          if (Date.now() - cachedAt < CACHE_TTL) { setMatches(mergeWithFinishedCache(data)); await loadDbResults(); setLoading(false); return; }
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
      const raw = json.matches || [];
      updateFinishedCache(raw);
      const data = mergeWithFinishedCache(raw);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
      setMatches(data);
      // Always reload db results alongside fixtures so scores stay in sync
      await loadDbResults();
      // Persist any newly finished matches to Supabase so all devices benefit
      const finished = raw.filter(m => m.status === 'FINISHED' && m.score?.fullTime?.home != null);
      if (finished.length > 0) {
        // Use regularTime (90-min score) when available — fullTime can include ET/penalty goals
        const rows = finished.map(m => ({
          match_id: m.id,
          home_score: m.score.regularTime?.home ?? m.score.fullTime.home,
          away_score: m.score.regularTime?.away ?? m.score.fullTime.away,
        }));
        supabase.from('match_results').upsert(rows).then(() => loadDbResults());
      }
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
        id: `${user.id}_${matchId}`, user_id: user.id, match_id: Number(matchId),
        home_score: Number(pred.home), away_score: Number(pred.away), updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setUnsaved(prev => { const s = new Set(prev); s.delete(matchId); return s; });
      showToast('Saved');
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
      showToast(`${rows.length} prediction${rows.length !== 1 ? 's' : ''} saved!`);
    } catch (e) { console.error(e); showToast('Save failed — check connection'); }
    finally { setSaving(false); }
  }

  const grouped = React.useMemo(() => {
    const result = {};
    const filtered = matches.filter(m => {
      if (filter === 'group') return m.stage && m.stage.includes('GROUP');
      if (filter === 'knockout') return m.stage && !m.stage.includes('GROUP');
      if (filter === 'upcoming') return getMatchStatus(m) === 'upcoming';
      return true;
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

  // Find the date group to scroll to: yesterday's matches (day before today in local time).
  // Falls back to the earliest date group that has finished matches.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD
  const scrollDateKey = dateKeys.includes(yesterdayKey)
    ? yesterdayKey
    : (() => {
        const withFinished = dateKeys.filter(k => grouped[k].matches.some(m => getMatchStatus(m, dbResults) === 'final'));
        return withFinished.length > 0 ? withFinished[withFinished.length - 1] : null;
      })();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span className="loading-text">Loading World Cup fixtures...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="fixtures-sticky-bar" style={{ position: 'sticky', top: navbarHeight, zIndex: 50, background: '#0a1f3a' }}>
        <div style={{ background: '#1a3a5c', borderBottom: '2px solid #FFD700', padding: '8px 16px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
          ⏱️ Predictions are scored on the <span style={{ color: '#FFD700' }}>90-minute score only</span> — extra time &amp; penalties don't count
        </div>
        <div className="filter-bar" style={{ background: '#0a1f3a', paddingBottom: 10 }}>
          {[['all','All'],['group','Groups'],['knockout','Knockout'],['upcoming','Upcoming']].map(([f, label]) => (
            <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {rateLimitMsg && (
        <div className="card card-sm" style={{ margin: '12px', background: '#fff8e1', borderLeft: '4px solid #FFD700' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>Loading fixtures... rate limit reached. Retrying shortly.</p>
        </div>
      )}
      {error && (
        <div className="card card-sm" style={{ margin: '12px', background: '#fff3f3', borderLeft: '4px solid #ffcdd2' }}>
          <p style={{ fontSize: '0.85rem', color: '#c62828', fontWeight: 600 }}>Warning: {error}</p>
        </div>
      )}
      {matches.length === 0 && !loading && !error && (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <div className="empty-icon">&#128197;</div>
          <div className="empty-text">No fixtures available yet.<br />Check back soon!</div>
          <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={() => fetchFixtures(true)}>Refresh</button>
        </div>
      )}
      {dateKeys.length === 0 && matches.length > 0 && (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <div className="empty-icon">&#10003;</div>
          <div className="empty-text">You're all caught up!<br />No upcoming matches right now.</div>
        </div>
      )}

      {dateKeys.map(key => (
        <div className="date-group" key={key} ref={key === scrollDateKey ? scrollTargetRef : null}>
          <div className="date-header">&#128197; {grouped[key].label}</div>
          <div className="card">
            {grouped[key].matches.map(match => {
              const status = getMatchStatus(match, dbResults);
              const isLocked = status === 'locked' || status === 'live' || status === 'final';
              const homeName = match.homeTeam?.name || 'TBD';
              const awayName = match.awayTeam?.name || 'TBD';
              const homeRank = getRanking(match.homeTeam?.name);
              const awayRank = getRanking(match.awayTeam?.name);
              const pred = predictions[match.id] || { home: '', away: '' };
              const hasPred = pred.home !== '' && pred.away !== '';
              const dbResult = dbResults[match.id];
              const actualHome = status === 'final'
                ? (match.score?.regularTime?.home != null ? String(match.score.regularTime.home) : match.score?.fullTime?.home != null ? String(match.score.fullTime.home) : dbResult ? String(dbResult.home_score) : null)
                : null;
              const actualAway = status === 'final'
                ? (match.score?.regularTime?.away != null ? String(match.score.regularTime.away) : match.score?.fullTime?.away != null ? String(match.score.fullTime.away) : dbResult ? String(dbResult.away_score) : null)
                : null;
              const pointsInfo = status === 'final' ? getPredictionPoints(hasPred ? pred : null, match, dbResult) : null;

              return (
                <div key={match.id} className={`match-row${isLocked ? ' locked' : ''}${hasPred && !isLocked ? ' has-prediction' : ''}`}>
                  {/* Home team */}
                  <div className="team-side home">
                    <div className="team-info home">
                      <span className="team-name">{homeName}</span>
                      {homeRank && <span className={`rank-badge ${getRankTier(homeRank)}`}>#{homeRank}</span>}
                    </div>
                    <TeamFlag name={match.homeTeam?.name} />
                  </div>

                  {/* Centre */}
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
                    {status === 'final' && hasPred && pointsInfo && (
                      <div className={`pred-result pts-${pointsInfo.pts}`}>
                        <span className="pred-your-pick">You: {pred.home}&ndash;{pred.away}</span>
                        <span className="pred-pts-label" dangerouslySetInnerHTML={{ __html: pointsInfo.label }} />
                      </div>
                    )}
                    {status === 'final' && !hasPred && (
                      <div className="pred-result pts-none">
                        <span className="pred-your-pick" style={{ color: '#bbb' }}>No prediction</span>
                      </div>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="team-side away">
                    <TeamFlag name={match.awayTeam?.name} />
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
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <button className="refresh-btn" onClick={() => fetchFixtures(true)}>Refresh Fixtures</button>
      </div>
      <div className={`toast${toastVisible ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
