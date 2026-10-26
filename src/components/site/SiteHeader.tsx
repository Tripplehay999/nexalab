'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { JOBS } from '@/lib/jobs';

const NAV = [
  { href: '/services', label: 'What we do' },
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
  { href: '/careers', label: 'Careers' },
  { href: '/support', label: 'Support' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [auth, setAuth] = useState({ href: '/auth', label: 'Client login' });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setAuth({ href: profile?.role === 'admin' ? '/admin' : '/dashboard', label: 'Dashboard' });
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <Link href="/careers" className="announce">
        <span className="announce-tag">We’re hiring</span>
        <span>{JOBS.length} open roles on a team that ships every week</span>
        <span aria-hidden="true">→</span>
      </Link>
      <header className={`s-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="wrap s-header-row">
          <Link href="/" className="logo" onClick={() => setOpen(false)}>
            <span className="logo-mark" aria-hidden="true"><span /></span>
            NexaLab
          </Link>

          <nav className={`s-nav ${open ? 'is-open' : ''}`} id="site-nav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={isActive(n.href) ? 'is-active' : ''} onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className="s-nav-cta">
              <Link href={auth.href} className="s-btn s-btn-ghost" onClick={() => setOpen(false)}>{auth.label}</Link>
              <Link href="/auth?mode=signup" className="s-btn s-btn-ink" onClick={() => setOpen(false)}>Start a project</Link>
            </div>
          </nav>

          <button
            className={`s-burger ${open ? 'is-open' : ''}`}
            aria-expanded={open}
            aria-controls="site-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span /><span />
          </button>
        </div>
      </header>
    </>
  );
}
