'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { hostOf, normalizeUrl } from '@/lib/portal';
import Icon from './Icon';

type Status = { status: 'up' | 'down' | 'unknown'; code?: number; ms?: number };

const PLATFORM_LABEL: Record<string, string> = {
  shopify: 'Shopify', woocommerce: 'WooCommerce', bigcommerce: 'BigCommerce', magento: 'Magento', custom: 'Custom-built', none: 'No store yet', other: 'Other',
};

// Live preview + uptime check of a client's website.
export default function WebsiteCard({ website, platform, clientId, editHref }: { website?: string | null; platform?: string | null; clientId?: string; editHref?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const host = hostOf(website);

  useEffect(() => {
    if (!host) return;
    let cancelled = false;
    fetch(`/api/site-status${clientId ? `?client=${clientId}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((s: Status) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ status: 'unknown' }); });
    return () => { cancelled = true; };
  }, [host, clientId]);

  if (!host) {
    return (
      <div className="pt-card" data-tour="website">
        <div className="pt-card-head"><h2 className="pt-card-title">Your website</h2></div>
        <div className="pt-empty">
          <span className="pt-empty-icon">🌐</span>
          <p>Add your store’s address and we’ll show a live preview and keep an eye on whether it’s online.</p>
          {editHref && <Link href={editHref} className="pt-btn pt-btn-ghost pt-btn-sm">Add your website</Link>}
        </div>
      </div>
    );
  }

  const url = normalizeUrl(website!);
  const label = status === null ? 'Checking…' : status.status === 'up' ? 'Online' : status.status === 'down' ? 'Not responding' : 'Status unknown';
  const dot = status?.status === 'up' ? 'is-live' : status?.status === 'down' ? 'is-down' : 'is-unknown';

  return (
    <div className="pt-card" data-tour="website">
      <div className="pt-card-head">
        <div>
          <h2 className="pt-card-title">Your website</h2>
          <p className="pt-card-sub">{PLATFORM_LABEL[platform ?? ''] ?? (platform || 'Platform not set')}</p>
        </div>
        <span className="pt-pill"><span className={`pt-dot ${dot}`} />{label}</span>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="pt-site-shot" aria-label={`Open ${host}`}>
        {/* WordPress mShots: free, cached homepage screenshots */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=800&h=500`} alt={`Preview of ${host}`} loading="lazy" />
        <div className="pt-site-bar"><i /><i /><i /><span>{host}</span></div>
      </a>
      <div className="pt-row" style={{ borderTop: 0, paddingBottom: 0 }}>
        <div className="pt-row-main">
          <p className="pt-row-title">{host}</p>
          <p className="pt-row-sub">{status?.ms ? `Responded in ${(status.ms / 1000).toFixed(2)}s` : 'Checked each time you open your dashboard'}</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="pt-btn pt-btn-ghost pt-btn-sm">Visit <Icon name="external" size={15} /></a>
      </div>
    </div>
  );
}
