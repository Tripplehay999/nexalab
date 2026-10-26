import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminOrError, getActor, googleExchangeCode, listGaProperties, syncConnection, verifyState } from '@/lib/integrations';

// Google redirects here after consent. Stores the refresh token (service-role only
// table), then either syncs the single GA4 property or asks the client to pick one.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code');
  const jar = await cookies();
  const cookieState = jar.get('nx_ga_state')?.value;
  const data = verifyState(state);

  const back = (client: string | undefined, admin: boolean, result: string) =>
    NextResponse.redirect(new URL(admin && client ? `/admin/clients/${client}?tab=insights&ga=${result}` : `/dashboard/analytics?ga=${result}`, url.origin));

  if (!data || state !== cookieState) return back(undefined, false, 'expired');
  const client = String(data.client);
  const admin = Boolean(data.admin);
  if (url.searchParams.get('error') || !code) return back(client, admin, 'cancelled');

  const actor = await getActor(client);
  if ('error' in actor || actor.userId !== data.by) return back(client, admin, 'expired');
  const db = adminOrError();
  if ('error' in db) return back(client, admin, 'not-configured');

  try {
    const tokens = await googleExchangeCode(code, `${url.origin}/api/integrations/google/callback`);
    if (!tokens.refresh_token) throw new Error('Google didn’t return offline access');
    const properties = await listGaProperties(tokens.access_token);
    if (properties.length === 0) return back(client, admin, 'no-properties');

    const only = properties.length === 1 ? properties[0] : null;
    const { data: conn, error } = await db.db.from('analytics_connections').upsert({
      client_id: client, provider: 'google_analytics', account_label: 'Google Analytics',
      property_id: only?.id ?? null, property_label: only?.label ?? null,
      status: only ? 'active' : 'pending', last_error: null,
    }, { onConflict: 'client_id,provider' }).select().single();
    if (error || !conn) throw new Error(error?.message || 'Couldn’t save the connection');

    await db.db.from('analytics_secrets').upsert({ connection_id: conn.id, refresh_token: tokens.refresh_token, updated_at: new Date().toISOString() });
    if (only) await syncConnection(db.db, conn.id);

    const res = back(client, admin, only ? 'connected' : 'choose-property');
    res.cookies.delete('nx_ga_state');
    return res;
  } catch {
    return back(client, admin, 'failed');
  }
}
