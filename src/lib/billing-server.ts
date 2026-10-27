// Server-only billing helpers: Stripe Checkout, webhook verification, invoice
// creation, and marking invoices paid. Import only from route handlers.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { createAdminClient } from '@/lib/supabase/admin';
import { computeTotals } from '@/lib/billing';

type Db = ReturnType<typeof createAdminClient>;

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

async function stripe(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Stripe request failed');
  return json;
}

export async function createCheckoutSession(opts: { invoiceId: string; number: string; title: string; totalCents: number; currency: string; email?: string | null; origin: string }) {
  const params: Record<string, string> = {
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': opts.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(opts.totalCents),
    'line_items[0][price_data][product_data][name]': `Invoice ${opts.number} — ${opts.title}`.slice(0, 250),
    'metadata[invoice_id]': opts.invoiceId,
    'payment_intent_data[metadata][invoice_id]': opts.invoiceId,
    success_url: `${opts.origin}/dashboard/billing?paid=${opts.invoiceId}`,
    cancel_url: `${opts.origin}/dashboard/billing?cancelled=${opts.invoiceId}`,
  };
  if (opts.email) params.customer_email = opts.email;
  return stripe('checkout/sessions', params) as Promise<{ id: string; url: string }>;
}

/** Verify a Stripe webhook signature (Stripe-Signature: t=…,v1=…) with a 5-minute tolerance. */
export function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return header.split(',').filter((p) => p.startsWith('v1=')).some((p) => {
    const sig = Buffer.from(p.slice(3));
    const exp = Buffer.from(expected);
    return sig.length === exp.length && timingSafeEqual(sig, exp);
  });
}

/** Call the send-notification Edge Function as the server (service role = admin rights). */
export async function notifyAsServer(type: string, data: Record<string, unknown>) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return;
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => undefined);
}

/** Mark an invoice paid once (idempotent on payment reference), log it, and notify. */
export async function markInvoicePaid(db: Db, invoiceId: string, p: { method: string; reference?: string | null; amount?: number; paidAt?: string }) {
  const { data: inv } = await db.from('invoices').select('*').eq('id', invoiceId).single();
  if (!inv || inv.status === 'paid' || inv.status === 'void') return { ok: Boolean(inv), already: inv?.status === 'paid' };

  const paidAt = p.paidAt ?? new Date().toISOString();
  const { error: payErr } = await db.from('payments').insert({
    invoice_id: inv.id, client_id: inv.client_id, amount: p.amount ?? inv.total, currency: inv.currency, method: p.method, reference: p.reference ?? null, received_at: paidAt,
  });
  if (payErr && p.reference) return { ok: true, already: true }; // duplicate webhook delivery
  await db.from('invoices').update({ status: 'paid', paid_at: paidAt, paid_method: p.method }).eq('id', inv.id);

  const { data: project } = await db.from('projects').select('id').eq('client_id', inv.client_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (project) await db.from('activity').insert({ project_id: project.id, text: `Payment received for invoice ${inv.number} — thank you!`, color: 'green' });

  const { data: client } = await db.from('profiles').select('full_name, company, email').eq('id', inv.client_id).single();
  await notifyAsServer('invoice_paid', { client_id: inv.client_id, name: client?.full_name ?? '', number: inv.number, total: inv.total, currency: inv.currency, method: p.method, invoiceId: inv.id });
  await notifyAsServer('payment_received_admin', { name: client?.full_name, company: client?.company, number: inv.number, total: inv.total, currency: inv.currency, method: p.method });
  return { ok: true, already: false };
}

/** Create (and optionally send) an invoice — used by the monthly auto-invoice cron. */
export async function createInvoice(db: Db, opts: { clientId: string; title: string; items: { description: string; quantity: number; unit_price: number }[]; taxRate?: number; currency?: string; dueInDays?: number; send?: boolean; recurring?: boolean }) {
  const { data: number, error: numErr } = await db.rpc('next_invoice_number');
  if (numErr || !number) throw new Error('Couldn’t number the invoice');
  const totals = computeTotals(opts.items, opts.taxRate ?? 0);
  const { data: inv, error } = await db.from('invoices').insert({
    client_id: opts.clientId, number, title: opts.title, currency: opts.currency ?? 'USD', tax_rate: opts.taxRate ?? 0, ...totals,
    status: opts.send ? 'open' : 'draft', issued_at: opts.send ? new Date().toISOString() : null,
    due_date: new Date(Date.now() + (opts.dueInDays ?? 14) * 864e5).toISOString().slice(0, 10),
    is_recurring: Boolean(opts.recurring),
  }).select().single();
  if (error || !inv) throw new Error(error?.message || 'Couldn’t create invoice');
  await db.from('invoice_items').insert(opts.items.map((it, i) => ({ ...it, invoice_id: inv.id, sort_order: i })));
  if (opts.send) {
    const { data: client } = await db.from('profiles').select('full_name').eq('id', opts.clientId).single();
    await notifyAsServer('invoice_sent', { client_id: opts.clientId, name: client?.full_name ?? '', number: inv.number, title: inv.title, total: inv.total, currency: inv.currency, due: inv.due_date, invoiceId: inv.id });
  }
  return inv;
}
