// NexaLab — sync-store Edge Function
// Fetches orders from a connected store (WooCommerce / Shopify / BigCommerce)
// and writes aggregated metrics + individual orders to Supabase.
//
// Deploy:  supabase functions deploy sync-store
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//          CRON_SECRET — set via: supabase secrets set CRON_SECRET=<random>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// ── DB row shape ──────────────────────────────────────────────────────────────
interface StoreIntegration {
  id:             string;
  client_id:      string;
  platform:       string;
  store_url:      string;
  api_key?:       string;
  api_secret?:    string;
  access_token?:  string;
  store_hash?:    string;
  is_active:      boolean;
  last_synced_at?: string;
}

// ── Normalised order shape ────────────────────────────────────────────────────
interface NxOrder {
  external_id:    string;
  amount:         number;
  currency:       string;
  customer_name:  string;
  customer_email: string;
  status:         string;
  ordered_at:     string; // ISO
}

// ── Platform API response shapes ──────────────────────────────────────────────
interface WooOrder {
  id:               number;
  total:            string;
  currency:         string;
  status:           string;
  date_created_gmt?: string;
  date_created?:    string;
  billing?: {
    first_name?: string;
    last_name?:  string;
    email?:      string;
  };
}

interface ShopifyCustomer {
  first_name?: string;
  last_name?:  string;
  email?:      string;
}
interface ShopifyOrder {
  id:                  number;
  total_price:         string;
  currency:            string;
  financial_status?:   string;
  fulfillment_status?: string;
  created_at?:         string;
  email?:              string;
  customer?:           ShopifyCustomer;
}

interface BigCommerceOrder {
  id:             number;
  total_inc_tax:  string;
  currency_code:  string;
  status:         string;
  date_created?:  string;
  billing_address?: {
    first_name?: string;
    last_name?:  string;
    email?:      string;
  };
}

// ── WooCommerce (paginated) ───────────────────────────────────────────────────
async function fetchWooCommerce(integration: StoreIntegration, since: string): Promise<NxOrder[]> {
  const creds = btoa(`${integration.api_key ?? ''}:${integration.api_secret ?? ''}`);
  const base  = integration.store_url.replace(/\/$/, '');
  const all: NxOrder[] = [];
  let page = 1;

  while (true) {
    const url = `${base}/wp-json/wc/v3/orders?per_page=100&page=${page}&after=${since}&orderby=date&order=desc`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`WooCommerce ${res.status}: ${await res.text()}`);

    const orders: WooOrder[] = await res.json();
    if (!orders.length) break;

    for (const o of orders) {
      all.push({
        external_id:    String(o.id),
        amount:         parseFloat(o.total)                   || 0,
        currency:       o.currency                            || 'USD',
        customer_name:  `${o.billing?.first_name ?? ''} ${o.billing?.last_name ?? ''}`.trim(),
        customer_email: o.billing?.email                      ?? '',
        status:         o.status                              || '',
        ordered_at:     o.date_created_gmt ?? o.date_created  ?? '',
      });
    }

    // WooCommerce returns fewer than per_page items on the last page
    if (orders.length < 100) break;
    page++;
  }

  return all;
}

// ── Shopify (paginated via Link header) ──────────────────────────────────────
async function fetchShopify(integration: StoreIntegration, since: string): Promise<NxOrder[]> {
  const base = integration.store_url.replace(/\/$/, '');
  const all: NxOrder[] = [];
  let nextUrl: string | null =
    `${base}/admin/api/2025-01/orders.json?limit=250&created_at_min=${since}&status=any`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { 'X-Shopify-Access-Token': integration.access_token ?? '', 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);

    const { orders }: { orders: ShopifyOrder[] } = await res.json();
    for (const o of orders) {
      all.push({
        external_id:    String(o.id),
        amount:         parseFloat(o.total_price)             || 0,
        currency:       o.currency                            || 'USD',
        customer_name:  o.customer
          ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim()
          : '',
        customer_email: o.customer?.email ?? o.email          ?? '',
        status:         o.financial_status ?? o.fulfillment_status ?? '',
        ordered_at:     o.created_at                          ?? '',
      });
    }

    // Follow Shopify's cursor-based pagination via Link header
    const link: string = res.headers.get('Link') ?? '';
    const match: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }

  return all;
}

// ── BigCommerce (paginated) ───────────────────────────────────────────────────
async function fetchBigCommerce(integration: StoreIntegration, since: string): Promise<NxOrder[]> {
  const hash = integration.store_hash ?? '';
  const all: NxOrder[] = [];
  let page = 1;

  while (true) {
    const url = `https://api.bigcommerce.com/stores/${hash}/v2/orders?min_date_created=${since}&sort=date_created:desc&limit=250&page=${page}`;
    const res = await fetch(url, {
      headers: { 'X-Auth-Token': integration.access_token ?? '', 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
    if (res.status === 204) break; // no content = no more pages
    if (!res.ok) throw new Error(`BigCommerce ${res.status}: ${await res.text()}`);

    const orders: BigCommerceOrder[] = await res.json();
    if (!orders.length) break;

    for (const o of orders) {
      all.push({
        external_id:    String(o.id),
        amount:         parseFloat(o.total_inc_tax)           || 0,
        currency:       o.currency_code                       || 'USD',
        customer_name:  `${o.billing_address?.first_name ?? ''} ${o.billing_address?.last_name ?? ''}`.trim(),
        customer_email: o.billing_address?.email              ?? '',
        status:         o.status                              || '',
        ordered_at:     o.date_created                        ?? '',
      });
    }

    if (orders.length < 250) break;
    page++;
  }

  return all;
}

// ── Aggregate daily metrics ───────────────────────────────────────────────────
function buildMetrics(orders: NxOrder[], integrationId: string, clientId: string) {
  const skipStatuses = new Set(['refunded', 'cancelled', 'canceled', 'failed', 'voided', 'pending']);
  const map: Record<string, { revenue: number; orders: number; emails: Set<string>; currency: string }> = {};

  for (const o of orders) {
    if (skipStatuses.has(o.status.toLowerCase())) continue;
    const date = o.ordered_at ? o.ordered_at.split('T')[0] : null;
    if (!date) continue;
    if (!map[date]) map[date] = { revenue: 0, orders: 0, emails: new Set(), currency: o.currency };
    map[date].revenue += o.amount;
    map[date].orders  += 1;
    if (o.customer_email) map[date].emails.add(o.customer_email);
  }

  return Object.entries(map).map(([date, m]) => ({
    client_id:       clientId,
    integration_id:  integrationId,
    date,
    revenue:         parseFloat(m.revenue.toFixed(2)),
    orders:          m.orders,
    customers:       m.emails.size,
    avg_order_value: m.orders > 0 ? parseFloat((m.revenue / m.orders).toFixed(2)) : 0,
    currency:        m.currency,
  }));
}

// ── Sync one integration (extracted for reuse by cron and manual trigger) ─────
async function syncIntegration(integrationId: string): Promise<{ synced_orders: number; synced_days: number }> {
  const { data: integration, error: intErr } = await supabaseAdmin
    .from('store_integrations').select('*').eq('id', integrationId).single<StoreIntegration>();
  if (intErr || !integration) throw new Error('Integration not found');

  // Date range: last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceISO = since.toISOString();

  // Fetch orders from platform
  let orders: NxOrder[] = [];
  if (integration.platform === 'woocommerce' || integration.platform === 'wordpress') {
    orders = await fetchWooCommerce(integration, sinceISO);
  } else if (integration.platform === 'shopify') {
    orders = await fetchShopify(integration, sinceISO);
  } else if (integration.platform === 'bigcommerce') {
    orders = await fetchBigCommerce(integration, sinceISO);
  } else {
    throw new Error(`Unsupported platform: ${integration.platform}`);
  }

  // Upsert individual orders
  if (orders.length > 0) {
    const orderRows = orders.map((o) => ({
      client_id:      integration.client_id,
      integration_id: integration.id,
      platform:       integration.platform,
      ...o,
    }));
    await supabaseAdmin.from('store_orders').upsert(orderRows, { onConflict: 'integration_id,external_id' });
  }

  // Upsert daily metrics
  const metrics = buildMetrics(orders, integration.id, integration.client_id);
  if (metrics.length > 0) {
    await supabaseAdmin.from('store_metrics').upsert(metrics, { onConflict: 'integration_id,date' });
  }

  // Update last_synced_at
  await supabaseAdmin.from('store_integrations')
    .update({ last_synced_at: new Date().toISOString() }).eq('id', integration.id);

  return { synced_orders: orders.length, synced_days: metrics.length };
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Allow pg_cron calls via a shared secret (no admin JWT required)
  const cronSecret = req.headers.get('x-cron-secret');
  const isCronCall = cronSecret !== null && cronSecret === Deno.env.get('CRON_SECRET');

  if (!isCronCall) {
    // Verify caller is an authenticated admin (manual trigger from admin UI)
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response('Unauthorized', { status: 401, headers: CORS });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: CORS });

    const { data: caller } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (caller?.role !== 'admin') return new Response('Forbidden', { status: 403, headers: CORS });
  }

  // Parse body (may be empty for cron calls)
  let body: { integration_id?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  // Cron mode: sync all active integrations
  if (isCronCall && !body.integration_id) {
    const { data: integrations } = await supabaseAdmin
      .from('store_integrations').select('id').eq('is_active', true);

    const results = await Promise.allSettled(
      (integrations ?? []).map((r: { id: string }) => syncIntegration(r.id))
    );

    const summary = results.map((r, i) =>
      r.status === 'fulfilled'
        ? { id: (integrations ?? [])[i].id, ...r.value }
        : { id: (integrations ?? [])[i].id, error: String((r as PromiseRejectedResult).reason) }
    );

    return new Response(
      JSON.stringify({ synced: summary }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // Single integration mode
  if (!body.integration_id) {
    return new Response(JSON.stringify({ error: 'integration_id required' }), { status: 400, headers: CORS });
  }

  try {
    const result = await syncIntegration(body.integration_id);
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === 'Integration not found' ? 404 : 502;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
  }
});
