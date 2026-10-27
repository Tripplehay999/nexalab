import { NextResponse } from 'next/server';
import { adminOrError } from '@/lib/integrations';
import { markInvoicePaid, verifyStripeSignature } from '@/lib/billing-server';

// Stripe → NexaLab. Register https://nexalab.studio/api/billing/webhook in the
// Stripe dashboard for "checkout.session.completed" and
// "checkout.session.async_payment_succeeded", and set STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(payload) as { type: string; data: { object: { id: string; payment_status?: string; payment_intent?: string; amount_total?: number; metadata?: { invoice_id?: string } } } };
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object;
    const invoiceId = s.metadata?.invoice_id;
    if (invoiceId && s.payment_status === 'paid') {
      const db = adminOrError();
      if ('error' in db) return db.error;
      await markInvoicePaid(db.db, invoiceId, { method: 'card', reference: s.payment_intent ?? s.id, amount: (s.amount_total ?? 0) / 100 });
    }
  }
  return NextResponse.json({ received: true });
}
