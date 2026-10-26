'use client';

import { useState } from 'react';
import { hostOf } from '@/lib/portal';
import { timeAgo } from '@/lib/utils';
import type { StoreIntegration } from '@/lib/types';

type Platform = 'shopify' | 'woocommerce' | 'bigcommerce';

const GUIDE: Record<Platform, { name: string; domain: string; steps: string[] }> = {
  shopify: {
    name: 'Shopify', domain: 'shopify.com',
    steps: [
      'In Shopify admin, go to Settings → Apps and sales channels → Develop apps.',
      'Click “Create an app”, name it “NexaLab”.',
      'Under Configuration → Admin API scopes, tick read_orders and read_customers, then Save.',
      'Click “Install app”, then reveal and copy the Admin API access token (starts with shpat_).',
    ],
  },
  woocommerce: {
    name: 'WooCommerce', domain: 'woocommerce.com',
    steps: [
      'In WordPress, go to WooCommerce → Settings → Advanced → REST API.',
      'Click “Add key”, describe it as “NexaLab”, set Permissions to Read.',
      'Click “Generate API key” and copy the Consumer key and Consumer secret.',
    ],
  },
  bigcommerce: {
    name: 'BigCommerce', domain: 'bigcommerce.com',
    steps: [
      'In BigCommerce, go to Settings → Store-level API accounts → Create API account.',
      'Choose “V2/V3 API token”, name it “NexaLab”, and set Orders to read-only.',
      'Save, then copy the Access token. Your store hash is the code after /stores/ in the API path.',
    ],
  },
};

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/integrations/store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

export default function StoreConnect({ integration, clientId, asAdmin = false, onChange }: { integration: StoreIntegration | null; clientId: string; asAdmin?: boolean; onChange: () => void }) {
  const [platform, setPlatform] = useState<Platform>('shopify');
  const [f, setF] = useState({ storeUrl: '', accessToken: '', apiKey: '', apiSecret: '', storeHash: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const client = asAdmin ? clientId : undefined;

  async function run(body: Record<string, unknown>, ok: string) {
    setBusy(true); setMsg(null);
    try { await post({ ...body, client }); setMsg({ ok: true, text: ok }); onChange(); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }); }
    setBusy(false);
  }

  if (integration) {
    return (
      <section className="pt-card">
        <div className="pt-card-head">
          <div><h2 className="pt-card-title">Store connection</h2><p className="pt-card-sub">Orders sync automatically every 15 minutes.</p></div>
          <span className="pt-pill tone-lime"><span className="pt-dot is-live" />Connected</span>
        </div>
        <ul className="pt-list">
          <li className="pt-row"><span className="pt-row-main pt-muted">Platform</span><strong style={{ textTransform: 'capitalize' }}>{integration.platform}</strong></li>
          <li className="pt-row"><span className="pt-row-main pt-muted">Store</span><strong>{hostOf(integration.store_url)}</strong></li>
          <li className="pt-row"><span className="pt-row-main pt-muted">Last sync</span><strong>{integration.last_synced_at ? timeAgo(integration.last_synced_at) : 'In progress…'}</strong></li>
        </ul>
        {msg && <p className={msg.ok ? 'pt-success' : 'pt-error'} style={{ marginTop: '0.8rem' }}>{msg.text}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button className="pt-btn pt-btn-ghost pt-btn-sm" disabled={busy} onClick={() => run({ action: 'sync' }, 'Synced — new orders will appear in a moment.')}>{busy ? 'Working…' : 'Sync now'}</button>
          <button className="pt-btn pt-btn-danger pt-btn-sm" disabled={busy} onClick={() => window.confirm('Disconnect your store? Synced orders and daily figures will be removed from the portal.') && run({ action: 'disconnect' }, 'Store disconnected.')}>Disconnect</button>
        </div>
      </section>
    );
  }

  const g = GUIDE[platform];
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <section className="pt-card" id="connect-store">
      <h2 className="pt-card-title">Connect your store</h2>
      <p className="pt-card-sub" style={{ marginBottom: '1rem' }}>Read-only access — we can see orders, never change anything. Takes about 3 minutes.</p>

      <div className="pt-tabbar" role="tablist" aria-label="Store platform" style={{ marginBottom: '1rem' }}>
        {(Object.keys(GUIDE) as Platform[]).map((p) => (
          <button key={p} role="tab" aria-selected={platform === p} className={platform === p ? 'is-active' : ''} onClick={() => { setPlatform(p); setMsg(null); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${GUIDE[p].domain}&sz=32`} alt="" width={16} height={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />{GUIDE[p].name}
          </button>
        ))}
      </div>

      <ol className="pt-steps">
        {g.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>

      <form className="pt-form" style={{ marginTop: '1rem' }} onSubmit={(e) => { e.preventDefault(); run({ action: 'connect', platform, ...f }, `${g.name} connected — your first orders are syncing now.`); }}>
        {platform !== 'bigcommerce' && (
          <label className="pt-field">{platform === 'shopify' ? 'Store address' : 'Website address'}
            <input value={f.storeUrl} onChange={set('storeUrl')} placeholder={platform === 'shopify' ? 'yourstore.myshopify.com' : 'yourbrand.com'} autoComplete="off" />
          </label>
        )}
        {platform === 'woocommerce' ? (
          <div className="pt-form-row">
            <label className="pt-field">Consumer key<input value={f.apiKey} onChange={set('apiKey')} placeholder="ck_…" autoComplete="off" /></label>
            <label className="pt-field">Consumer secret<input type="password" value={f.apiSecret} onChange={set('apiSecret')} placeholder="cs_…" autoComplete="off" /></label>
          </div>
        ) : (
          <div className="pt-form-row">
            {platform === 'bigcommerce' && <label className="pt-field">Store hash<input value={f.storeHash} onChange={set('storeHash')} placeholder="abc123xyz" autoComplete="off" /></label>}
            <label className="pt-field">Access token<input type="password" value={f.accessToken} onChange={set('accessToken')} placeholder={platform === 'shopify' ? 'shpat_…' : ''} autoComplete="off" /></label>
          </div>
        )}
        {msg && <p className={msg.ok ? 'pt-success' : 'pt-error'}>{msg.text}</p>}
        <button className="pt-btn pt-btn-primary" disabled={busy} style={{ justifySelf: 'start' }}>{busy ? 'Checking & connecting…' : `Connect ${g.name}`}</button>
        <p className="pt-small pt-muted" style={{ margin: 0 }}>Your keys are stored encrypted at rest, are never shown again, and can be revoked from your store admin any time.</p>
      </form>
    </section>
  );
}
