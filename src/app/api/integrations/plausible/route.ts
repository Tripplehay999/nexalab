import { NextResponse } from 'next/server';
import { adminOrError, fetchPlausibleMonthly, getActor, syncConnection } from '@/lib/integrations';

// Connect Plausible with a site ID + API key (validated before saving).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const actor = await getActor(body.client);
  if ('error' in actor) return actor.error;
  const siteId = String(body.siteId ?? '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const apiKey = String(body.apiKey ?? '').trim();
  if (!siteId || !apiKey) return NextResponse.json({ error: 'Add your site domain and API key.' }, { status: 400 });

  try {
    await fetchPlausibleMonthly(siteId, apiKey);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Plausible rejected those details.' }, { status: 400 });
  }

  const db = adminOrError();
  if ('error' in db) return db.error;
  const { data: conn, error } = await db.db.from('analytics_connections').upsert({
    client_id: actor.clientId, provider: 'plausible', account_label: 'Plausible',
    property_id: siteId, property_label: siteId, status: 'active', last_error: null,
  }, { onConflict: 'client_id,provider' }).select().single();
  if (error || !conn) return NextResponse.json({ error: 'Couldn’t save the connection.' }, { status: 500 });
  await db.db.from('analytics_secrets').upsert({ connection_id: conn.id, api_key: apiKey, updated_at: new Date().toISOString() });
  return NextResponse.json(await syncConnection(db.db, conn.id));
}
