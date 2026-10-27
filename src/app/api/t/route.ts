import { createHash } from 'node:crypto';
import { adminOrError } from '@/lib/integrations';
import { clientIp, rateLimit } from '@/lib/security';

// Collector for the embeddable tracker (public/t.js). Receives page views and order
// events from client websites. No cookies; visitors are counted with a hash of
// (daily-rotating salt + IP + user agent) that can't be reversed or linked across days.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const done = () => new Response(null, { status: 204, headers: CORS });
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|preview|facebookexternalhit|curl|wget|python|axios/i;

// Per-instance cache of site key → tracker (saves a lookup on every hit).
const cache = new Map<string, { at: number; tracker: { client_id: string; allowed_domains: string[] } | null }>();

function hostMatches(host: string, allowed: string[]) {
  if (!allowed.length) return true;
  const h = host.replace(/^www\./, '');
  return allowed.some((d) => h === d || h.endsWith(`.${d}`));
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || BOTS.test(ua)) return done();

  let e: { k?: string; t?: string; u?: string; r?: string; v?: number; c?: string; o?: string };
  try { e = JSON.parse(await request.text()); } catch { return done(); }
  if (typeof e.k !== 'string' || !/^nxs_[a-f0-9]{24}$/.test(e.k) || (e.t !== 'pageview' && e.t !== 'order') || typeof e.u !== 'string') return done();

  const db = adminOrError();
  if ('error' in db) return done();

  let entry = cache.get(e.k);
  if (!entry || Date.now() - entry.at > 5 * 60_000) {
    const { data } = await db.db.from('site_trackers').select('client_id, allowed_domains').eq('site_key', e.k).maybeSingle();
    entry = { at: Date.now(), tracker: data };
    cache.set(e.k, entry);
  }
  const tracker = entry.tracker;
  if (!tracker) return done();

  let page: URL;
  try { page = new URL(e.u); } catch { return done(); }
  // Only count events from the client's own site (Origin is set by browsers on cross-site requests).
  const origin = request.headers.get('origin');
  const originHost = origin ? (() => { try { return new URL(origin).hostname; } catch { return ''; } })() : page.hostname;
  if (!hostMatches(originHost, tracker.allowed_domains) || !hostMatches(page.hostname, tracker.allowed_domains)) return done();

  const ip = clientIp(request);
  if (!(await rateLimit(db.db, 'trk', `${ip}:${tracker.client_id}`, 300, 60))) return done();

  const day = new Date().toISOString().slice(0, 10);
  const salt = createHash('sha256').update(`${process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'nx'}:${day}`).digest('hex');
  const visitor = createHash('sha256').update(`${salt}:${ip}:${ua}:${tracker.client_id}`).digest('hex').slice(0, 32);

  let source: string | null = page.searchParams.get('utm_source');
  if (!source && e.r) {
    try {
      const ref = new URL(e.r);
      if (ref.hostname.replace(/^www\./, '') !== page.hostname.replace(/^www\./, '')) source = ref.hostname.replace(/^www\./, '');
    } catch { /* ignore bad referrers */ }
  }

  const value = e.t === 'order' ? Math.min(Math.max(Number(e.v) || 0, 0), 10_000_000) : null;
  await db.db.rpc('tracker_record', {
    p_client: tracker.client_id, p_day: day, p_kind: e.t,
    p_visitor: e.t === 'order' ? (e.o ? `order:${String(e.o).slice(0, 100)}` : null) : visitor,
    p_path: e.t === 'pageview' ? (page.pathname || '/').slice(0, 200) : null,
    p_source: source ? source.slice(0, 120) : null,
    p_value: value,
  });
  return done();
}
