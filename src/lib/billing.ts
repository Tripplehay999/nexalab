import type { Invoice } from '@/lib/types';

export const PLANS = ['Launch', 'Operate', 'Scale'];

export function money(amount: number | string | null | undefined, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount) || 0);
}

/** Totals rounded to cents, the same way on screen, in the database, and at Stripe. */
export function computeTotals(items: { quantity: number; unit_price: number }[], taxRate: number) {
  const subtotal = Math.round(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0) * 100) / 100;
  const tax = Math.round(subtotal * (Number(taxRate) || 0)) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Draft / Open / Overdue / Paid / Void, with the tone used for its pill. */
export function invoiceState(inv: Pick<Invoice, 'status' | 'due_date'>): { key: string; label: string; tone: string } {
  if (inv.status === 'paid') return { key: 'paid', label: 'Paid', tone: 'lime' };
  if (inv.status === 'void') return { key: 'void', label: 'Void', tone: '' };
  if (inv.status === 'draft') return { key: 'draft', label: 'Draft', tone: 'sky' };
  if (inv.due_date && inv.due_date < todayISO()) return { key: 'overdue', label: 'Overdue', tone: 'rose' };
  return { key: 'open', label: 'Due', tone: 'sun' };
}

export function addMonths(dateISO: string, n: number) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + n);
  if (d.getUTCDate() < day) d.setUTCDate(0); // keep end-of-month dates sane
  return d.toISOString().slice(0, 10);
}

export const shortDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
