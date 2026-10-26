'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CONTACT, SUPPORT_TEAM, person, photo } from '@/lib/site-data';
import { useSupportOpen } from './live';

export default function SupportBubble() {
  const [open, setOpen] = useState(false);
  const online = useSupportOpen();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`bubble ${open ? 'is-open' : ''}`}>
      <div className="bubble-panel" role="dialog" aria-label="Talk to NexaLab" hidden={!open}>
        <div className="bubble-head">
          <div className="face-stack">
            {SUPPORT_TEAM.slice(1, 4).map((p) => (
              <Image key={p.name} src={photo(p.photo, 96, 96)} alt={p.name} width={40} height={40} />
            ))}
          </div>
          <p className="bubble-hi">Hi there 👋</p>
          <p className="bubble-sub">
            {online === false
              ? 'We’re offline right now. Leave a message and we’ll reply first thing.'
              : 'Real people, usually replying in under 10 minutes.'}
          </p>
        </div>
        <div className="bubble-links">
          <Link href="/contact" onClick={() => setOpen(false)}>
            <strong>Start a new project</strong><span>Tell us what you’re building</span>
          </Link>
          <Link href="/support" onClick={() => setOpen(false)}>
            <strong>Get help with my store</strong><span>Support for current clients</span>
          </Link>
          <a href={`mailto:${CONTACT.support}`}>
            <strong>Email us</strong><span>{CONTACT.support}</span>
          </a>
          <a href={CONTACT.phoneHref}>
            <strong>Call the studio</strong><span>{CONTACT.phone}</span>
          </a>
        </div>
      </div>
      <button className="bubble-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close help' : 'Talk to us'}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <>
            <Image src={photo(person('Sofia Marchetti').photo, 96, 96)} alt="" width={34} height={34} />
            <span>Talk to us</span>
            <span className={`bubble-dot ${online === false ? 'is-off' : ''}`} aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}
