'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import { createClient } from '@/lib/supabase/client';
import { invoiceState, money, shortDate } from '@/lib/billing';
import type { ClientBilling, Invoice, Payment } from '@/lib/types';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';
import Icon from '@/components/portal/Icon';

type Data = { billing: ClientBilling | null; invoices: Invoice[]; payments: Payment[] };

async function loadBilling(clientId: string): Promise<Data> {
  const supabase = createClient();
  const [b, i, p] = await Promise.all([
    supabase.from('client_billing').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('client_id', clientId).order('received_at', { ascending: false }).limit(20),
  ]);
  return { billing: b.data as ClientBilling | null, invoices: (i.data ?? []) as Invoice[], payments: (p.data ?? []) as Payment[] };
}

export default function BillingPage() {
  const { boot, loading } = useDashboard();
  const [data, setData] = useState<Data | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const userId = boot?.userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadBilling(userId).then((d) => { if (!cancelled) setData(d); });
    const q = new URLSearchParams(window.location.search);
    const t = setTimeout(() => {
      if (q.get('paid')) setMsg({ ok: true, text: 'Thank you! Your payment went through — a receipt is on its way to your inbox.' });
      if (q.get('cancelled')) setMsg({ ok: false, text: 'Payment was cancelled — nothing was charged.' });
    }, 0);
    // Stripe confirms payments a moment after redirect; refresh shortly after.
    const r = q.get('paid') ? setTimeout(() => loadBilling(userId).then((d) => { if (!cancelled) setData(d); }), 3500) : undefined;
    return () => { cancelled = true; clearTimeout(t); if (r) clearTimeout(r); };
  }, [userId]);

  if (loading || !boot) return <PortalLoading />;

  async function pay(id: string) {
    setPaying(id); setMsg(null);
    const res = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId: id }) });
    const j = await res.json().catch(() => ({}));
    if (j.url) { window.location.assign(j.url); return; }
    setMsg({ ok: false, text: j.error || 'Couldn’t start payment' }); setPaying(null);
  }

  const invoices = data?.invoices ?? [];
  const open = invoices.filter((i) => i.status === 'open');
  const balance = open.reduce((s, i) => s + Number(i.total), 0);
  const overdue = open.filter((i) => invoiceState(i).key === 'overdue');
  const b = data?.billing;
  const currency = b?.currency ?? invoices[0]?.currency ?? 'USD';

  return (
    <ClientShell
      boot={boot}
      kicker="Billing"
      title={<>Plan &amp; <em>invoices.</em></>}
      subtitle="Your plan, what’s due, and every invoice and receipt in one place. Pay securely by card in a couple of clicks."
    >
      {msg && <p className={msg.ok ? 'pt-success' : 'pt-error'} style={{ marginBottom: '1rem' }}>{msg.text}</p>}

      <div className="pt-grid pt-grid-3" style={{ marginBottom: '1rem' }}>
        <div className="pt-card pt-hero-card">
          <p className="pt-kicker" style={{ color: 'var(--lime)' }}>Your plan</p>
          <p className="pt-title" style={{ fontSize: '1.8rem' }}>{b?.plan || boot.project?.plan || 'Not set yet'}</p>
          <p className="pt-muted" style={{ margin: '0.4rem 0 0' }}>
            {b && Number(b.monthly_rate) > 0 ? `${money(b.monthly_rate, currency)} / month${b.status !== 'active' ? ` · ${b.status}` : ''}` : 'Your team sets this up after your kickoff call.'}
          </p>
        </div>
        <div className="pt-card">
          <p className="pt-metric-label">Balance due</p>
          <p className="pt-metric-value" style={{ margin: '0.4rem 0' }}>{money(balance, currency)}</p>
          <p className={`pt-small ${overdue.length ? 'pt-down' : 'pt-muted'}`} style={{ margin: 0 }}>
            {overdue.length ? `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} overdue` : open.length ? `${open.length} open invoice${open.length > 1 ? 's' : ''}` : 'You’re all paid up 🎉'}
          </p>
        </div>
        <div className="pt-card">
          <p className="pt-metric-label">Next invoice</p>
          <p className="pt-metric-value" style={{ margin: '0.4rem 0', fontSize: '1.4rem' }}>{b?.auto_invoice && b.next_invoice_date ? shortDate(b.next_invoice_date) : '—'}</p>
          <p className="pt-small pt-muted" style={{ margin: 0 }}>{b?.auto_invoice ? 'Monthly, emailed automatically' : 'We’ll email invoices as work is delivered'}</p>
        </div>
      </div>

      <div className="pt-grid pt-grid-main">
        <section className="pt-card pt-card-flush">
          <div className="pt-card-head" style={{ padding: '1.1rem 1.2rem 0' }}><h2 className="pt-card-title">Invoices</h2></div>
          {data === null ? <p className="pt-muted" style={{ padding: '0 1.2rem 1.2rem' }}>Loading…</p> : invoices.length === 0 ? (
            <div className="pt-empty"><span className="pt-empty-icon">🧾</span><h3>No invoices yet</h3><p>When we send one, it’ll appear here and in your inbox.</p></div>
          ) : (
            <div className="pt-table-wrap">
              <table className="pt-table">
                <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {invoices.map((inv) => {
                    const st = invoiceState(inv);
                    return (
                      <tr key={inv.id}>
                        <td><Link href={`/invoice/${inv.id}`} className="pt-strong">{inv.number}</Link><div className="pt-small pt-muted">{inv.title}</div></td>
                        <td className="pt-muted">{inv.status === 'paid' ? `Paid ${shortDate(inv.paid_at)}` : `Due ${shortDate(inv.due_date)}`}</td>
                        <td className="pt-strong">{money(inv.total, inv.currency)}</td>
                        <td><span className={`pt-pill tone-${st.tone}`}>{st.label}</span></td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {inv.status === 'open' && <button className="pt-btn pt-btn-primary pt-btn-sm" onClick={() => pay(inv.id)} disabled={paying === inv.id}>{paying === inv.id ? 'Opening…' : 'Pay now'}</button>}{' '}
                          <Link href={`/invoice/${inv.id}`} className="pt-btn pt-btn-ghost pt-btn-sm">{inv.status === 'paid' ? 'Receipt' : 'View'}</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="pt-stack">
          <section className="pt-card">
            <h2 className="pt-card-title">Payment history</h2>
            {(data?.payments ?? []).length === 0 ? <p className="pt-muted" style={{ margin: '0.5rem 0 0' }}>No payments yet.</p> : (
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                {data!.payments.map((p) => (
                  <li key={p.id} className="pt-row">
                    <span className="pt-row-icon">{p.method === 'card' ? '💳' : '🏦'}</span>
                    <div className="pt-row-main"><p className="pt-row-title">{money(p.amount, p.currency)}</p><p className="pt-row-sub">{shortDate(p.received_at)} · {p.method}</p></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="pt-card">
            <h2 className="pt-card-title">Questions about billing?</h2>
            <p className="pt-muted" style={{ margin: '0.4rem 0 1rem' }}>Need a copy for your accountant, a different billing email, or to pay by bank transfer? We’re happy to help.</p>
            <Link href="/dashboard/support" className="pt-btn pt-btn-ghost pt-btn-sm"><Icon name="support" size={15} /> Ask about billing</Link>
          </section>
        </aside>
      </div>
    </ClientShell>
  );
}
