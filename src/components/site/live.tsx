'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { SUPPORT_HOURS } from '@/lib/site-data';

function partsIn(timeZone: string, date: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { day, hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
}

// One shared 15s clock for every live widget. The server snapshot is null so
// the first client render matches the static HTML, then switches to real time.
let clockNow = typeof window === 'undefined' ? 0 : Date.now();
function subscribeClock(onChange: () => void) {
  const id = setInterval(() => { clockNow = Date.now(); onChange(); }, 15_000);
  return () => clearInterval(id);
}

function useNow() {
  const ts = useSyncExternalStore(subscribeClock, () => clockNow, () => 0);
  return ts ? new Date(ts) : null;
}

export function useSupportOpen() {
  const now = useNow();
  if (!now) return null;
  const { day, hour } = partsIn(SUPPORT_HOURS.timeZone, now);
  const hours = SUPPORT_HOURS.days[day];
  return !!hours && hour >= hours[0] && hour < hours[1];
}

export function LiveStatus({ openText = 'Support is online', closedText = 'We’re offline — back soon', className = '' }: { openText?: string; closedText?: string; className?: string }) {
  const open = useSupportOpen();
  return (
    <span className={`live-pill ${open === false ? 'is-closed' : ''} ${className}`}>
      <span className="live-dot" aria-hidden="true" />
      {open === null ? 'Checking the studio…' : open ? openText : closedText}
    </span>
  );
}

export function LiveClock({ timeZone, className = '' }: { timeZone: string; className?: string }) {
  const now = useNow();
  const text = now
    ? new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(now)
    : '--:--';
  return <span className={className} suppressHydrationWarning>{text}</span>;
}

export function CountUp({ to, prefix = '', suffix = '', decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [value, setValue] = useState(0);
  const [el, setEl] = useState<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (ts: number) => {
        const p = Math.min((ts - start) / 1400, 1);
        setValue((1 - Math.pow(1 - p, 3)) * to);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, to]);

  return <span ref={setEl}>{prefix}{value.toFixed(decimals)}{suffix}</span>;
}
