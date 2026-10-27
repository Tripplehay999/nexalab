import { NextResponse } from 'next/server';
import { adminOrError, getActor } from '@/lib/integrations';
import { createCheckoutSession, stripeConfigured } from '@/lib/billing-server';

// Start a Stripe Checkout for an open invoice. The amount always comes from the
// database — never from the browser.
export async function POST(request: Request) {
  const { invoiceId } = await request.json().catch(() => ({}));
  if (!stripeConfigured()) return NextResponse.json({ error: 'Online card payments aren’t switched on yet — please pay by bank transfer or contact us.' }, { status: 503 });
  const db = adminOrError();
  if ('error' in db) return db.error;

  const { data: inv } = await db.db.from('invoices').select('*').eq('id', String(invoiceId ?? '')).maybeSingle();
  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  const actor = await getActor(inv.client_id);
  if ('error' in actor) return actor.error;
  if (inv.status !== 'open') return NextResponse.json({ error: inv.status === 'paid' ? 'This invoice is already paid.' : 'This invoice can’t be paid online.' }, { status: 400 });

  const [{ data: billing }, { data: profile }] = await Promise.all([
    db.db.from('client_billing').select('billing_email').eq('client_id', inv.client_id).maybeSingle(),
    db.db.from('profiles').select('email').eq('id', inv.client_id).single(),
  ]);
  try {
    const session = await createCheckoutSession({
      invoiceId: inv.id, number: inv.number, title: inv.title, currency: inv.currency,
      totalCents: Math.round(Number(inv.total) * 100), email: billing?.billing_email || profile?.email, origin: new URL(request.url).origin,
    });
    await db.db.from('invoices').update({ stripe_session_id: session.id }).eq('id', inv.id);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Couldn’t start checkout' }, { status: 502 });
  }
}
