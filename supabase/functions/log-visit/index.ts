// Supabase Edge Function: capture the real client IP + device_id and insert a page_visit.
// Runs with the service role (env vars are injected by Supabase), so it can write
// page_visits even though the anon role cannot.
// Deploy: supabase functions deploy log-visit --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.8';

const allowedOrigins = new Set([
  'https://manh-an-wedding.github.io',
  'http://localhost:4200',
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin)
      ? origin
      : 'https://manh-an-wedding.github.io',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

async function readBoundedBody(req: Request, maxBytes: number): Promise<string> {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (!Number.isFinite(declaredBytes)
        || declaredBytes < 0
        || declaredBytes > maxBytes) {
      throw new Error('Body too large');
    }
  }

  if (!req.body) return '';

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('Body too large');
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  const origin = req.headers.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const ip = (
    req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')
    ?? req.headers.get('x-real-ip')
    ?? ''
  ).split(',')[0].trim().slice(0, 64) || null;

  let device_id: string | null = null;
  try {
    const body = await readBoundedBody(req, 2048);
    const parsed = body ? JSON.parse(body) : {};
    if (typeof parsed?.device_id === 'string') {
      const value = parsed.device_id.trim();
      if (value.length > 128) throw new Error('Device ID too long');
      device_id = value || null;
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  if (!device_id && !ip) {
    return new Response(JSON.stringify({ error: 'Missing visit identifier' }), {
      status: 400,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  const { data: inserted, error } = await admin.rpc('log_page_visit', {
    p_device_id: device_id,
    p_ip: ip,
  });
  if (error) {
    console.error('log_page_visit failed', error);
    return new Response(JSON.stringify({ error: 'Unable to log visit' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    deduplicated: inserted === false,
  }), {
    headers: { ...cors, 'content-type': 'application/json' },
  });
});
