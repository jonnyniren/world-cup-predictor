// Temporary debug endpoint — returns raw score fields for specific match IDs
export default async function handler(req, res) {
  const apiKey = process.env.VITE_FOOTBALL_API_KEY || 'f882d1fa200843c78dc1d9da8e200b34';
  const ids = [537415, 537418]; // Germany v Paraguay, Netherlands v Morocco

  const upstream = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': apiKey } }
  );
  const data = await upstream.json();
  const matches = (data.matches || []).filter(m => ids.includes(m.id));

  const result = matches.map(m => ({
    id: m.id,
    homeTeam: m.homeTeam?.name,
    awayTeam: m.awayTeam?.name,
    status: m.status,
    score: m.score,
  }));

  res.json(result);
}
