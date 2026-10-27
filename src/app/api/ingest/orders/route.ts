import { NextResponse } from 'next/server';
import { adminOrError, hashKey } from '@/lib/integrations';

// Order webhook for custom-built sites.
//   POST /api/ingest/orders
//   Authorization: Bearer nxk_…            (key from Store → Custom-built)
//   Body: one order, or { "orders": [ … ] } (max 500), each:
//     { "id": "1001", "amount": 129.5, "currency": "USD", "status": "paid",
//       "customer_name": "Jane", "customer_email": "jane@x.com", "ordered_at": "2026-10-26T14:03:00Z" }
// Re-sending the same id updates that order (idempotent). Daily revenue/orders are recalculated.

type Incoming = { id?: unknown; amount?: unknown; currency?: unknown; status?: unknown; customer_name?: unknown; customer_email?: unknown; ordered_at?: unknown };

const str = (v: unknown, max = 200) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, max) : null);

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token.startsWith('nxk_')) return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });

  const db = adminOrError();
  if ('error' in db) return db.error;
  const { data: integ } = await db.db.from('store_integrations').select('id, client_id').eq('platform', 'custom').eq('is_active', true).eq('api_key', hashKey(token)).maybeSingle();
  if (!integ) return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const list: Incoming[] = Array.isArray(body?.orders) ? body.orders : body && typeof body === 'object' ? [body] : [];
  if (list.length === 0) return NextResponse.json({ error: 'Send an order object or { "orders": [...] }' }, { status: 400 });
  if (list.length > 500) return NextResponse.json({ error: 'Max 500 orders per request' }, { status: 413 });

  type OrderRow = {
    client_id: string; integration_id: string; platform: string; external_id: string; amount: number; currency: string;
    status: string; customer_name: string | null; customer_email: string | null; ordered_at: string;
  };
  const rows: OrderRow[] = [];
  const errors: string[] = [];
  list.forEach((o, i) => {
    const id = str(o.id, 100);
    const amount = Number(o.amount);
    const orderedAt = o.ordered_at ? new Date(String(o.ordered_at)) : new Date();
    if (!id) return errors.push(`orders[${i}]: "id" is required`);
    if (!Number.isFinite(amount) || amount < 0) return errors.push(`orders[${i}]: "amount" must be a positive number`);
    if (Number.isNaN(orderedAt.getTime())) return errors.push(`orders[${i}]: "ordered_at" isn't a valid date`);
    rows.push({
      client_id: integ.client_id, integration_id: integ.id, platform: 'custom', external_id: id,
      amount: Math.round(amount * 100) / 100, currency: (str(o.currency, 3) ?? 'USD').toUpperCase(),
      status: str(o.status, 40)?.toLowerCase() ?? 'paid', customer_name: str(o.customer_name), customer_email: str(o.customer_email),
      ordered_at: orderedAt.toISOString(),
    });
  });
  if (rows.length === 0) return NextResponse.json({ error: 'No valid orders', details: errors }, { status: 400 });

  const { error } = await db.db.from('store_orders').upsert(rows, { onConflict: 'integration_id,external_id' });
  if (error) return NextResponse.json({ error: 'Couldn’t save orders' }, { status: 500 });

  // Recalculate the daily totals for every day these orders touched.
  const days = [...new Set(rows.map((r) => r.ordered_at.slice(0, 10)))];
  for (const day of days) {
    const { data: dayOrders } = await db.db.from('store_orders').select('amount, customer_email, currency, status')
      .eq('integration_id', integ.id).gte('ordered_at', `${day}T00:00:00Z`).lt('ordered_at', `${day}T23:59:59.999Z`);
    const counted = (dayOrders ?? []).filter((o) => !['refunded', 'cancelled', 'canceled', 'failed'].includes(o.status ?? ''));
    const revenue = counted.reduce((s, o) => s + Number(o.amount), 0);
    await db.db.from('store_metrics').upsert({
      client_id: integ.client_id, integration_id: integ.id, date: day,
      revenue: Math.round(revenue * 100) / 100, orders: counted.length,
      customers: new Set(counted.map((o) => o.customer_email).filter(Boolean)).size,
      avg_order_value: counted.length ? Math.round((revenue / counted.length) * 100) / 100 : 0,
      currency: counted[0]?.currency ?? 'USD', updated_at: new Date().toISOString(),
    }, { onConflict: 'integration_id,date' });
  }
  await db.db.from('store_integrations').update({ last_synced_at: new Date().toISOString() }).eq('id', integ.id);

  return NextResponse.json({ received: rows.length, skipped: errors.length, errors: errors.slice(0, 20) });
}
