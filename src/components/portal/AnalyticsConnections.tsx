'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { METRICS, metricDef } from '@/lib/portal';
import { timeAgo } from '@/lib/utils';

type Connection = {
  id: string; provider: string; property_id: string | null; property_label: string | null;
  status: string; last_synced_at: string | null; last_error: string | null;
};

const GA_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Google Analytics is connected — your numbers are syncing.' },
  'choose-property': { ok: true, text: 'Almost there — choose which Google Analytics property to sync.' },
  cancelled: { ok: false, text: 'Google sign-in was cancelled.' },
  expired: { ok: false, text: 'That sign-in link expired — please try connecting again.' },
  failed: { ok: false, text: 'We couldn’t connect to Google Analytics. Please try again.' },
  'no-properties': { ok: false, text: 'That Google account doesn’t have any GA4 properties. Try a different account.' },
  'not-configured': { ok: false, text: 'Google Analytics connections aren’t switched on yet — your team has been notified.' },
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || 'Something went wrong');
  return json;
}

// Connect analytics tools (GA4, Plausible) or import a CSV. Used by clients on
// Insights and by admins on a client's Insights tab (pass `asAdmin`).
export default function AnalyticsConnections({ clientId, asAdmin = false, onChange }: { clientId: string; asAdmin?: boolean; onChange: () => void }) {
  const [conns, setConns] = useState<Connection[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [properties, setProperties] = useState<{ id: string; label: string }[] | null>(null);
  const [pick, setPick] = useState('');
  const [plausible, setPlausible] = useState({ open: false, siteId: '', apiKey: '' });
  const [csv, setCsv] = useState({ metric: 'revenue' });
  const fileRef = useRef<HTMLInputElement>(null);

  const ga = conns?.find((c) => c.provider === 'google_analytics');
  const pl = conns?.find((c) => c.provider === 'plausible');

  async function load() {
    const { data } = await createClient().from('analytics_connections').select('*').eq('client_id', clientId);
    setConns((data ?? []) as Connection[]);
    return (data ?? []) as Connection[];
  }

  useEffect(() => {
    let cancelled = false;
    createClient().from('analytics_connections').select('*').eq('client_id', clientId)
      .then(({ data }) => { if (!cancelled) setConns((data ?? []) as Connection[]); });
    const ga = new URLSearchParams(window.location.search).get('ga');
    if (ga && GA_MESSAGES[ga]) {
      const t = setTimeout(() => setMsg(GA_MESSAGES[ga]), 0);
      return () => { cancelled = true; clearTimeout(t); };
    }
    return () => { cancelled = true; };
  }, [clientId]);

  // A pending GA connection needs a property chosen.
  useEffect(() => {
    if (!ga || ga.status !== 'pending') return;
    let cancelled = false;
    fetch(`/api/integrations/google/properties?connection=${ga.id}`).then((r) => r.json()).then((j) => {
      if (cancelled) return;
      if (j.properties) { setProperties(j.properties); setPick(j.properties[0]?.id ?? ''); } else setMsg({ ok: false, text: j.error || 'Couldn’t load properties' });
    });
    return () => { cancelled = true; };
  }, [ga]);

  async function run(key: string, fn: () => Promise<unknown>, okText: string) {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); onChange(); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }); }
    await load();
    setBusy(null);
  }

  const connectGoogle = () => { window.location.href = `/api/integrations/google/start${asAdmin ? `?client=${clientId}` : ''}`; };

  async function importCsv(file: File) {
    const text = await file.text();
    const rows: { period: string; value: number; note: string | null }[] = [];
    for (const line of text.split(/\r?\n/)) {
      const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cells.length < 2) continue;
      const raw = cells[0];
      const value = Number(cells[1].replace(/[$,%\s]/g, ''));
      let period = '';
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(raw)) period = raw.length === 7 ? `${raw}-01` : raw;
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) { const [m, d, y] = raw.split('/'); period = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
      if (!period || Number.isNaN(value)) continue; // skips the header row and blanks
      rows.push({ period, value, note: cells[2] || null });
    }
    if (!rows.length) throw new Error('No rows found. Use two columns: date (YYYY-MM-DD) and value.');
    const { error } = await createClient().from('client_metrics').insert(rows.map((r) => ({
      ...r, client_id: clientId, metric: csv.metric, source: asAdmin ? 'nexalab' : 'manual',
    })));
    if (error) throw new Error('Couldn’t import — please check the file and try again.');
    return rows.length;
  }

  const statusPill = (c: Connection) => (
    <span className={`pt-pill ${c.status === 'active' ? 'tone-lime' : c.status === 'error' ? 'tone-rose' : 'tone-sun'}`}>
      {c.status === 'active' ? 'Connected' : c.status === 'error' ? 'Needs attention' : 'Choose property'}
    </span>
  );

  return (
    <section className="pt-card" id="connections">
      <h2 className="pt-card-title">Connect your analytics</h2>
      <p className="pt-card-sub" style={{ marginBottom: '1rem' }}>Link your tools once and your numbers update on their own every day.</p>
      {msg && <p className={msg.ok ? 'pt-success' : 'pt-error'} style={{ marginBottom: '0.8rem' }}>{msg.text}</p>}

      <ul className="pt-list">
        {/* Google Analytics */}
        <li className="pt-row" style={{ display: 'block' }}>
          <div className="pt-person">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.google.com/s2/favicons?domain=analytics.google.com&sz=64" alt="" width={36} height={36} className="pt-row-icon" style={{ padding: 7 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>Google Analytics 4</strong>
              <span>{ga?.property_label ?? 'Visitors, orders, revenue & conversion'}</span>
            </div>
            {ga ? statusPill(ga) : <button className="pt-btn pt-btn-primary pt-btn-sm" onClick={connectGoogle}>Connect</button>}
          </div>
          {ga?.status === 'pending' && (
            <div className="pt-form" style={{ marginTop: '0.8rem' }}>
              {properties === null ? <p className="pt-muted pt-small" style={{ margin: 0 }}>Loading your properties…</p> : (
                <>
                  <label className="pt-field">Which property is your store?
                    <select value={pick} onChange={(e) => setPick(e.target.value)}>{properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
                  </label>
                  <button className="pt-btn pt-btn-primary pt-btn-sm" style={{ justifySelf: 'start' }} disabled={busy === 'ga'} onClick={() => run('ga', () => post('/api/integrations/connection', { id: ga.id, action: 'select-property', propertyId: pick }), 'Synced from Google Analytics.')}>
                    {busy === 'ga' ? 'Syncing…' : 'Use this property'}
                  </button>
                </>
              )}
            </div>
          )}
          {ga && ga.status !== 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
              <span className="pt-small pt-muted" style={{ flex: 1 }}>{ga.status === 'error' ? ga.last_error : ga.last_synced_at ? `Synced ${timeAgo(ga.last_synced_at)} · updates daily` : 'Waiting for first sync'}</span>
              {ga.status === 'error' && <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={connectGoogle}>Reconnect</button>}
              <button className="pt-btn pt-btn-ghost pt-btn-sm" disabled={busy === 'ga'} onClick={() => run('ga', () => post('/api/integrations/connection', { id: ga.id, action: 'sync' }), 'Synced from Google Analytics.')}>{busy === 'ga' ? 'Syncing…' : 'Sync now'}</button>
              <button className="pt-link pt-small" onClick={() => window.confirm('Disconnect Google Analytics? Numbers already synced will stay.') && run('ga', () => post('/api/integrations/connection', { id: ga.id, action: 'disconnect' }), 'Google Analytics disconnected.')}>Disconnect</button>
            </div>
          )}
        </li>

        {/* Plausible */}
        <li className="pt-row" style={{ display: 'block' }}>
          <div className="pt-person">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.google.com/s2/favicons?domain=plausible.io&sz=64" alt="" width={36} height={36} className="pt-row-icon" style={{ padding: 7 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>Plausible</strong>
              <span>{pl?.property_label ?? 'Privacy-friendly visitor stats'}</span>
            </div>
            {pl ? statusPill(pl) : <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={() => setPlausible({ ...plausible, open: !plausible.open })}>{plausible.open ? 'Cancel' : 'Connect'}</button>}
          </div>
          {!pl && plausible.open && (
            <form className="pt-form" style={{ marginTop: '0.8rem' }} onSubmit={(e) => { e.preventDefault(); run('pl', () => post('/api/integrations/plausible', { siteId: plausible.siteId, apiKey: plausible.apiKey, client: asAdmin ? clientId : undefined }), 'Plausible connected and synced.'); }}>
              <label className="pt-field">Site domain<input value={plausible.siteId} onChange={(e) => setPlausible({ ...plausible, siteId: e.target.value })} placeholder="yourbrand.com" /></label>
              <label className="pt-field">API key <a href="https://plausible.io/settings/api-keys" target="_blank" rel="noopener noreferrer" className="pt-link pt-small">Get one</a><input type="password" value={plausible.apiKey} onChange={(e) => setPlausible({ ...plausible, apiKey: e.target.value })} autoComplete="off" /></label>
              <button className="pt-btn pt-btn-primary pt-btn-sm" style={{ justifySelf: 'start' }} disabled={busy === 'pl'}>{busy === 'pl' ? 'Connecting…' : 'Connect Plausible'}</button>
            </form>
          )}
          {pl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
              <span className="pt-small pt-muted" style={{ flex: 1 }}>{pl.status === 'error' ? pl.last_error : pl.last_synced_at ? `Synced ${timeAgo(pl.last_synced_at)} · updates daily` : 'Waiting for first sync'}</span>
              <button className="pt-btn pt-btn-ghost pt-btn-sm" disabled={busy === 'pl'} onClick={() => run('pl', () => post('/api/integrations/connection', { id: pl.id, action: 'sync' }), 'Synced from Plausible.')}>{busy === 'pl' ? 'Syncing…' : 'Sync now'}</button>
              <button className="pt-link pt-small" onClick={() => window.confirm('Disconnect Plausible?') && run('pl', () => post('/api/integrations/connection', { id: pl.id, action: 'disconnect' }), 'Plausible disconnected.')}>Disconnect</button>
            </div>
          )}
        </li>

        {/* CSV import */}
        <li className="pt-row" style={{ display: 'block' }}>
          <div className="pt-person">
            <span className="pt-row-icon">📄</span>
            <div style={{ flex: 1, minWidth: 0 }}><strong>Import a CSV</strong><span>From Shopify, Stripe, Klaviyo, Meta — any export</span></div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.7rem', alignItems: 'center' }}>
            <select className="pt-input" value={csv.metric} onChange={(e) => setCsv({ metric: e.target.value })} style={{ width: 'auto', flex: 1, minWidth: 140 }} aria-label="Metric to import">
              {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <button className="pt-btn pt-btn-ghost pt-btn-sm" disabled={busy === 'csv'} onClick={() => fileRef.current?.click()}>{busy === 'csv' ? 'Importing…' : 'Choose file'}</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) { setBusy('csv'); setMsg(null); importCsv(f).then((n) => { setMsg({ ok: true, text: `Imported ${n} ${metricDef(csv.metric).label.toLowerCase()} entries.` }); onChange(); }).catch((err: Error) => setMsg({ ok: false, text: err.message })).finally(() => setBusy(null)); }
            }} />
          </div>
          <p className="pt-small pt-muted" style={{ margin: '0.45rem 0 0' }}>Two columns: <code>date</code> (2026-09-01) and <code>value</code>. An optional third column becomes a note.</p>
        </li>
      </ul>

      {!asAdmin && (
        <p className="pt-small pt-muted" style={{ margin: '0.9rem 0 0' }}>
          Use Shopify, Stripe, or Klaviyo? <Link href="/dashboard/support" className="pt-link">Ask your team</Link> to connect them for you.
        </p>
      )}
    </section>
  );
}
