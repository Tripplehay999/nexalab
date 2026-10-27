'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { createClient } from '@/lib/supabase/client';
import { sendNotification } from '@/lib/utils';
import { computeTotals, invoiceState, money, shortDate, todayISO } from '@/lib/billing';
import type { ClientBilling, Invoice, InvoiceItem, Payment, Profile } from '@/lib/types';
import AdminShell from '@/components/portal/AdminShell';
import { PortalLoading } from '@/components/portal/ClientShell';
import Icon from '@/components/portal/Icon';

type Item = { description: string; quantity: string; unit_price: string };
const blankItem = (): Item => ({ description: '', quantity: '1', unit_price: '' });
const in14 = () => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

function Editor() {
  const { boot, loading } = useAdmin();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const isNew = id === 'new';

  const [clients, setClients] = useState<Profile[]>([]);
  const [inv, setInv] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState({ client_id: search.get('client') ?? '', title: 'Services', currency: 'USD', tax_rate: '0', due_date: in14(), notes: '' });
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [pay, setPay] = useState({ method: 'bank', date: todayISO(), reference: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: cl } = await supabase.from('profiles').select('*').eq('role', 'client').order('company');
      if (cancelled) return;
      setClients((cl ?? []) as Profile[]);
      if (isNew) {
        const cid = search.get('client');
        if (cid) {
          const { data: b } = await supabase.from('client_billing').select('*').eq('client_id', cid).maybeSingle();
          const billing = b as ClientBilling | null;
          if (billing && !cancelled) {
            setForm((f) => ({ ...f, currency: billing.currency, tax_rate: String(billing.tax_rate ?? 0) }));
            if (Number(billing.monthly_rate) > 0) setItems([{ description: `${billing.plan ?? 'Monthly'} plan — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, quantity: '1', unit_price: String(billing.monthly_rate) }]);
          }
        }
        return;
      }
      const [{ data: i }, { data: its }, { data: ps }] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
        supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
        supabase.from('payments').select('*').eq('invoice_id', id).order('received_at'),
      ]);
      if (cancelled || !i) return;
      const invoice = i as Invoice;
      setInv(invoice);
      setPayments((ps ?? []) as Payment[]);
      setForm({ client_id: invoice.client_id, title: invoice.title, currency: invoice.currency, tax_rate: String(invoice.tax_rate), due_date: invoice.due_date ?? in14(), notes: invoice.notes ?? '' });
      const rows = ((its ?? []) as InvoiceItem[]).map((it) => ({ description: it.description, quantity: String(it.quantity), unit_price: String(it.unit_price) }));
      setItems(rows.length ? rows : [blankItem()]);
    })();
    return () => { cancelled = true; };
  }, [boot, id, isNew, search]);

  if (loading || !boot) return <PortalLoading />;

  const locked = inv?.status === 'paid' || inv?.status === 'void';
  const clean = items.filter((it) => it.description.trim() && Number(it.unit_price) > 0).map((it) => ({ description: it.description.trim(), quantity: Number(it.quantity) || 1, unit_price: Number(it.unit_price) }));
  const totals = computeTotals(clean, Number(form.tax_rate) || 0);
  const client = clients.find((c) => c.id === form.client_id);
  const st = inv ? invoiceState(inv) : null;

  async function save(): Promise<Invoice | null> {
    if (!form.client_id) { setMsg({ ok: false, text: 'Choose a client.' }); return null; }
    if (clean.length === 0) { setMsg({ ok: false, text: 'Add at least one line item with a price.' }); return null; }
    const supabase = createClient();
    const fields = { client_id: form.client_id, title: form.title.trim() || 'Services', currency: form.currency, tax_rate: Number(form.tax_rate) || 0, due_date: form.due_date || null, notes: form.notes.trim() || null, ...totals };
    let saved: Invoice;
    if (inv) {
      const { data, error } = await supabase.from('invoices').update(fields).eq('id', inv.id).select().single();
      if (error || !data) { setMsg({ ok: false, text: error?.message ?? 'Couldn’t save' }); return null; }
      saved = data as Invoice;
      await supabase.from('invoice_items').delete().eq('invoice_id', inv.id);
    } else {
      const { data: number, error: nErr } = await supabase.rpc('next_invoice_number');
      if (nErr || !number) { setMsg({ ok: false, text: 'Couldn’t number the invoice — is migration 013 applied?' }); return null; }
      const { data, error } = await supabase.from('invoices').insert({ ...fields, number, status: 'draft' }).select().single();
      if (error || !data) { setMsg({ ok: false, text: error?.message ?? 'Couldn’t save' }); return null; }
      saved = data as Invoice;
    }
    await supabase.from('invoice_items').insert(clean.map((it, i) => ({ ...it, invoice_id: saved.id, sort_order: i })));
    setInv(saved);
    return saved;
  }

  async function act(name: string, fn: () => Promise<void>) {
    setBusy(name); setMsg(null);
    try { await fn(); } finally { setBusy(''); }
  }

  const saveDraft = () => act('save', async () => {
    const s = await save();
    if (s) { setMsg({ ok: true, text: 'Saved.' }); if (isNew) router.replace(`/admin/billing/${s.id}`); }
  });

  const send = () => act('send', async () => {
    const s = await save();
    if (!s) return;
    const { data } = await createClient().from('invoices').update({ status: 'open', issued_at: s.issued_at ?? new Date().toISOString() }).eq('id', s.id).select().single();
    setInv(data as Invoice);
    await sendNotification('invoice_sent', { client_id: s.client_id, name: client?.full_name ?? '', number: s.number, title: s.title, total: s.total, currency: s.currency, due: shortDate(s.due_date), invoiceId: s.id });
    setMsg({ ok: true, text: `Sent to ${client?.email ?? 'the client'} — they can pay by card from the email or their portal.` });
    if (isNew) router.replace(`/admin/billing/${s.id}`);
  });

  const markPaid = () => act('paid', async () => {
    if (!inv) return;
    const supabase = createClient();
    const paidAt = new Date(`${pay.date}T12:00:00`).toISOString();
    await supabase.from('payments').insert({ invoice_id: inv.id, client_id: inv.client_id, amount: inv.total, currency: inv.currency, method: pay.method, reference: pay.reference.trim() || null, received_at: paidAt });
    const { data } = await supabase.from('invoices').update({ status: 'paid', paid_at: paidAt, paid_method: pay.method }).eq('id', inv.id).select().single();
    const { data: project } = await supabase.from('projects').select('id').eq('client_id', inv.client_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (project) await supabase.from('activity').insert({ project_id: project.id, text: `Payment received for invoice ${inv.number} — thank you!`, color: 'green' });
    await sendNotification('invoice_paid', { client_id: inv.client_id, name: client?.full_name ?? '', number: inv.number, total: inv.total, currency: inv.currency, method: pay.method, invoiceId: inv.id });
    setInv(data as Invoice);
    const { data: ps } = await supabase.from('payments').select('*').eq('invoice_id', inv.id).order('received_at');
    setPayments((ps ?? []) as Payment[]);
    setMsg({ ok: true, text: 'Marked as paid — a receipt was emailed to the client.' });
  });

  const voidIt = () => act('void', async () => {
    if (!inv || !window.confirm(`Void ${inv.number}? The client will no longer be able to pay it.`)) return;
    const { data } = await createClient().from('invoices').update({ status: 'void' }).eq('id', inv.id).select().single();
    setInv(data as Invoice);
  });

  const remove = () => act('delete', async () => {
    if (!inv || !window.confirm('Delete this draft?')) return;
    await createClient().from('invoices').delete().eq('id', inv.id);
    router.replace('/admin/billing');
  });

  const setItem = (i: number, k: keyof Item, v: string) => setItems((list) => list.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  return (
    <AdminShell
      boot={boot}
      kicker={<Link href="/admin/billing" className="pt-link">← Billing</Link>}
      title={inv ? <>{inv.number} <em>· {client?.company || client?.full_name || ''}</em></> : <>New <em>invoice.</em></>}
      subtitle={inv ? `Created ${shortDate(inv.created_at)}${inv.issued_at ? ` · sent ${shortDate(inv.issued_at)}` : ''}` : 'Line items, tax and a due date — save as a draft or send it straight away.'}
      actions={st && <span className={`pt-pill tone-${st.tone}`}>{st.label}</span>}
    >
      {msg && <p className={msg.ok ? 'pt-success' : 'pt-error'} style={{ marginBottom: '1rem' }}>{msg.text}</p>}
      <div className="pt-grid pt-grid-main">
        <section className="pt-card">
          <div className="pt-form">
            <div className="pt-form-row">
              <label className="pt-field">Client
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} disabled={Boolean(inv)}>
                  <option value="">Choose a client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.company ? `${c.company} — ${c.full_name ?? ''}` : c.full_name ?? c.email}</option>)}
                </select>
              </label>
              <label className="pt-field">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={locked} placeholder="e.g. Checkout rebuild — milestone 2" /></label>
            </div>

            <div className="inv-edit-items">
              <div className="inv-edit-row inv-edit-head"><span>Description</span><span>Qty</span><span>Price</span><span>Amount</span><span /></div>
              {items.map((it, i) => (
                <div key={i} className="inv-edit-row">
                  <input className="pt-input" value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="What it’s for" disabled={locked} aria-label="Description" />
                  <input className="pt-input" inputMode="decimal" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value.replace(/[^0-9.]/g, ''))} disabled={locked} aria-label="Quantity" />
                  <input className="pt-input" inputMode="decimal" value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" disabled={locked} aria-label="Unit price" />
                  <span className="pt-strong" style={{ textAlign: 'right' }}>{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), form.currency)}</span>
                  {!locked && items.length > 1 ? <button type="button" className="pt-icon-btn" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove line"><Icon name="close" size={14} /></button> : <span />}
                </div>
              ))}
              {!locked && <button type="button" className="pt-btn pt-btn-ghost pt-btn-sm" style={{ justifySelf: 'start' }} onClick={() => setItems([...items, blankItem()])}><Icon name="plus" size={15} /> Add line</button>}
            </div>

            <div className="pt-form-row">
              <label className="pt-field">Tax %<input inputMode="decimal" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value.replace(/[^0-9.]/g, '') })} disabled={locked} placeholder="e.g. 13" /></label>
              <label className="pt-field">Currency
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={locked}>{['USD', 'CAD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="pt-field">Due date<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} disabled={locked} /></label>
            </div>
            <label className="pt-field">Note to client <span className="pt-muted">(optional, shown on the invoice)</span><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={locked} /></label>

            <div className="inv-totals" style={{ marginTop: 0 }}>
              <div><span>Subtotal</span><span>{money(totals.subtotal, form.currency)}</span></div>
              {totals.tax > 0 && <div><span>Tax ({Number(form.tax_rate)}%)</span><span>{money(totals.tax, form.currency)}</span></div>}
              <div className="inv-grand"><span>Total</span><span>{money(totals.total, form.currency)}</span></div>
            </div>
          </div>
        </section>

        <aside className="pt-stack">
          <section className="pt-card">
            <h2 className="pt-card-title">Actions</h2>
            <div className="pt-form" style={{ marginTop: '0.8rem' }}>
              {!locked && (!inv || inv.status === 'draft') && <button className="pt-btn pt-btn-primary" onClick={send} disabled={Boolean(busy)}>{busy === 'send' ? 'Sending…' : 'Send to client'}</button>}
              {!locked && <button className="pt-btn pt-btn-ghost" onClick={saveDraft} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : inv?.status === 'open' ? 'Save changes' : 'Save draft'}</button>}
              {inv?.status === 'open' && <button className="pt-btn pt-btn-ghost" onClick={() => act('resend', async () => { await sendNotification('invoice_sent', { client_id: inv.client_id, name: client?.full_name ?? '', number: inv.number, title: inv.title, total: inv.total, currency: inv.currency, due: shortDate(inv.due_date), invoiceId: inv.id }); setMsg({ ok: true, text: 'Reminder sent.' }); })} disabled={Boolean(busy)}>Send reminder</button>}
              {inv && <Link href={`/invoice/${inv.id}`} className="pt-btn pt-btn-ghost"><Icon name="print" size={16} /> View / print</Link>}
              {inv && inv.status !== 'draft' && <button className="pt-btn pt-btn-ghost" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/invoice/${inv.id}`); setMsg({ ok: true, text: 'Pay link copied.' }); }}>Copy pay link</button>}
              {inv?.status === 'open' && <button className="pt-btn pt-btn-danger" onClick={voidIt} disabled={Boolean(busy)}>Void invoice</button>}
              {inv?.status === 'draft' && <button className="pt-btn pt-btn-danger" onClick={remove} disabled={Boolean(busy)}>Delete draft</button>}
            </div>
          </section>

          {inv?.status === 'open' && (
            <section className="pt-card">
              <h2 className="pt-card-title">Record a payment</h2>
              <p className="pt-card-sub" style={{ marginBottom: '0.8rem' }}>Paid by bank transfer, e-transfer, or cash? Card payments through Stripe are recorded automatically.</p>
              <div className="pt-form">
                <div className="pt-form-row">
                  <label className="pt-field">Method<select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{['bank', 'e-transfer', 'cash', 'card', 'other'].map((m) => <option key={m}>{m}</option>)}</select></label>
                  <label className="pt-field">Date<input type="date" value={pay.date} max={todayISO()} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></label>
                </div>
                <label className="pt-field">Reference <span className="pt-muted">(optional)</span><input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} placeholder="e.g. bank ref #" /></label>
                <button className="pt-btn pt-btn-ink" onClick={markPaid} disabled={Boolean(busy)}>{busy === 'paid' ? 'Saving…' : `Mark ${money(inv.total, inv.currency)} as paid`}</button>
              </div>
            </section>
          )}

          {payments.length > 0 && (
            <section className="pt-card">
              <h2 className="pt-card-title">Payments</h2>
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                {payments.map((p) => <li key={p.id} className="pt-row"><span className="pt-row-main">{shortDate(p.received_at)} · {p.method}{p.reference ? ` · ${p.reference}` : ''}</span><strong>{money(p.amount, p.currency)}</strong></li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

export default function InvoiceEditorPage() {
  return <Suspense fallback={<PortalLoading />}><Editor /></Suspense>;
}
