// Server-side analytics integrations (Google Analytics 4, Plausible).
// Synced figures are written to client_metrics as monthly rows, tagged with the
// provider as `source`, so they chart alongside manual entries in Insights.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const PROVIDERS = {
  google_analytics: 'Google Analytics',
  plausible: 'Plausible',
} as const;
export type Provider = keyof typeof PROVIDERS;

type Row = { metric: string; period: string; value: number };

// ── Auth helpers ────────────────────────────────────────────────────────────

/** The signed-in user, whether they're an admin, and which client they're acting for. */
export async function getActor(clientParam?: string | null) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) } as const;
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = me?.role === 'admin';
  if (clientParam && clientParam !== user.id && !isAdmin) {
    return { error: NextResponse.json({ error: 'Not allowed.' }, { status: 403 }) } as const;
  }
  return { userId: user.id, isAdmin, clientId: clientParam || user.id } as const;
}

export function adminOrError() {
  try {
    return { db: createAdminClient() } as const;
  } catch {
    return { error: NextResponse.json({ error: 'Analytics connections aren’t configured on the server yet (missing SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 }) } as const;
  }
}

// Signed OAuth state so the callback can trust who started the flow.
const stateSecret = () => process.env.GOOGLE_CLIENT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function signState(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify({ ...payload, n: randomBytes(8).toString('hex'), t: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', stateSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state: string): Record<string, unknown> | null {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', stateSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as Record<string, unknown>;
  if (typeof data.t !== 'number' || Date.now() - data.t > 15 * 60_000) return null;
  return data;
}

// ── Google Analytics 4 ──────────────────────────────────────────────────────

export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function googleExchangeCode(code: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'Google sign-in failed');
  return json as { access_token: string; refresh_token?: string };
}

export async function googleAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error === 'invalid_grant' ? 'Google access was revoked or expired — please reconnect.' : json.error_description || 'Couldn’t refresh Google access');
  return json.access_token as string;
}

export async function listGaProperties(accessToken: string) {
  const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Couldn’t list Google Analytics properties');
  type Summary = { displayName: string; propertySummaries?: { property: string; displayName: string }[] };
  return ((json.accountSummaries ?? []) as Summary[]).flatMap((acc) =>
    (acc.propertySummaries ?? []).map((p) => ({ id: p.property, label: `${p.displayName} · ${acc.displayName}` })),
  );
}

async function fetchGaMonthly(accessToken: string, property: string): Promise<Row[]> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: '365daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'yearMonth' }],
      metrics: [{ name: 'sessions' }, { name: 'ecommercePurchases' }, { name: 'purchaseRevenue' }],
      orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Google Analytics report failed');
  const rows: Row[] = [];
  for (const r of (json.rows ?? []) as { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]) {
    const ym = r.dimensionValues[0].value; // "202610"
    const period = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
    const [sessions, orders, revenue] = r.metricValues.map((m) => Number(m.value) || 0);
    rows.push({ metric: 'visitors', period, value: sessions });
    if (orders || revenue) {
      rows.push({ metric: 'orders', period, value: orders }, { metric: 'revenue', period, value: Math.round(revenue * 100) / 100 });
      if (sessions) rows.push({ metric: 'conversion', period, value: Math.round((orders / sessions) * 10000) / 100 });
      if (orders) rows.push({ metric: 'aov', period, value: Math.round((revenue / orders) * 100) / 100 });
    }
  }
  return rows;
}

// ── Plausible ───────────────────────────────────────────────────────────────

export async function fetchPlausibleMonthly(siteId: string, apiKey: string): Promise<Row[]> {
  const url = `https://plausible.io/api/v1/stats/timeseries?site_id=${encodeURIComponent(siteId)}&period=12mo&interval=month&metrics=visitors`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Plausible rejected the site ID or API key');
  return ((json.results ?? []) as { date: string; visitors: number }[]).map((r) => ({ metric: 'visitors', period: r.date.slice(0, 10), value: r.visitors ?? 0 }));
}

// ── Sync ────────────────────────────────────────────────────────────────────

export async function syncConnection(db: ReturnType<typeof createAdminClient>, connectionId: string) {
  const { data: conn } = await db.from('analytics_connections').select('*').eq('id', connectionId).single();
  if (!conn) throw new Error('Connection not found');
  const { data: secret } = await db.from('analytics_secrets').select('*').eq('connection_id', connectionId).single();

  try {
    if (!conn.property_id) throw new Error('Choose which property to sync first.');
    let rows: Row[] = [];
    if (conn.provider === 'google_analytics') {
      if (!secret?.refresh_token) throw new Error('Missing Google access — please reconnect.');
      rows = await fetchGaMonthly(await googleAccessToken(secret.refresh_token), conn.property_id);
    } else if (conn.provider === 'plausible') {
      if (!secret?.api_key) throw new Error('Missing Plausible API key — please reconnect.');
      rows = await fetchPlausibleMonthly(conn.property_id, secret.api_key);
    }

    if (rows.length) {
      const first = rows.reduce((min, r) => (r.period < min ? r.period : min), rows[0].period);
      await db.from('client_metrics').delete().eq('client_id', conn.client_id).eq('source', conn.provider).gte('period', first);
      await db.from('client_metrics').insert(rows.map((r) => ({ ...r, client_id: conn.client_id, source: conn.provider, created_by: null, note: `Synced from ${PROVIDERS[conn.provider as Provider] ?? conn.provider}` })));
    }
    await db.from('analytics_connections').update({ status: 'active', last_synced_at: new Date().toISOString(), last_error: null }).eq('id', connectionId);
    return { ok: true, rows: rows.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    await db.from('analytics_connections').update({ status: 'error', last_error: message }).eq('id', connectionId);
    return { ok: false, error: message };
  }
}
