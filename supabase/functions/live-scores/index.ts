import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WC_LEAGUE = 1; // FIFA World Cup on API-Football

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const key = Deno.env.get('APIFOOTBALL_KEY') || '';
  const fetchedAt = new Date().toISOString();

  if (!key) {
    return json({
      error: 'APIFOOTBALL_KEY non configurée sur Supabase (Secrets).',
      fixtures: [],
      fetchedAt,
    });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const seasons = ['2026', '2022'];
    let fixtures: unknown[] = [];

    const liveRes = await apiFetch(key, `fixtures?live=all&league=${WC_LEAGUE}`);
    fixtures = filterWc(liveRes?.response || []);

    if (!fixtures.length) {
      for (const season of seasons) {
        const dayRes = await apiFetch(key, `fixtures?date=${today}&league=${WC_LEAGUE}&season=${season}`);
        fixtures = filterWc(dayRes?.response || []);
        if (fixtures.length) break;
      }
    }

    return json({ fixtures, fetchedAt, count: fixtures.length });
  } catch (e) {
    return json({
      error: e instanceof Error ? e.message : 'Erreur API',
      fixtures: [],
      fetchedAt,
    }, 502);
  }
});

function filterWc(list: Array<{ league?: { id?: number } }>) {
  return list.filter((f) => f.league?.id === WC_LEAGUE);
}

async function apiFetch(key: string, path: string) {
  const res = await fetch(`https://v3.football.api-sports.io/${path}`, {
    headers: { 'x-apisports-key': key },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return res.json();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
