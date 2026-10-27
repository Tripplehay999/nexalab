'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { hostOf, normalizeUrl } from '@/lib/portal';
import Icon from './Icon';

type Status = { status: 'up' | 'down'; ms?: number } | null;

const PLATFORM_LABEL: Record<string, string> = {
  shopify: 'Shopify', woocommerce: 'WooCommerce', bigcommerce: 'BigCommerce', magento: 'Magento', custom: 'Custom-built', none: 'No store yet', other: 'Other',
};

// Fallback when the server can't check (e.g. the site blocks bots): an opaque
// browser request resolves if the site answers at all and rejects if unreachable.
async function browserCheck(url: string): Promise<Status> {
  const started = performance.now();
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return { status: 'up', ms: Math.round(performance.now() - started) };
  } catch {
    return null; // inconclusive in the browser (CORS/extensions) — don't claim it's down
  }
}

const shotUrl = (url: string, attempt: number) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=800&h=500${attempt ? `&r=${attempt}` : ''}`;

// Live preview + uptime check of a client's website.
export default function WebsiteCard({ website, platform, clientId, editHref, audience = 'client' }: { website?: string | null; platform?: string | null; clientId?: string; editHref?: string; audience?: 'client' | 'admin' }) {
  const [status, setStatus] = useState<Status | 'checking'>('checking');
  const [attempt, setAttempt] = useState(0);
  const [shotReady, setShotReady] = useState(false);
  const host = hostOf(website);
  const url = host ? normalizeUrl(website!) : '';

  useEffect(() => {
    if (!host) return;
    let cancelled = false;
    fetch(`/api/site-status${clientId ? `?client=${clientId}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(async (s: { status: string; ms?: number }) => {
        const result: Status = s.status === 'up' || s.status === 'down' ? { status: s.status, ms: s.ms } : await browserCheck(url);
        if (!cancelled) setStatus(result);
      })
      .catch(async () => { const r = await browserCheck(url); if (!cancelled) setStatus(r); });
    return () => { cancelled = true; };
  }, [host, clientId, url]);

  // mShots returns a small "generating" placeholder the first time it sees a site;
  // detect it by size and retry a few times.
  function onShotLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (img.naturalWidth >= 700) { setShotReady(true); return; }
    if (attempt < 4) setTimeout(() => setAttempt((a) => a + 1), 4000);
  }

  if (!host) {
    return (
      <div className="pt-card" data-tour="website">
        <div className="pt-card-head"><h2 className="pt-card-title">{audience === 'admin' ? 'Website' : 'Your website'}</h2></div>
        <div className="pt-empty">
          <span className="pt-empty-icon">🌐</span>
          {audience === 'admin'
            ? <p>This client hasn’t added their website yet. You can set it in Website details below.</p>
            : <p>Add your store’s address and we’ll show a live preview and keep an eye on whether it’s online.</p>}
          {editHref && audience === 'client' && <Link href={editHref} className="pt-btn pt-btn-ghost pt-btn-sm">Add your website</Link>}
        </div>
      </div>
    );
  }

  const pill = status === 'checking'
    ? <span className="pt-pill"><span className="pt-dot is-unknown" />Checking…</span>
    : status === null ? null
      : <span className={`pt-pill ${status.status === 'up' ? 'tone-lime' : 'tone-rose'}`}><span className={`pt-dot ${status.status === 'up' ? 'is-live' : 'is-down'}`} />{status.status === 'up' ? 'Online' : 'Not responding'}</span>;

  return (
    <div className="pt-card" data-tour="website">
      <div className="pt-card-head">
        <div>
          <h2 className="pt-card-title">{audience === 'admin' ? 'Website' : 'Your website'}</h2>
          <p className="pt-card-sub">{PLATFORM_LABEL[platform ?? ''] ?? (platform || 'Platform not set')}</p>
        </div>
        {pill}
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="pt-site-shot" aria-label={`Open ${host}`}>
        {/* WordPress mShots: free, cached homepage screenshots */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={attempt} src={shotUrl(url, attempt)} alt={`Preview of ${host}`} loading="lazy" onLoad={onShotLoad} style={{ opacity: shotReady ? 1 : 0 }} />
        {!shotReady && <span className="pt-site-generating"><span className="pt-loading-dot" /> {attempt >= 4 ? 'Preview coming soon' : 'Generating preview…'}</span>}
        <div className="pt-site-bar"><i /><i /><i /><span>{host}</span></div>
      </a>
      <div className="pt-row" style={{ borderTop: 0, paddingBottom: 0 }}>
        <div className="pt-row-main">
          <p className="pt-row-title">{host}</p>
          <p className="pt-row-sub">{status && status !== 'checking' && status.ms ? `Responded in ${(status.ms / 1000).toFixed(2)}s` : 'Checked each time this page opens'}</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="pt-btn pt-btn-ghost pt-btn-sm">Visit <Icon name="external" size={15} /></a>
      </div>
    </div>
  );
}
