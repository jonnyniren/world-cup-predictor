import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { updateFinishedCache, mergeWithFinishedCache } from '../finishedCache.js';

function Avatar({ value, className }) {
  const v = value || '⚽';
  if (v.startsWith('&') || v.startsWith('&#')) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: v }} />;
  }
  return <span className={className}>{v}</span>;
}

const CACHE_KEY = 'wc2026_fixtures_cache';

const FLAG_CODES = {
  'USA': 'us', 'United States': 'us', 'Canada': 'ca', 'Mexico': 'mx', 'Brazil': 'br',
  'Argentina': 'ar', 'Germany': 'de', 'France': 'fr', 'England': 'gb-eng', 'Spain': 'es',
  'Portugal': 'pt', 'Netherlands': 'nl', 'Belgium': 'be', 'Italy': 'it', 'Croatia': 'hr',
  'Morocco': 'ma', 'Japan': 'jp', 'South Korea': 'kr', 'Korea Republic': 'kr',
  'Australia': 'au', 'Saudi Arabia': 'sa', 'Iran': 'ir', 'Senegal': 'sn', 'Nigeria': 'ng',
  'Cameroon': 'cm', 'Ghana': 'gh', 'Ecuador': 'ec', 'Uruguay': 'uy', 'Colombia': 'co',
  'Chile': 'cl', 'Switzerland': 'ch', 'Poland': 'pl', 'Serbia': 'rs', 'Austria': 'at',
  'Ukraine': 'ua', 'Denmark': 'dk', 'Norway': 'no', 'Sweden': 'se', 'Turkey': 'tr',
  'Turkiye': 'tr', 'Greece': 'gr', 'Czech Republic': 'cz', 'Czechia': 'cz',
  'Romania': 'ro', 'Slovakia': 'sk', 'Hungary': 'hu', 'Scotland': 'gb-sct',
  'Wales': 'gb-wls', 'Northern Ireland': 'gb-nir', 'Qatar': 'qa', 'Egypt': 'eg',
  'Ivory Coast': 'ci', "Cote d'Ivoire": 'ci', 'Cote dIvoire': 'ci',
  'DR Congo': 'cd', 'Congo DR': 'cd', 'Democratic Republic of Congo': 'cd',
  'Algeria': 'dz', 'Tunisia': 'tn', 'Panama': 'pa', 'Costa Rica': 'cr',
  'Honduras': 'hn', 'Jamaica': 'jm', 'New Zealand': 'nz', 'Peru': 'pe',
  'Paraguay': 'py', 'Venezuela': 've', 'Bolivia': 'bo', 'Iraq': 'iq',
  'Uzbekistan': 'uz', 'Indonesia': 'id', 'Thailand': 'th', 'Vietnam': 'vn',
  'South Africa': 'za', 'New Caledonia': 'nc', 'Fiji': 'fj',
};

const TEAM_CODES = {
  'United States': 'USA', 'USA': 'USA', 'Canada': 'CAN', 'Mexico': 'MEX',
  'Brazil': 'BRA', 'Argentina': 'ARG', 'Germany': 'GER', 'France': 'FRA',
  'England': 'ENG', 'Spain': 'ESP', 'Portugal': 'POR', 'Netherlands': 'NED',
  'Belgium': 'BEL', 'Italy': 'ITA', 'Croatia': 'CRO', 'Morocco': 'MAR',
  'Japan': 'JPN', 'South Korea': 'KOR', 'Korea Republic': 'KOR',
  'Australia': 'AUS', 'Saudi Arabia': 'KSA', 'Iran': 'IRN', 'Senegal': 'SEN',
  'Nigeria': 'NGA', 'Cameroon': 'CMR', 'Ghana': 'GHA', 'Ecuador': 'ECU',
  'Uruguay': 'URU', 'Colombia': 'COL', 'Chile': 'CHI', 'Switzerland': 'SUI',
  'Poland': 'POL', 'Serbia': 'SRB', 'Austria': 'AUT', 'Ukraine': 'UKR',
  'Denmark': 'DEN', 'Norway': 'NOR', 'Sweden': 'SWE', 'Turkey': 'TUR',
  'Turkiye': 'TUR', 'Greece': 'GRE', 'Czech Republic': 'CZE', 'Czechia': 'CZE',
  'Romania': 'ROU', 'Slovakia': 'SVK', 'Hungary': 'HUN', 'Scotland': 'SCO',
  'Wales': 'WAL', 'Northern Ireland': 'NIR', 'Qatar': 'QAT', 'Egypt': 'EGY',
  'Ivory Coast': 'CIV', "Cote d'Ivoire": 'CIV', 'Cote dIvoire': 'CIV',
  'DR Congo': 'COD', 'Congo DR': 'COD', 'Algeria': 'ALG', 'Tunisia': 'TUN',
  'Panama': 'PAN', 'Costa Rica': 'CRC', 'Honduras': 'HON', 'Jamaica': 'JAM',
  'New Zealand': 'NZL', 'Peru': 'PER', 'Paraguay': 'PAR', 'Venezuela': 'VEN',
  'Bolivia': 'BOL', 'Iraq': 'IRQ', 'Uzbekistan': 'UZB', 'Indonesia': 'IDN',
  'South Africa': 'RSA', 'Fiji': 'FIJ', 'New Caledonia': 'NCL',
};

function getResult(home, away) {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

function getFixtureMap() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    const data = JSON.parse(cached).data || [];
    const map = {};
    for (const m of data) map[m.id] = m;
    return map;
  } catch { return {}; }
}

function computeLeaderboard(users, predictions, matchResults) {
  const resultsMap = {};
  for (const r of matchResults) {
    resultsMap[r.match_id] = { home: r.home_score, away: r.away_score };
  }
  const predsByUser = {};
  for (const p of predictions) {
    if (!predsByUser[p.user_id]) predsByUser[p.user_id] = [];
    predsByUser[p.user_id].push(p);
  }
  return users.map(u => {
    let pts = 0, correctScores = 0, correctResults = 0;
    for (const pred of (predsByUser[u.id] || [])) {
      const result = resultsMap[pred.match_id];
      if (!result || result.home == null || result.away == null) continue;
      const pH = Number(pred.home_score), pA = Number(pred.away_score);
      const aH = Number(result.home), aA = Number(result.away);
      if (pH === aH && pA === aA) { pts += 3; correctScores++; }
      else if (getResult(pH, pA) === getResult(aH, aA)) { pts += 1; correctResults++; }
    }
    return { ...u, pts, correctScores, correctResults };
  }).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.correctScores !== a.correctScores) return b.correctScores - a.correctScores;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function PredictionSheet({ row, filter, top, onFilterChange, onClose, allPreds, allResults }) {
  const resultsMap = {};
  for (const r of allResults) resultsMap[r.match_id] = r;
  const fixtureMap = getFixtureMap();

  const scored = [];
  for (const pred of allPreds.filter(p => p.user_id === row.id)) {
    const result = resultsMap[pred.match_id];
    if (!result) continue;
    const pH = Number(pred.home_score), pA = Number(pred.away_score);
    const aH = Number(result.home_score), aA = Number(result.away_score);
    let pts = 0;
    if (pH === aH && pA === aA) pts = 3;
    else if (getResult(pH, pA) === getResult(aH, aA)) pts = 1;
    if (!pts) continue;
    if (filter === 'exact' && pts !== 3) continue;
    if (filter === 'result' && pts !== 1) continue;
    scored.push({ pred, result, pts, match: fixtureMap[pred.match_id] });
  }
  scored.sort((a, b) => new Date(b.match?.utcDate || 0) - new Date(a.match?.utcDate || 0));

  const tabs = [
    { key: 'all', label: `All · ${row.correctScores + row.correctResults}` },
    { key: 'exact', label: `⚽ ${row.correctScores}` },
    { key: 'result', label: `✓ ${row.correctResults}` },
  ];

  return (
    <>
      {/* Backdrop — only below the anchor row, tap to dismiss */}
      <div onClick={onClose} style={{
        position: 'fixed', top, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.25)', zIndex: 200,
      }} />
      {/* Inset panel — narrower than viewport so leaderboard peeks around it */}
      <div style={{
        position: 'fixed', top, left: 20, right: 20, zIndex: 201,
        maxWidth: 560, margin: '0 auto',
        background: '#fff',
        borderRadius: '0 0 14px 14px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
        maxHeight: `calc(100vh - ${top}px - 20px)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar value={row.avatar} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{row.name || 'Unknown'}</span>
          </div>
          <button onClick={onClose} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>×</button>
        </div>

        {/* Pill tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => onFilterChange(tab.key)} style={{
              border: 'none', borderRadius: 20, padding: '5px 12px',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
              background: filter === tab.key ? '#FFD700' : '#efefef',
              color: filter === tab.key ? '#333' : '#777',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', padding: '0 12px 24px', flex: 1 }}>
          {scored.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#bbb', fontSize: '0.82rem' }}>None yet</div>
          ) : scored.map(({ result, pts, match }, i) => {
            const home = match?.homeTeam?.name || '?';
            const away = match?.awayTeam?.name || '?';
            const homeCode = TEAM_CODES[home] || home.slice(0, 3).toUpperCase();
            const awayCode = TEAM_CODES[away] || away.slice(0, 3).toUpperCase();
            const homeFlag = FLAG_CODES[home];
            const awayFlag = FLAG_CODES[away];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', marginBottom: 6, borderRadius: 10,
                background: pts === 3 ? '#fffbea' : '#f8f8f8',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600 }}>
                  {homeFlag && <img src={`https://flagcdn.com/w20/${homeFlag}.png`} alt={home} style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }} />}
                  <span style={{ color: '#444' }}>{homeCode}</span>
                  <span style={{ color: '#777', fontWeight: 500, margin: '0 3px' }}>{result.home_score}–{result.away_score}</span>
                  <span style={{ color: '#444' }}>{awayCode}</span>
                  {awayFlag && <img src={`https://flagcdn.com/w20/${awayFlag}.png`} alt={away} style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }} />}
                </div>
                <span style={{
                  flexShrink: 0, marginLeft: 8,
                  background: pts === 3 ? '#FFD700' : '#e8f5e9',
                  color: pts === 3 ? '#333' : '#2e7d32',
                  borderRadius: 10, padding: '3px 9px',
                  fontSize: '0.72rem', fontWeight: 800,
                }}>
                  {pts === 3 ? '🎉 3pts' : '✓ 1pt'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function Leaderboard({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [allPreds, setAllPreds] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const [expanded, setExpanded] = useState(null); // { id, filter }

  useEffect(() => {
    const navbarEl = document.querySelector('.navbar');
    if (navbarEl) setNavbarHeight(navbarEl.getBoundingClientRect().height);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let allPredictions = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.from('predictions').select('*').range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allPredictions = allPredictions.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      const [{ data: users, error: uErr }, { data: matchResults, error: mErr }] = await Promise.all([
        supabase.from('users').select('*').limit(10000),
        supabase.from('match_results').select('*'),
      ]);
      if (uErr) throw uErr;
      if (mErr) throw mErr;
      setAllPreds(allPredictions);
      setAllResults(matchResults || []);
      setRows(computeLeaderboard(users || [], allPredictions, matchResults || []));
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (currentUser) load(); }, [currentUser?.name, currentUser?.avatar]);

  function handleTap(id, filter, e) {
    // Collapse if same cell tapped again
    if (expanded?.id === id && expanded?.filter === filter) {
      setExpanded(null);
      return;
    }
    const rowEl = e.currentTarget.closest('tr');
    if (!rowEl) return;
    const rowRect = rowEl.getBoundingClientRect();
    const navbarEl = document.querySelector('.navbar');
    const bannerEl = document.querySelector('.lb-sticky-banner');
    const navH = navbarEl ? navbarEl.getBoundingClientRect().height : 0;
    const bannerH = bannerEl ? bannerEl.getBoundingClientRect().height : 0;
    const headerH = navH + bannerH;
    // Scroll so the tapped row sits just below the sticky headers
    const rowAbsoluteTop = window.scrollY + rowRect.top;
    window.scrollTo({ top: rowAbsoluteTop - headerH - 4, behavior: 'smooth' });
    // Panel opens below the row — after scroll the row will be at headerH
    const panelTop = headerH + rowRect.height;
    setExpanded({ id, filter, top: panelTop });
  }

  const rankIcon = rank => {
    if (rank === 1) return <span className="rank-gold">🥇</span>;
    if (rank === 2) return <span className="rank-silver">🥈</span>;
    if (rank === 3) return <span className="rank-bronze">🥉</span>;
    return <span style={{ fontWeight: 700, color: '#555' }}>{rank}</span>;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span className="loading-text">Computing the leaderboard... 🏆</span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="error-card" style={{ margin: 12 }}>
          <div className="error-icon">😬</div>
          <div className="error-title">Couldn't load leaderboard</div>
          <div className="error-msg">{error}</div>
          <button className="btn btn-primary" onClick={load}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="lb-sticky-banner" style={{ position: 'sticky', top: navbarHeight, zIndex: 50, background: '#1a3a5c', borderBottom: '2px solid #FFD700', padding: '8px 16px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
        ⏱️ Points are based on the <span style={{ color: '#FFD700' }}>90-minute score only</span> — extra time &amp; penalties don't count
      </div>
      <div className="leaderboard-header">
        <div className="leaderboard-title">🏆 Leaderboard</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: 4 }}>
          3pts = exact score · 1pt = correct result
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="refresh-btn" onClick={load}>🔄 Refresh</button>
        </div>
        {lastUpdated && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', marginTop: 6 }}>
            Updated {lastUpdated.toLocaleTimeString('en-GB')}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌟</div>
          <div className="empty-text">No players yet!<br />Be the first to make predictions.</div>
        </div>
      ) : (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="center">#</th>
                <th className="center">🎭</th>
                <th>Player</th>
                <th className="center">Pts</th>
                <th className="center">⚽ Exact</th>
                <th className="center">✓ Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rank = idx + 1;
                const isMe = currentUser && row.id === currentUser.id;
                const hasCelebrate = row.correctScores > 0;
                const isExpanded = expanded?.id === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr className={[isMe ? 'current-user' : '', hasCelebrate ? 'has-score' : ''].filter(Boolean).join(' ')}>
                      <td className="rank-cell center">{rankIcon(rank)}</td>
                      <td className="avatar-cell center">
                        <Avatar value={row.avatar} className={hasCelebrate ? 'celebrate-emoji' : ''} />
                      </td>
                      <td onClick={e => handleTap(row.id, 'all', e)} style={{ cursor: 'pointer' }}>
                        <span style={{ fontWeight: isMe ? 800 : 600 }}>{row.name || 'Unknown'}</span>
                        {isMe && (
                          <span style={{ fontSize: '0.7rem', background: '#FFD700', color: '#333', borderRadius: 8, padding: '1px 6px', marginLeft: 6, fontWeight: 700 }}>YOU</span>
                        )}
                      </td>
                      <td className="pts-cell center" onClick={e => handleTap(row.id, 'all', e)} style={{ cursor: 'pointer' }}>
                        {hasCelebrate
                          ? <span className={`pts-badge${row.pts >= 3 ? ' pts-3' : ''}`}>{row.pts}</span>
                          : <span style={{ color: '#999' }}>{row.pts}</span>
                        }
                      </td>
                      <td className="center" style={{ color: row.correctScores > 0 ? '#d4a000' : '#999', cursor: 'pointer' }} onClick={e => handleTap(row.id, 'exact', e)}>
                        {row.correctScores > 0 ? `🎉 ${row.correctScores}` : row.correctScores}
                      </td>
                      <td className="center" style={{ color: row.correctResults > 0 ? '#00a651' : '#999', cursor: 'pointer' }} onClick={e => handleTap(row.id, 'result', e)}>
                        {row.correctResults > 0 ? `✓ ${row.correctResults}` : row.correctResults}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
        Tap any score or name to see predictions · Only finished matches count
      </div>

      {expanded && (() => {
        const row = rows.find(r => r.id === expanded.id);
        return row ? (
          <PredictionSheet
            row={row}
            filter={expanded.filter}
            top={expanded.top}
            onFilterChange={f => setExpanded({ id: expanded.id, filter: f, top: expanded.top })}
            onClose={() => setExpanded(null)}
            allPreds={allPreds}
            allResults={allResults}
          />
        ) : null;
      })()}
    </div>
  );
}
