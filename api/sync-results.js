// Serverless function called by the cron job every 5 minutes.
// Fetches fixtures, finds any FINISHED matches with real scores,
// and upserts them to Supabase match_results.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const apiKey = process.env.VITE_FOOTBALL_API_KEY || 'f882d1fa200843c78dc1d9da8e200b34';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase config' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const upstream = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': apiKey } }
    );

    if (upstream.status === 429) {
      return res.status(429).json({ error: 'Rate limited' });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: upstream.statusText });
    }

    const data = await upstream.json();
    const matches = data.matches || [];

    const finished = matches.filter(m =>
      m.status === 'FINISHED' &&
      m.score?.fullTime?.home != null &&
      m.score?.fullTime?.away != null
    );

    if (finished.length === 0) {
      return res.json({ synced: 0, message: 'No finished matches with scores yet' });
    }

    const rows = finished.map(m => ({
      match_id: m.id,
      home_score: m.score.fullTime.home,
      away_score: m.score.fullTime.away,
    }));

    const { error } = await supabase.from('match_results').upsert(rows);
    if (error) throw error;

    return res.json({ synced: finished.length, match_ids: rows.map(r => r.match_id) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
