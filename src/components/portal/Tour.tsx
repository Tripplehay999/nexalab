'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export type TourStep = { target?: string; title: string; body: string };

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(target?: string): HTMLElement | null {
  if (!target) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  return els.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }) ?? null;
}

// Guided walkthrough: dims the page, spotlights one element at a time, and explains it.
// Steps whose target isn't on screen (e.g. sidebar on phones) are skipped automatically.
export default function Tour({ steps, onClose }: { steps: TourStep[]; onClose: (completed: boolean) => void }) {
  // Resolved once when the tour opens (it only mounts in the browser, after the page has rendered).
  const [visible] = useState<TourStep[]>(() => steps.filter((s) => !s.target || findTarget(s.target)));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = visible[i];

  const measure = useCallback(() => {
    const el = findTarget(step?.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    const el = findTarget(step?.target);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [step, measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, visible.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, visible.length]);

  if (!step) return null;
  const last = i === visible.length - 1;
  const PAD = 8;

  // Tooltip below the spotlight if there's room, otherwise above; centred when no target.
  let cardStyle: React.CSSProperties = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(360, vw - 32);
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - w / 2), vw - w - 16);
    const below = rect.top + rect.height + PAD + 16;
    cardStyle = below + 220 < vh
      ? { top: below, left, width: w }
      : { top: Math.max(16, rect.top - PAD - 16), left, width: w, transform: 'translateY(-100%)' };
  }

  return (
    <div className="pt-tour" role="dialog" aria-modal="true" aria-label="Portal tour">
      {rect ? (
        <div className="pt-tour-spot" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      ) : (
        <div className="pt-tour-dim" />
      )}
      <div className="pt-tour-card" style={cardStyle}>
        <p className="pt-tour-count">{i + 1} of {visible.length}</p>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="pt-tour-actions">
          <button className="pt-link" onClick={() => onClose(false)}>Skip tour</button>
          <span>
            {i > 0 && <button className="pt-btn pt-btn-ghost" onClick={() => setI(i - 1)}>Back</button>}
            <button className="pt-btn pt-btn-primary" onClick={() => (last ? onClose(true) : setI(i + 1))}>{last ? 'Got it' : 'Next'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}
