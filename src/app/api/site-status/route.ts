import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPublicHost } from '@/lib/net';

// Checks whether the signed-in client's website is up, for the dashboard's
// "Your website" card. Only the URL saved on the caller's own profile is checked
// (admins can pass ?client=<id>), and private/internal hosts are refused.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'unknown', reason: 'signed-out' }, { status: 401 });

  const requested = new URL(request.url).searchParams.get('client');
  let targetId = user.id;
  if (requested && requested !== user.id) {
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (me?.role !== 'admin') return NextResponse.json({ status: 'unknown', reason: 'forbidden' }, { status: 403 });
    targetId = requested;
  }

  const { data: profile } = await supabase.from('profiles').select('website').eq('id', targetId).single();
  const raw = profile?.website?.trim();
  if (!raw) return NextResponse.json({ status: 'unknown', reason: 'no-website' });

  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return NextResponse.json({ status: 'unknown', reason: 'invalid-url' }); }
  if (!/^https?:$/.test(url.protocol) || !isPublicHost(url.hostname)) return NextResponse.json({ status: 'unknown', reason: 'blocked-host' });

  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'NexaLab-Status/1.0 (+https://nexalab.studio)' } });
    const ms = Date.now() - started;
    return NextResponse.json({ status: res.status < 500 ? 'up' : 'down', code: res.status, ms, host: url.hostname });
  } catch {
    return NextResponse.json({ status: 'down', ms: Date.now() - started, host: url.hostname });
  }
}
