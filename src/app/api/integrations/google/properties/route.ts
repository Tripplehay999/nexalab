import { NextResponse } from 'next/server';
import { adminOrError, getActor, googleAccessToken, listGaProperties } from '@/lib/integrations';

// Lists the GA4 properties the connected Google account can see, so the client
// can choose which one to sync.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('connection');
  const db = adminOrError();
  if ('error' in db) return db.error;
  const { data: conn } = await db.db.from('analytics_connections').select('*').eq('id', id ?? '').single();
  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  const actor = await getActor(conn.client_id);
  if ('error' in actor) return actor.error;

  const { data: secret } = await db.db.from('analytics_secrets').select('refresh_token').eq('connection_id', conn.id).single();
  if (!secret?.refresh_token) return NextResponse.json({ error: 'Please reconnect Google Analytics.' }, { status: 400 });
  try {
    return NextResponse.json({ properties: await listGaProperties(await googleAccessToken(secret.refresh_token)) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Couldn’t load properties' }, { status: 502 });
  }
}
