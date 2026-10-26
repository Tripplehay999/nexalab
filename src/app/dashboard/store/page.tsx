'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import { createClient } from '@/lib/supabase/client';
import { formatMetric, hostOf } from '@/lib/portal';
import { timeAgo } from '@/lib/utils';
import type { StoreIntegration, StoreOrder } from '@/lib/types';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';

type Data = { integration: StoreIntegration | null; orders: StoreOrder[] };

async function loadStore(clientId: string): Promise<Data> {
  const supabase = createClient();
  const [storeRes, ordersRes] = await Promise.all([
    supabase.from('store_integrations').select('id, client_id, platform, store_url, is_active, last_synced_at, created_at').eq('client_id', clientId).eq('is_active', true).limit(1).maybeSingle(),
    supabase.from('store_orders').select('*').eq('client_id', clientId).order('ordered_at', { ascending: false }).limit(25),
  ]);
  return { integration: storeRes.data as StoreIntegration | null, orders: (ordersRes.data ?? []) as StoreOrder[] };
}

const STATUS_TONE: Record<string, string> = { shipped: 'lime', fulfilled: 'lime', paid: 'sky', processing: 'sun', pending: '', refunded: 'rose', cancelled: 'rose' };

export default function StorePage() {
  const { boot, loading } = useDashboard();
  const [data, setData] = useState<Data | null>(null);
  const userId = boot?.userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadStore(userId).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || !boot) return <PortalLoading />;
  const orders = data?.orders ?? [];
  const revenue = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const counts = orders.reduce<Record<string, number>>((acc, o) => { const k = o.status || 'unknown'; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});

  return (
    <ClientShell
      boot={boot}
      kicker="Store"
      title={<>Live from <em>your store.</em></>}
      subtitle="Recent orders synced from your store every 15 minutes."
    >
      {data === null ? (
        <p className="pt-muted">Loading…</p>
      ) : !data.integration ? (
        <div className="pt-card pt-empty">
          <span className="pt-empty-icon">🛍️</span>
          <h3>Your store isn’t connected yet</h3>
          <p>Once your team connects your store, recent orders and revenue appear here automatically. In the meantime, you can add numbers yourself in Insights.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/dashboard/analytics" className="pt-btn pt-btn-primary pt-btn-sm">Add numbers</Link>
            <Link href="/dashboard/support" className="pt-btn pt-btn-ghost pt-btn-sm">Ask us to connect it</Link>
          </div>
        </div>
      ) : (
        <div className="pt-stack">
          <div className="pt-grid pt-grid-4">
            <div className="pt-metric"><span className="pt-metric-label">Connected</span><span className="pt-metric-value" style={{ fontSize: '1.2rem', textTransform: 'capitalize' }}>{data.integration.platform}</span><span className="pt-small pt-muted">{hostOf(data.integration.store_url)}</span></div>
            <div className="pt-metric"><span className="pt-metric-label">Last sync</span><span className="pt-metric-value" style={{ fontSize: '1.2rem' }}>{data.integration.last_synced_at ? timeAgo(data.integration.last_synced_at) : 'Pending'}</span><span className="pt-small pt-muted">every 15 minutes</span></div>
            <div className="pt-metric"><span className="pt-metric-label">Recent orders</span><span className="pt-metric-value">{orders.length}</span><span className="pt-small pt-muted">latest {orders.length}</span></div>
            <div className="pt-metric"><span className="pt-metric-label">Their value</span><span className="pt-metric-value">{formatMetric('revenue', revenue, { compact: true })}</span><span className="pt-small pt-muted">combined</span></div>
          </div>

          <div className="pt-grid pt-grid-main">
            <section className="pt-card pt-card-flush">
              <div className="pt-card-head" style={{ padding: '1.1rem 1.2rem 0' }}><h2 className="pt-card-title">Recent orders</h2></div>
              {orders.length === 0 ? (
                <p className="pt-muted" style={{ padding: '0 1.2rem 1.2rem' }}>No orders synced yet.</p>
              ) : (
                <div className="pt-table-wrap">
                  <table className="pt-table">
                    <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>When</th></tr></thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td className="pt-muted">#{o.external_id}</td>
                          <td>{o.customer_name || '—'}</td>
                          <td className="pt-strong">{formatMetric('revenue', Number(o.amount))}</td>
                          <td><span className={`pt-pill tone-${STATUS_TONE[o.status ?? ''] ?? ''}`} style={{ textTransform: 'capitalize' }}>{o.status || 'unknown'}</span></td>
                          <td className="pt-muted">{o.ordered_at ? timeAgo(o.ordered_at) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="pt-card">
              <h2 className="pt-card-title">Orders by status</h2>
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                {Object.entries(counts).map(([s, n]) => (
                  <li key={s} className="pt-row"><span className="pt-row-main" style={{ textTransform: 'capitalize' }}>{s}</span><strong>{n}</strong></li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </ClientShell>
  );
}
