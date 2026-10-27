import { NextResponse } from 'next/server';
import { adminOrError } from '@/lib/integrations';
import { createInvoice } from '@/lib/billing-server';
import { addMonths, todayISO } from '@/lib/billing';

// Daily: create + email monthly retainer invoices for clients with auto-invoicing
// on (Vercel Cron, see vercel.json; authorised with CRON_SECRET).
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = adminOrError();
  if ('error' in db) return db.error;

  const today = todayISO();
  const { data: due } = await db.db.from('client_billing').select('*')
    .eq('auto_invoice', true).eq('status', 'active').gt('monthly_rate', 0).lte('next_invoice_date', today);

  const created: string[] = [];
  for (const b of due ?? []) {
    const period = new Date(`${b.next_invoice_date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    try {
      const inv = await createInvoice(db.db, {
        clientId: b.client_id, title: `${b.plan ?? 'Monthly'} retainer — ${period}`, send: true, recurring: true,
        currency: b.currency, taxRate: Number(b.tax_rate) || 0,
        items: [{ description: `${b.plan ?? 'Monthly'} plan — ${period}`, quantity: 1, unit_price: Number(b.monthly_rate) }],
      });
      created.push(inv.number);
      // Advance from the scheduled date (not today) so a missed day doesn't shift the cycle.
      await db.db.from('client_billing').update({ next_invoice_date: addMonths(b.next_invoice_date, 1), updated_at: new Date().toISOString() }).eq('client_id', b.client_id);
    } catch {
      // leave next_invoice_date unchanged so tomorrow's run retries
    }
  }
  return NextResponse.json({ created });
}
