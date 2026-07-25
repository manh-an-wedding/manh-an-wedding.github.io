// Supabase Edge Function: capture the real client IP + device_id and insert a page_visit.
// Runs with the service role (env vars are injected by Supabase), so it can write
// page_visits even though the anon role cannot.
// Deploy: supabase functions deploy log-visit --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  let device_id: string | null = null;
  try { device_id = (await req.json())?.device_id ?? null; } catch { /* no body */ }
  await admin.from('page_visits').insert({ ip, device_id });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'content-type': 'application/json' },
  });
});
