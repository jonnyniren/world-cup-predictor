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

function getResult(home, away) {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

async function fetchFinishedMatches() {
  try {
    const res = await fetch('/api/fixtures');
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    const raw = json.matches || [];
    updateFinishedCache(raw);
    const data = mergeWithFinishedCache(raw);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
    return data.filter(m => m.status === 'FINISHED');
  } catch {
    // Fall back to local cache if API unavailable
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return (JSON.parse(cached).data || []).filter(m => m.status === 'FINISHED');
    } catch { /* ignore */ }
    return [];
  }
}

function computeLeaderboard(users, predictions, matchResults) {
  // matchResults: array of {match_id, home_score, away_score} from Supabase
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

export default function Leaderboard({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: users, error: uErr }, { data: predictions, error: pErr }, { data: matchResults, error: mErr }] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('predictions').select('*'),
        supabase.from('match_results').select('*'),
      ]);
      if (uErr) throw uErr;
      if (pErr) throw pErr;
      if (mErr) throw mErr;
      setRows(computeLeaderboard(users || [], predictions || [], matchResults || []));
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Reload when current user's profile changes (e.g. after editing name/avatar)
  useEffect(() => { if (currentUser) load(); }, [currentUser?.name, currentUser?.avatar]);

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
                return (
                  <tr key={row.id} className={[isMe ? 'current-user' : '', hasCelebrate ? 'has-score' : ''].filter(Boolean).join(' ')}>
                    <td className="rank-cell center">{rankIcon(rank)}</td>
                    <td className="avatar-cell center">
                      <Avatar value={row.avatar} className={hasCelebrate ? 'celebrate-emoji' : ''} />
                    </td>
                    <td>
                      <span style={{ fontWeight: isMe ? 800 : 600 }}>{row.name || 'Unknown'}</span>
                      {isMe && (
                        <span style={{ fontSize: '0.7rem', background: '#FFD700', color: '#333', borderRadius: 8, padding: '1px 6px', marginLeft: 6, fontWeight: 700 }}>YOU</span>
                      )}
                    </td>
                    <td className="pts-cell center">
                      {hasCelebrate
                        ? <span className={`pts-badge${row.pts >= 3 ? ' pts-3' : ''}`}>{row.pts}</span>
                        : <span style={{ color: '#999' }}>{row.pts}</span>
                      }
                    </td>
                    <td className="center" style={{ color: row.correctScores > 0 ? '#d4a000' : '#999' }}>
                      {row.correctScores > 0 ? `🎉 ${row.correctScores}` : row.correctScores}
                    </td>
                    <td className="center" style={{ color: row.correctResults > 0 ? '#00a651' : '#999' }}>
                      {row.correctResults > 0 ? `✓ ${row.correctResults}` : row.correctResults}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
        Only finished matches count towards points
      </div>
    </div>
  );
}
