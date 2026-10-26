'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import Avatar from './Avatar';
import Icon from './Icon';

export type NavItem = { href: string; label: string; icon: string; badge?: number; tour?: string; mobile?: boolean };

type Props = {
  variant: 'client' | 'admin';
  nav: NavItem[];
  user: { name: string; sub: string; photo?: string | null };
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  sidebarExtra?: ReactNode;
  onTour?: () => void;
  helpHref?: string;
  children: ReactNode;
};

export default function PortalShell({ variant, nav, user, kicker, title, subtitle, actions, sidebarExtra, onTour, helpHref, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const base = variant === 'admin' ? '/admin' : '/dashboard';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`));

  async function signOut() {
    await createClient().auth.signOut();
    router.replace('/auth');
  }

  const sidebar = (
    <>
      <div className="pt-brand">
        <Link href={base} className="pt-logo" onClick={() => setOpen(false)}>
          <span className="pt-logo-mark" aria-hidden="true"><span /></span>NexaLab
        </Link>
        <span className={`pt-chip ${variant === 'admin' ? 'tone-lime' : ''}`}>{variant === 'admin' ? 'Admin' : 'Client portal'}</span>
        <button className="pt-icon-btn pt-drawer-close" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
      </div>

      <nav className="pt-nav" aria-label="Portal" data-tour="nav">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className={`pt-nav-item ${isActive(item.href) ? 'is-active' : ''}`} onClick={() => setOpen(false)} data-tour={item.tour}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.badge ? <em className="pt-badge">{item.badge}</em> : null}
          </Link>
        ))}
      </nav>

      {sidebarExtra}

      <div className="pt-side-foot">
        {onTour && (
          <button className="pt-side-link" onClick={() => { setOpen(false); onTour(); }} data-tour="help">
            <Icon name="sparkle" size={18} /> Take the tour
          </button>
        )}
        <Link href={helpHref ?? '/support'} className="pt-side-link" onClick={() => setOpen(false)}>
          <Icon name="help" size={18} /> Get help
        </Link>
        <Link href="/" className="pt-side-link" onClick={() => setOpen(false)}>
          <Icon name="globe" size={18} /> nexalab.studio
        </Link>
        <div className="pt-user">
          <Avatar name={user.name} src={user.photo} size={36} />
          <div><strong>{user.name}</strong><span>{user.sub}</span></div>
          <button className="pt-icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" size={18} /></button>
        </div>
      </div>
    </>
  );

  const tabs = nav.filter((n) => n.mobile).slice(0, 4);

  return (
    <div className={`pt pt-${variant}`}>
      <aside className="pt-sidebar">{sidebar}</aside>

      {open && <button className="pt-backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <aside className={`pt-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>{sidebar}</aside>

      <div className="pt-main">
        <header className="pt-mobilebar">
          <Link href={base} className="pt-logo"><span className="pt-logo-mark" aria-hidden="true"><span /></span>NexaLab</Link>
          <button className="pt-icon-btn" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Icon name="menu" /></button>
        </header>

        <div className="pt-page">
          <div className="pt-head">
            <div className="pt-head-text">
              {kicker && <p className="pt-kicker">{kicker}</p>}
              <h1 className="pt-title">{title}</h1>
              {subtitle && <p className="pt-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="pt-head-actions">{actions}</div>}
          </div>
          {children}
        </div>
      </div>

      {tabs.length > 0 && (
        <nav className="pt-tabs" aria-label="Quick navigation" data-tour="tabs">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={isActive(t.href) ? 'is-active' : ''}>
              <span className="pt-tab-icon"><Icon name={t.icon} size={22} />{t.badge ? <em className="pt-badge">{t.badge}</em> : null}</span>
              {t.label}
            </Link>
          ))}
          <button onClick={() => setOpen(true)} aria-label="More">
            <span className="pt-tab-icon"><Icon name="menu" size={22} /></span>More
          </button>
        </nav>
      )}
    </div>
  );
}
