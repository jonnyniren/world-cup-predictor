// Once a match is seen as FINISHED with a score, store it permanently.
// This prevents the API from "un-finishing" a match between calls.
const KEY = 'wc2026_finished_matches';

export function getFinishedCache() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

export function updateFinishedCache(matches) {
  const cache = getFinishedCache();
  let changed = false;
  for (const m of matches) {
    if (m.status === 'FINISHED' && m.score?.fullTime?.home != null && cache[m.id] == null) {
      cache[m.id] = {
        id: m.id, status: 'FINISHED',
        score: m.score,
        homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        utcDate: m.utcDate, stage: m.stage,
      };
      changed = true;
    }
  }
  if (changed) localStorage.setItem(KEY, JSON.stringify(cache));
  return cache;
}

// Merge live API matches with the finished cache.
// If we previously saw a match as FINISHED, keep it that way.
export function mergeWithFinishedCache(matches) {
  const cache = getFinishedCache();
  const merged = matches.map(m => {
    if (cache[m.id] && m.status !== 'FINISHED') {
      return { ...m, status: 'FINISHED', score: cache[m.id].score };
    }
    return m;
  });
  // Also add any cached finished matches missing from the current API response
  const ids = new Set(matches.map(m => m.id));
  for (const c of Object.values(cache)) {
    if (!ids.has(c.id)) merged.push(c);
  }
  return merged;
}
