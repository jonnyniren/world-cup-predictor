// One-time script to populate the `matches` reference table from the football-data API.
// Usage: node scripts/populate-matches.mjs
//
// Set these env vars first (or paste values directly below):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_FOOTBALL_API_KEY

const SUPABASE_URL    = process.env.VITE_SUPABASE_URL    || '';
const SUPABASE_KEY    = process.env.VITE_SUPABASE_ANON_KEY || '';
const FOOTBALL_KEY    = process.env.VITE_FOOTBALL_API_KEY || 'f882d1fa200843c78dc1d9da8e200b34';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Fetch all WC 2026 matches from football-data.org
console.log('Fetching fixtures from football-data.org...');
const res = await fetch(
  'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
  { headers: { 'X-Auth-Token': FOOTBALL_KEY } }
);
if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
const { matches } = await res.json();
console.log(`Got ${matches.length} matches`);

// Build upsert rows
const rows = matches.map(m => ({
  match_id:  m.id,
  home_team: m.homeTeam?.name || null,
  away_team: m.awayTeam?.name || null,
  stage:     m.stage || null,
  utc_date:  m.utcDate || null,
}));

// Upsert into Supabase in batches of 100
const BATCH = 100;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const upRes = await fetch(`${SUPABASE_URL}/rest/v1/matches`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });
  if (!upRes.ok) {
    const err = await upRes.text();
    throw new Error(`Supabase upsert failed: ${err}`);
  }
  inserted += batch.length;
  console.log(`Upserted ${inserted}/${rows.length}`);
}

console.log('Done! matches table populated.');

// Print a quick summary of stages found
const stages = [...new Set(rows.map(r => r.stage))].sort();
console.log('\nStages in data:', stages.join(', '));
