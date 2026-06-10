// Vercel serverless function — proxies football-data.org to avoid CORS
// The API key stays server-side and never reaches the browser.
export default async function handler(req, res) {
  const apiKey = process.env.VITE_FOOTBALL_API_KEY || 'f882d1fa200843c78dc1d9da8e200b34';

  try {
    const upstream = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': apiKey } }
    );

    const remaining = upstream.headers.get('X-Requests-Available-Minute');
    if (remaining) res.setHeader('X-Requests-Available-Minute', remaining);

    if (upstream.status === 429) {
      return res.status(429).json({ error: 'Rate limited — try again in a minute' });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: upstream.statusText });
    }

    const data = await upstream.json();

    // Cache at the CDN edge for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
