import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminOrError, getActor } from '@/lib/integrations';

// Create / configure / remove a client's embeddable site tracker (public/t.js).
// Clients manage their own; admins can act for any client with `client`.
function cleanDomains(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const raw of input.slice(0, 10)) {
    if (typeof raw !== 'string') continue;
    let host = raw.trim().toLowerCase();
    try { host = new URL(/^https?:\/\//.test(host) ? host : `https://${host}`).hostname; } catch { continue; }
    host = host.replace(/^www\./, '');
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || host === 'localhost') out.add(host);
  }
  return [...out];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const actor = await getActor(typeof body.client === 'string' ? body.client : null);
  if ('error' in actor) return actor.error;
  const db = adminOrError();
  if ('error' in db) return db.error;

  if (body.action === 'create') {
    const { data: existing } = await db.db.from('site_trackers').select('*').eq('client_id', actor.clientId).maybeSingle();
    if (existing) return NextResponse.json({ ok: true, tracker: existing });
    const { data, error } = await db.db.from('site_trackers').insert({
      client_id: actor.clientId,
      site_key: `nxs_${randomBytes(12).toString('hex')}`,
      allowed_domains: cleanDomains(body.domains),
    }).select('*').single();
    if (error) return NextResponse.json({ error: 'Couldn’t create the tracker.' }, { status: 500 });
    return NextResponse.json({ ok: true, tracker: data });
  }

  if (body.action === 'domains') {
    const { data, error } = await db.db.from('site_trackers').update({ allowed_domains: cleanDomains(body.domains) })
      .eq('client_id', actor.clientId).select('*').single();
    if (error) return NextResponse.json({ error: 'Couldn’t save domains.' }, { status: 500 });
    return NextResponse.json({ ok: true, tracker: data });
  }

  if (body.action === 'remove') {
    await db.db.from('site_trackers').delete().eq('client_id', actor.clientId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
