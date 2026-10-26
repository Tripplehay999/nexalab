import { NextResponse } from 'next/server';
import { adminOrError, getActor, googleAccessToken, listGaProperties, syncConnection } from '@/lib/integrations';

// Actions on an existing analytics connection:
//   { id, action: 'select-property', propertyId }   — GA4: choose property, then sync
//   { id, action: 'sync' }                          — sync now
//   { id, action: 'disconnect', removeData? }       — remove connection (+ optionally its synced numbers)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const db = adminOrError();
  if ('error' in db) return db.error;
  const { data: conn } = await db.db.from('analytics_connections').select('*').eq('id', body.id ?? '').single();
  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  const actor = await getActor(conn.client_id);
  if ('error' in actor) return actor.error;

  if (body.action === 'select-property') {
    // Only accept a property this Google account can actually see.
    const { data: secret } = await db.db.from('analytics_secrets').select('refresh_token').eq('connection_id', conn.id).single();
    if (!secret?.refresh_token) return NextResponse.json({ error: 'Please reconnect Google Analytics.' }, { status: 400 });
    const props = await listGaProperties(await googleAccessToken(secret.refresh_token)).catch(() => []);
    const chosen = props.find((p) => p.id === body.propertyId);
    if (!chosen) return NextResponse.json({ error: 'That property isn’t available on this Google account.' }, { status: 400 });
    await db.db.from('analytics_connections').update({ property_id: chosen.id, property_label: chosen.label, status: 'active' }).eq('id', conn.id);
    return NextResponse.json(await syncConnection(db.db, conn.id));
  }

  if (body.action === 'sync') {
    return NextResponse.json(await syncConnection(db.db, conn.id));
  }

  if (body.action === 'disconnect') {
    if (body.removeData) await db.db.from('client_metrics').delete().eq('client_id', conn.client_id).eq('source', conn.provider);
    await db.db.from('analytics_connections').delete().eq('id', conn.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
