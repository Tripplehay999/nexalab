'use client';

import { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile "I'm human" check + a honeypot field. Renders nothing visible
// when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set (the honeypot still works).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export const humanCheckEnabled = Boolean(SITE_KEY);

/** Hidden honeypot input — bots fill it, humans never see it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
      <label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label>
    </div>
  );
}

export default function HumanCheck({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY, theme: 'light', appearance: 'interaction-only',
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    }).catch(() => setFailed(true));
    return () => { cancelled = true; if (widgetId && window.turnstile) window.turnstile.remove(widgetId); };
  }, [onToken, resetKey]);

  if (!SITE_KEY) return null;
  return (
    <div>
      <div ref={ref} />
      {failed && <p className="error-text">Couldn’t load the security check — please disable content blockers for this page and refresh.</p>}
    </div>
  );
}
