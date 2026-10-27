import { NextResponse } from 'next/server';
import { adminOrError, getActor, hashKey } from '@/lib/integrations';
import { isPublicHost } from '@/lib/net';
import { randomBytes } from 'node:crypto';

// Connect / sync / disconnect a client's store (Shopify, WooCommerce, BigCommerce).
// Credentials are tested against the platform before saving, stored in
// store_integrations (secret columns are not readable from the browser), and the
// existing `sync-store` Edge Function pulls orders + daily metrics.
//   POST { action: 'connect', platform, storeUrl, accessToken?, apiKey?, apiSecret?, storeHash?, client? }
//   POST { action: 'connect-custom' | 'rotate-key', client? }  — custom-built sites: order webhook
//   POST { action: 'sync' | 'disconnect', client? }

const cleanDomain = (v: string) => v.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();

async function testCredentials(b: Record<string, string>) {
  let host = cleanDomain(b.storeUrl ?? '');
  if (b.platform === 'shopify' && host && !host.includes('.')) host = `${host}.myshopify.com`;
  if (b.platform !== 'bigcommerce' && !isPublicHost(host)) throw new Error('Enter your store’s public web address.');
  if (b.platform === 'shopify') {
    let shop = cleanDomain(b.storeUrl);
    if (!shop.includes('.')) shop = `${shop}.myshopify.com`;
    const res = await fetch(`https://${shop}/admin/api/2024-10/shop.json`, { headers: { 'X-Shopify-Access-Token': b.accessToken } });
    if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'Shopify rejected that access token — check it has the read_orders scope.' : 'Couldn’t reach that Shopify store. Use your .myshopify.com address.');
    return { store_url: `https://${shop}`, access_token: b.accessToken };
  }
  if (b.platform === 'woocommerce') {
    const base = `https://${cleanDomain(b.storeUrl)}`;
    const auth = Buffer.from(`${b.apiKey}:${b.apiSecret}`).toString('base64');
    const res = await fetch(`${base}/wp-json/wc/v3/orders?per_page=1`, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error(res.status === 401 ? 'WooCommerce rejected those keys — make sure they have Read access.' : 'Couldn’t reach WooCommerce at that address.');
    return { store_url: base, api_key: b.apiKey, api_secret: b.apiSecret };
  }
  if (b.platform === 'bigcommerce') {
    const hash = b.storeHash.trim();
    const res = await fetch(`https://api.bigcommerce.com/stores/${encodeURIComponent(hash)}/v2/store`, { headers: { 'X-Auth-Token': b.accessToken, Accept: 'application/json' } });
    if (!res.ok) throw new Error('BigCommerce rejected that store hash or access token.');
    const store = await res.json().catch(() => ({}));
    return { store_url: store.secure_url || `https://${cleanDomain(b.storeUrl || store.domain || '')}`, store_hash: hash, access_token: b.accessToken };
  }
  throw new Error('Choose a platform.');
}

// Custom sites authenticate to /api/ingest/orders with this key; only its hash is stored.
const newIngestKey = () => `nxk_${randomBytes(24).toString('hex')}`;

async function triggerSync(integrationId: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-store`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ integration_id: integrationId }),
  });
  return res.ok;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const actor = await getActor(body.client);
  if ('error' in actor) return actor.error;
  const db = adminOrError();
  if ('error' in db) return db.error;

  const { data: existing } = await db.db.from('store_integrations').select('id').eq('client_id', actor.clientId).maybeSingle();

  if (body.action === 'connect') {
    const required = body.platform === 'woocommerce' ? ['storeUrl', 'apiKey', 'apiSecret'] : body.platform === 'bigcommerce' ? ['storeHash', 'accessToken'] : ['storeUrl', 'accessToken'];
    if (required.some((k) => !String(body[k] ?? '').trim())) return NextResponse.json({ error: 'Please fill in every field.' }, { status: 400 });
    let creds: Record<string, string | undefined>;
    try { creds = await testCredentials(body); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Those details didn’t work.' }, { status: 400 }); }

    const row = { client_id: actor.clientId, platform: body.platform, is_active: true, api_key: null, api_secret: null, access_token: null, store_hash: null, ...creds };
    const { data: saved, error } = existing
      ? await db.db.from('store_integrations').update(row).eq('id', existing.id).select('id').single()
      : await db.db.from('store_integrations').insert(row).select('id').single();
    if (error || !saved) return NextResponse.json({ error: 'Couldn’t save the connection.' }, { status: 500 });
    const synced = await triggerSync(saved.id);
    return NextResponse.json({ ok: true, synced });
  }

  if (body.action === 'connect-custom' || body.action === 'rotate-key') {
    const key = newIngestKey();
    const { data: profile } = await db.db.from('profiles').select('website').eq('id', actor.clientId).single();
    const row = { client_id: actor.clientId, platform: 'custom', store_url: profile?.website || 'custom-site', api_key: hashKey(key), api_secret: null, access_token: null, store_hash: null, is_active: true };
    const { error } = existing
      ? await db.db.from('store_integrations').update(body.action === 'rotate-key' ? { api_key: row.api_key } : row).eq('id', existing.id)
      : await db.db.from('store_integrations').insert(row);
    if (error) return NextResponse.json({ error: 'Couldn’t create the webhook.' }, { status: 500 });
    const origin = new URL(request.url).origin;
    return NextResponse.json({ ok: true, key, endpoint: `${origin}/api/ingest/orders` });
  }

  if (!existing) return NextResponse.json({ error: 'No store connected.' }, { status: 404 });

  if (body.action === 'sync') {
    const { data: integ } = await db.db.from('store_integrations').select('platform').eq('id', existing.id).single();
    if (integ?.platform === 'custom') return NextResponse.json({ ok: true }); // custom sites push orders to us
    const ok = await triggerSync(existing.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Sync failed — the store may have revoked access.' }, { status: 502 });
  }

  if (body.action === 'disconnect') {
    // Removes the credentials and the synced orders/metrics (cascade).
    await db.db.from('store_integrations').delete().eq('id', existing.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
