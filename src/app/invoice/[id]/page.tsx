'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { invoiceState, money, shortDate } from '@/lib/billing';
import type { ClientBilling, Invoice, InvoiceItem, Profile } from '@/lib/types';
import Icon from '@/components/portal/Icon';

type Data = { invoice: Invoice; items: InvoiceItem[]; client: Profile | null; billing: ClientBilling | null; viewerId: string; isAdmin: boolean };

async function load(id: string): Promise<Data | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (!invoice) return null;
  const [{ data: items }, { data: client }, { data: billing }, { data: me }] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('profiles').select('*').eq('id', invoice.client_id).maybeSingle(),
    supabase.from('client_billing').select('*').eq('client_id', invoice.client_id).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', session.user.id).single(),
  ]);
  return { invoice: invoice as Invoice, items: (items ?? []) as InvoiceItem[], client: client as Profile | null, billing: billing as ClientBilling | null, viewerId: session.user.id, isAdmin: me?.role === 'admin' };
}

// Printable invoice / receipt. Readable by the client it belongs to and by admins (RLS).
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    load(id).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [id]);

  async function pay() {
    setPaying(true); setError('');
    const res = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId: id }) });
    const j = await res.json().catch(() => ({}));
    if (j.url) { window.location.assign(j.url); return; }
    setError(j.error || 'Couldn’t start payment'); setPaying(false);
  }

  if (data === undefined) return <div className="pt pt-loading"><span className="pt-loading-dot" /> Loading invoice…</div>;
  if (data === null) {
    return (
      <div className="pt-scope inv-wrap">
        <div className="pt-card pt-empty"><span className="pt-empty-icon">🧾</span><h3>Invoice not found</h3><p>It may have been removed, or you may need to sign in with a different account.</p><Link href="/dashboard/billing" className="pt-btn pt-btn-ghost pt-btn-sm">Go to billing</Link></div>
      </div>
    );
  }

  const { invoice: inv, items, client, billing } = data;
  const st = invoiceState(inv);
  const canPay = inv.status === 'open' && data.viewerId === inv.client_id;

  return (
    <div className="pt-scope inv-wrap">
      <div className="inv-actions">
        <Link href={data.isAdmin ? `/admin/billing/${inv.id}` : '/dashboard/billing'} className="pt-btn pt-btn-ghost pt-btn-sm">← Back</Link>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={() => window.print()}><Icon name="print" size={16} /> Print / save PDF</button>
          {canPay && <button className="pt-btn pt-btn-primary pt-btn-sm" onClick={pay} disabled={paying}>{paying ? 'Opening secure checkout…' : `Pay ${money(inv.total, inv.currency)}`}</button>}
        </span>
      </div>
      {error && <p className="pt-error inv-actions">{error}</p>}

      <article className="inv-paper">
        <header className="inv-head">
          <div>
            <div className="pt-logo"><span className="pt-logo-mark" aria-hidden="true"><span /></span>NexaLab</div>
            <p className="pt-muted pt-small" style={{ margin: '0.6rem 0 0', lineHeight: 1.6 }}>NexaLab Studio<br />Brooklyn · Toronto<br />hello@nexalab.studio · 416-206-1469</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 className="inv-title">{inv.status === 'paid' ? 'Receipt' : 'Invoice'}</h1>
            <p className="pt-strong" style={{ margin: '0.2rem 0' }}>{inv.number}</p>
            <span className={`pt-pill tone-${st.tone}`}>{st.label}</span>
          </div>
        </header>

        <section className="inv-meta">
          <div>
            <p className="inv-label">Billed to</p>
            <p style={{ margin: 0 }}><strong>{billing?.billing_name || client?.company || client?.full_name}</strong><br />{client?.full_name && (billing?.billing_name || client?.company) ? <>{client.full_name}<br /></> : null}{billing?.billing_email || client?.email}</p>
          </div>
          <div>
            <p className="inv-label">Issued</p><p style={{ margin: '0 0 0.6rem' }}>{shortDate(inv.issued_at || inv.created_at)}</p>
            <p className="inv-label">{inv.status === 'paid' ? 'Paid' : 'Due'}</p><p style={{ margin: 0 }}>{inv.status === 'paid' ? `${shortDate(inv.paid_at)}${inv.paid_method ? ` · ${inv.paid_method}` : ''}` : shortDate(inv.due_date)}</p>
          </div>
        </section>

        <p className="pt-strong" style={{ margin: '0 0 0.6rem' }}>{inv.title}</p>
        <table className="inv-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}><td>{it.description}</td><td>{Number(it.quantity)}</td><td>{money(it.unit_price, inv.currency)}</td><td>{money(Number(it.quantity) * Number(it.unit_price), inv.currency)}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="inv-totals">
          <div><span>Subtotal</span><span>{money(inv.subtotal, inv.currency)}</span></div>
          {Number(inv.tax) > 0 && <div><span>Tax ({Number(inv.tax_rate)}%)</span><span>{money(inv.tax, inv.currency)}</span></div>}
          <div className="inv-grand"><span>{inv.status === 'paid' ? 'Paid' : 'Total due'}</span><span>{money(inv.total, inv.currency)} {inv.currency}</span></div>
        </div>

        {inv.notes && <p className="pt-muted" style={{ whiteSpace: 'pre-wrap', marginTop: '1.4rem' }}>{inv.notes}</p>}
        <footer className="inv-foot">
          {inv.status === 'paid' ? 'Thank you for your business!' : 'Pay online by card from your client portal, or contact hello@nexalab.studio for bank transfer details.'}
        </footer>
      </article>
    </div>
  );
}
