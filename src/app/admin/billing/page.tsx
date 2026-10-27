'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { createClient } from '@/lib/supabase/client';
import { invoiceState, money, shortDate } from '@/lib/billing';
import type { ClientBilling, Invoice, Payment, Profile } from '@/lib/types';
import AdminShell from '@/components/portal/AdminShell';
import { PortalLoading } from '@/components/portal/ClientShell';
import Avatar from '@/components/portal/Avatar';
import Icon from '@/components/portal/Icon';
import { LineChart } from '@/components/portal/Charts';

type Row = Invoice & { profiles: Pick<Profile, 'full_name' | 'company' | 'email'> | null };
type Retainer = ClientBilling & { profiles: Pick<Profile, 'full_name' | 'company'> | null };
type Data = { invoices: Row[]; payments: Payment[]; billing: Retainer[] };
type Filter = 'all' | 'draft' | 'open' | 'overdue' | 'paid' | 'void';

async function loadBilling(): Promise<Data> {
  const supabase = createClient();
  const since = new Date(); since.setMonth(since.getMonth() - 11); since.setDate(1);
  const [i, p, b] = await Promise.all([
    supabase.from('invoices').select('*, profiles!client_id(full_name, company, email)').order('created_at', { ascending: false }),
    supabase.from('payments').select('*').gte('received_at', since.toISOString()).order('received_at'),
    supabase.from('client_billing').select('*, profiles!client_id(full_name, company)').order('monthly_rate', { ascending: false }),
  ]);
  return { invoices: (i.data ?? []) as Row[], payments: (p.data ?? []) as Payment[], billing: (b.data ?? []) as Retainer[] };
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function AdminBillingPage() {
  const { boot, loading } = useAdmin();
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    loadBilling().then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [boot]);

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const thisMonth = monthKey(now);
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const byMonth = new Map<string, number>();
    for (let k = 11; k >= 0; k--) byMonth.set(monthKey(new Date(now.getFullYear(), now.getMonth() - k, 1)), 0);
    data.payments.forEach((p) => { const k = monthKey(new Date(p.received_at)); if (byMonth.has(k)) byMonth.set(k, byMonth.get(k)! + Number(p.amount)); });
    const ytd = data.payments.filter((p) => new Date(p.received_at).getFullYear() === now.getFullYear()).reduce((s, p) => s + Number(p.amount), 0);
    const open = data.invoices.filter((i) => i.status === 'open');
    const overdue = open.filter((i) => invoiceState(i).key === 'overdue');
    const mrr = data.billing.filter((b) => b.status === 'active').reduce((s, b) => s + Number(b.monthly_rate), 0);
    const byClient = new Map<string, { name: string; total: number }>();
    data.invoices.filter((i) => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getFullYear() === now.getFullYear()).forEach((i) => {
      const cur = byClient.get(i.client_id) ?? { name: i.profiles?.company || i.profiles?.full_name || 'Client', total: 0 };
      cur.total += Number(i.total); byClient.set(i.client_id, cur);
    });
    return {
      mrr, ytd,
      thisMonth: byMonth.get(thisMonth) ?? 0, lastMonth: byMonth.get(monthKey(last)) ?? 0,
      outstanding: open.reduce((s, i) => s + Number(i.total), 0),
      overdue: overdue.reduce((s, i) => s + Number(i.total), 0), overdueCount: overdue.length,
      chart: [...byMonth.entries()].map(([k, v]) => ({ label: new Date(`${k}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' }), value: Math.round(v) })),
      top: [...byClient.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5),
    };
  }, [data]);

  if (loading || !boot) return <PortalLoading />;

  const q = search.toLowerCase();
  const rows = (data?.invoices ?? []).filter((i) => {
    const st = invoiceState(i).key;
    if (filter !== 'all' && st !== filter && !(filter === 'open' && st === 'overdue')) return false;
    return !q || [i.number, i.title, i.profiles?.full_name, i.profiles?.company].some((v) => (v ?? '').toLowerCase().includes(q));
  });
  const count = (f: Filter) => (data?.invoices ?? []).filter((i) => f === 'all' || invoiceState(i).key === f || (f === 'open' && invoiceState(i).key === 'overdue')).length;
  const change = stats && stats.lastMonth > 0 ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100 : null;

  return (
    <AdminShell
      boot={boot}
      kicker="Billing"
      title={<>Revenue &amp; <em>invoices.</em></>}
      subtitle="What’s coming in, what’s owed, and every invoice — with card payments through Stripe."
      actions={<Link href="/admin/billing/new" className="pt-btn pt-btn-primary"><Icon name="plus" size={16} /> New invoice</Link>}
    >
      <div className="pt-grid pt-grid-4" style={{ marginBottom: '1rem' }}>
        <div className="pt-metric pt-card"><span className="pt-metric-label">Monthly recurring</span><span className="pt-metric-value">{money(stats?.mrr ?? 0)}</span><span className="pt-small pt-muted">from active retainers</span></div>
        <div className="pt-metric pt-card"><span className="pt-metric-label">Collected this month</span><span className="pt-metric-value">{money(stats?.thisMonth ?? 0)}</span>
          <span className="pt-small">{change === null ? <span className="pt-muted">vs {money(stats?.lastMonth ?? 0)} last month</span> : <span className={change >= 0 ? 'pt-up' : 'pt-down'}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}% vs last month</span>}</span></div>
        <div className="pt-metric pt-card"><span className="pt-metric-label">Outstanding</span><span className="pt-metric-value">{money(stats?.outstanding ?? 0)}</span>
          <span className={`pt-small ${stats?.overdueCount ? 'pt-down' : 'pt-muted'}`}>{stats?.overdueCount ? `${money(stats.overdue)} overdue (${stats.overdueCount})` : 'Nothing overdue'}</span></div>
        <div className="pt-metric pt-card"><span className="pt-metric-label">Collected this year</span><span className="pt-metric-value">{money(stats?.ytd ?? 0)}</span><span className="pt-small pt-muted">{new Date().getFullYear()} to date</span></div>
      </div>

      <div className="pt-grid pt-grid-main">
        <div className="pt-stack">
          <section className="pt-card">
            <div className="pt-card-head"><div><h2 className="pt-card-title">Revenue collected</h2><p className="pt-card-sub">Last 12 months</p></div></div>
            {stats && <LineChart points={stats.chart} color="#2F9E6E" format={(v) => money(v)} />}
          </section>

          <section className="pt-card pt-card-flush">
            <div style={{ padding: '1.1rem 1.2rem 0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="pt-card-title">Invoices</h2>
              <input className="pt-input" type="search" placeholder="Search number, client, title…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
            </div>
            <div className="pt-tabbar" style={{ margin: '0.9rem 1.2rem' }} role="tablist" aria-label="Filter invoices">
              {(['all', 'draft', 'open', 'overdue', 'paid', 'void'] as Filter[]).map((f) => (
                <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f} ({count(f)})</button>
              ))}
            </div>
            {data === null ? <p className="pt-muted" style={{ padding: '0 1.2rem 1.2rem' }}>Loading…</p> : rows.length === 0 ? (
              <div className="pt-empty"><span className="pt-empty-icon">🧾</span><h3>No invoices here</h3><p>Create one with “New invoice”, or turn on monthly auto-invoicing from a client’s Billing tab.</p></div>
            ) : (
              <div className="pt-table-wrap">
                <table className="pt-table">
                  <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {rows.map((i) => {
                      const st = invoiceState(i);
                      return (
                        <tr key={i.id}>
                          <td><Link href={`/admin/billing/${i.id}`} className="pt-strong">{i.number}</Link><div className="pt-small pt-muted">{i.title}</div></td>
                          <td><Link href={`/admin/clients/${i.client_id}?tab=billing`}>{i.profiles?.company || i.profiles?.full_name || '—'}</Link></td>
                          <td className="pt-strong">{money(i.total, i.currency)}</td>
                          <td><span className={`pt-pill tone-${st.tone}`}>{st.label}</span></td>
                          <td className="pt-muted">{i.status === 'paid' ? shortDate(i.paid_at) : i.status === 'draft' ? shortDate(i.created_at) : `Due ${shortDate(i.due_date)}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="pt-stack">
          <section className="pt-card">
            <h2 className="pt-card-title">Top clients this year</h2>
            {stats && stats.top.length ? (
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                {stats.top.map(([id, c]) => (
                  <li key={id}><Link href={`/admin/clients/${id}?tab=billing`} className="pt-row pt-row-link"><Avatar name={c.name} size={32} /><span className="pt-row-main pt-row-title">{c.name}</span><strong>{money(c.total)}</strong></Link></li>
                ))}
              </ul>
            ) : <p className="pt-muted" style={{ margin: '0.5rem 0 0' }}>No paid invoices yet this year.</p>}
          </section>
          <section className="pt-card">
            <h2 className="pt-card-title">Retainers</h2>
            {(data?.billing ?? []).filter((b) => Number(b.monthly_rate) > 0).length === 0 ? (
              <p className="pt-muted" style={{ margin: '0.5rem 0 0' }}>Set a plan and monthly rate on a client’s Billing tab.</p>
            ) : (
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                {data!.billing.filter((b) => Number(b.monthly_rate) > 0).map((b) => (
                  <li key={b.client_id}>
                    <Link href={`/admin/clients/${b.client_id}?tab=billing`} className="pt-row pt-row-link">
                      <div className="pt-row-main"><p className="pt-row-title">{b.profiles?.company || b.profiles?.full_name}</p><p className="pt-row-sub">{b.plan ?? 'Custom'} · {b.auto_invoice && b.next_invoice_date ? `next ${shortDate(b.next_invoice_date)}` : 'manual invoicing'}{b.status !== 'active' ? ` · ${b.status}` : ''}</p></div>
                      <strong>{money(b.monthly_rate, b.currency)}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
