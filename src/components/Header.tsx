'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authHref, setAuthHref] = useState('/auth');
  const [authLabel, setAuthLabel] = useState('Sign in');
  const [authPrimary, setAuthPrimary] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Don't render public header on dashboard/admin pages
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  if (isDashboard) return null;

  // Auth-aware nav button
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      setAuthHref(profile?.role === 'admin' ? '/admin' : '/dashboard');
      setAuthLabel('Dashboard');
      setAuthPrimary(true);
    });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        navRef.current &&
        !navRef.current.contains(e.target as Node) &&
        e.target !== btnRef.current
      ) {
        setMenuOpen(false);
      }
    }
    function handleResize() {
      if (window.innerWidth > 768) setMenuOpen(false);
    }
    document.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" href="/">NexaLab</Link>
        <button
          ref={btnRef}
          id="menu-toggle"
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          aria-label={menuOpen ? 'Close menu' : 'Menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          Menu
        </button>
        <nav
          ref={navRef}
          id="primary-nav"
          className={`nav-links${menuOpen ? ' open' : ''}`}
        >
          <Link href="/" className={isActive('/') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/platform" className={isActive('/platform') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Platform</Link>
          <Link href="/#pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link
            href={authHref}
            className={`btn btn-sm ${authPrimary ? 'btn-primary' : 'btn-outline'}`}
            id="nav-auth-btn"
            onClick={() => setMenuOpen(false)}
          >
            {authLabel}
          </Link>
          <Link href="/contact" className="btn btn-sm btn-primary" onClick={() => setMenuOpen(false)}>Book Demo</Link>
        </nav>
      </div>
    </header>
  );
}
