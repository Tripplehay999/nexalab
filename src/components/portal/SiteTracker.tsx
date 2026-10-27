'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMetric } from '@/lib/portal';
import { timeAgo } from '@/lib/utils';
import { LineChart } from '@/components/portal/Charts';

type Tracker = { id: string; site_key: string; allowed_domains: string[]; last_event_at: string | null };
type Day = { day: string; pageviews: number; visitors: number; orders: number; revenue: number };
type Stats = { days: Day[]; pages: [string, number][]; sources: [string, number][] };

const since = () => new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);

function top(rows: { key: string; n: number }[], limit = 6): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.key, (m.get(r.key) ?? 0) + r.n);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function loadAll(clientId: string): Promise<{ tracker: Tracker | null; stats: Stats | null }> {
  const sb = createClient();
  const { data: tracker } = await sb.from('site_trackers').select('*').eq('client_id', clientId).maybeSingle();
  if (!tracker) return { tracker: null, stats: null };
  const from = since();
  const [d, p, r] = await Promise.all([
    sb.from('tracker_daily').select('day, pageviews, visitors, orders, revenue').eq('client_id', clientId).gte('day', from).order('day'),
    sb.from('tracker_pages').select('path, views').eq('client_id', clientId).gte('day', from).limit(2000),
    sb.from('tracker_referrers').select('source, visits').eq('client_id', clientId).gte('day', from).limit(2000),
  ]);
  return {
    tracker: tracker as Tracker,
    stats: {
      days: (d.data ?? []) as Day[],
      pages: top((p.data ?? []).map((x) => ({ key: x.path as string, n: x.views as number }))),
      sources: top((r.data ?? []).map((x) => ({ key: x.source as string, n: x.visits as number }))),
    },
  };
}

async function post(body: unknown) {
  const res = await fetch('/api/integrations/tracker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

// Embeddable tracking code for custom-built sites: one script tag reports page views,
// visitors, referrers and orders straight into the portal — no third-party analytics needed.
export default function SiteTracker({ clientId, asAdmin = false, siteUrl }: { clientId: string; asAdmin?: boolean; siteUrl?: string | null }) {
  const [tracker, setTracker] = useState<Tracker | null | undefined>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [domains, setDomains] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [now] = useState(() => Date.now());
  const [origin] = useState(() => (typeof window === 'undefined' ? 'https://nexalab.studio' : window.location.origin));

  useEffect(() => {
    let cancelled = false;
    loadAll(clientId).then((r) => {
      if (cancelled) return;
      setTracker(r.tracker); setStats(r.stats);
      setDomains((r.tracker?.allowed_domains ?? []).join(', '));
    });
    return () => { cancelled = true; };
  }, [clientId]);

  async function act(body: Record<string, unknown>, okText: string) {
    setBusy(true); setMsg(null);
    try {
      await post({ ...body, client: asAdmin ? clientId : undefined });
      const r = await loadAll(clientId);
      setTracker(r.tracker); setStats(r.stats);
      setMsg({ ok: true, text: okText });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }); }
    setBusy(false);
  }

  const domainList = () => domains.split(/[\s,]+/).filter(Boolean);
  const copy = (key: string, text: string) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); };

  if (tracker === undefined) return null;

  if (!tracker) {
    const suggested = siteUrl ? siteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : '';
    return (
      <section className="pt-card" id="tracker">
        <h2 className="pt-card-title">Tracking code for your website</h2>
        <p className="pt-card-sub" style={{ marginBottom: '0.9rem' }}>
          Custom-built site? Paste one line of code and we’ll show visitors, top pages, where traffic comes from and sales — right here, live. No cookies, no banner needed.
        </p>
        {msg && <p className={msg.ok ? 'pt-success' : 'pt-error'} style={{ marginBottom: '0.8rem' }}>{msg.text}</p>}
        <button className="pt-btn pt-btn-primary pt-btn-sm" disabled={busy} onClick={() => act({ action: 'create', domains: suggested ? [suggested] : [] }, 'Tracking code created — add it to your site.')}>
          {busy ? 'Creating…' : 'Get tracking code'}
        </button>
      </section>
    );
  }

  const snippet = `<script defer src="${origin}/t.js" data-site="${tracker.site_key}"></script>`;
  const orderSnippet = `<script>
  // On your order confirmation page, after the snippet above:
  window.nexalab = window.nexalab || function () { (window.nexalab.q = window.nexalab.q || []).push(arguments); };
  nexalab('order', { id: 'ORDER_ID', value: 129.50, currency: 'USD' });
</script>`;
  const totals = (stats?.days ?? []).reduce((t, d) => ({
    pageviews: t.pageviews + d.pageviews, visitors: t.visitors + d.visitors, orders: t.orders + d.orders, revenue: t.revenue + Number(d.revenue),
  }), { pageviews: 0, visitors: 0, orders: 0, revenue: 0 });
  const live = !!tracker.last_event_at;
  const recent = live && now - new Date(tracker.last_event_at!).getTime() < 48 * 3_600_000;

  return (
    <section className="pt-card" id="tracker">
      <div className="pt-card-head">
        <h2 className="pt-card-title">Live from your website</h2>
        <span className={`pt-pill ${recent ? 'tone-lime' : live ? 'tone-sun' : ''}`}>
          {recent ? 'Receiving data' : live ? `Last seen ${timeAgo(tracker.last_event_at!)}` : 'Waiting for first visit'}
        </span>
      </div>
      {msg && <p className={msg.ok ? 'pt-success' : 'pt-error'} style={{ margin: '0.6rem 0' }}>{msg.text}</p>}

      {live && stats && (
        <>
          <div className="pt-grid pt-grid-3" style={{ margin: '0.9rem 0 1rem' }}>
            <div className="pt-metric"><span className="pt-metric-label">Visitors</span><span className="pt-metric-value">{formatMetric('visitors', totals.visitors, { compact: true })}</span><span className="pt-small pt-muted">{formatMetric('visitors', totals.pageviews, { compact: true })} page views · 30 days</span></div>
            <div className="pt-metric"><span className="pt-metric-label">Orders</span><span className="pt-metric-value">{formatMetric('orders', totals.orders, { compact: true })}</span><span className="pt-small pt-muted">{totals.visitors ? `${((totals.orders / totals.visitors) * 100).toFixed(1)}% conversion` : '30 days'}</span></div>
            <div className="pt-metric"><span className="pt-metric-label">Revenue</span><span className="pt-metric-value">{formatMetric('revenue', totals.revenue, { compact: true })}</span><span className="pt-small pt-muted">tracked on your site</span></div>
          </div>
          {stats.days.length > 1 && (
            <LineChart
              points={stats.days.map((d) => ({ label: new Date(`${d.day}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: d.visitors }))}
              color="#5B8DEF" format={(v) => `${Math.round(v)} visitors`}
            />
          )}
          <div className="pt-grid pt-grid-2" style={{ marginTop: '1rem' }}>
            {([['Top pages', stats.pages], ['Where visitors come from', stats.sources]] as const).map(([title, rows]) => (
              <div key={title}>
                <h3 className="pt-small" style={{ margin: '0 0 0.4rem', fontWeight: 700 }}>{title}</h3>
                {rows.length ? (
                  <ul className="pt-list">
                    {rows.map(([k, n]) => (
                      <li key={k} className="pt-small" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.3rem 0' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span><strong>{n.toLocaleString()}</strong>
                      </li>
                    ))}
                  </ul>
                ) : <p className="pt-small pt-muted" style={{ margin: 0 }}>{title === 'Top pages' ? 'No views yet.' : 'Mostly direct visits so far.'}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <details open={!live} style={{ marginTop: '1rem' }}>
        <summary className="pt-small" style={{ cursor: 'pointer', fontWeight: 700 }}>{live ? 'Tracking code & settings' : 'Install in 1 minute'}</summary>
        <p className="pt-small pt-muted" style={{ margin: '0.6rem 0 0.4rem' }}>
          1. Paste this just before <code>&lt;/head&gt;</code> on every page (in Next.js, add it to your root layout; on WordPress, use a header-scripts plugin).
        </p>
        <pre className="pt-code">{snippet}</pre>
        <button className="pt-btn pt-btn-ghost pt-btn-sm" style={{ marginTop: '0.4rem' }} onClick={() => copy('snip', snippet)}>{copied === 'snip' ? 'Copied' : 'Copy code'}</button>

        <p className="pt-small pt-muted" style={{ margin: '0.9rem 0 0.4rem' }}>2. Selling online? Report each completed order from your thank-you page:</p>
        <pre className="pt-code">{orderSnippet}</pre>
        <button className="pt-btn pt-btn-ghost pt-btn-sm" style={{ marginTop: '0.4rem' }} onClick={() => copy('order', orderSnippet)}>{copied === 'order' ? 'Copied' : 'Copy code'}</button>

        <form className="pt-form" style={{ marginTop: '0.9rem' }} onSubmit={(e) => { e.preventDefault(); act({ action: 'domains', domains: domainList() }, 'Domains saved.'); }}>
          <label className="pt-field">Your website domains
            <input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="yourbrand.com, shop.yourbrand.com" />
          </label>
          <span className="pt-small pt-muted">Only visits from these domains (and their subdomains) are counted, so nobody can copy your code and pollute your numbers. Leave empty to accept any domain.</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="pt-btn pt-btn-primary pt-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save domains'}</button>
            <button type="button" className="pt-link pt-small" disabled={busy} onClick={() => window.confirm('Remove the tracking code? Stats already collected will stay, but the snippet on your site will stop reporting.') && act({ action: 'remove' }, 'Tracking code removed.')}>Remove tracker</button>
          </div>
        </form>
        <p className="pt-small pt-muted" style={{ margin: '0.7rem 0 0' }}>Privacy-friendly: no cookies and no personal data. Visitors are counted with an anonymous hash that resets every day. Monthly totals also flow into your Insights charts.</p>
      </details>
    </section>
  );
}
