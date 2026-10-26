'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/admin',            label: 'Overview' },
  { href: '/admin/clients',    label: 'Clients' },
  { href: '/admin/inquiries',  label: 'Inquiries' },
  { href: '/admin/pending',    label: 'Pending Projects' },
  { href: '/admin/tickets',    label: 'Tickets' },
];

interface Props { initials: string; adminName: string; isOpen: boolean; onClose?: () => void; }

export default function AdminSidebar({ initials, adminName, isOpen, onClose }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  return (
    <>
    {isOpen && <button className="dash-backdrop" onClick={onClose} aria-label="Close menu" />}
    <aside className={`dash-sidebar${isOpen ? ' is-open' : ''}`} id="dash-sidebar">
      <button className="dash-close-btn" onClick={onClose} aria-label="Close menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="dash-brand">
        <Link href="/" className="brand">NexaLab</Link>
        <span className="dash-portal-badge" style={{ background:'rgba(201,242,102,0.14)', color:'#C9F266' }}>Admin</span>
      </div>
      <div className="dash-client-card">
        <div className="dash-avatar" style={{ background:'linear-gradient(135deg,#FF5A36,#FF8A3D)' }}>{initials}</div>
        <div>
          <p className="dash-client-name">{adminName}</p>
          <p className="dash-client-company">Administrator</p>
        </div>
      </div>
      <nav className="dash-nav">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} onClick={onClose} className={`dash-nav-item${pathname === item.href ? ' is-active' : ''}`}>{item.label}</Link>
        ))}
      </nav>
      <div className="dash-sidebar-footer">
        <Link href="/" className="dash-sidebar-link" onClick={onClose}>← Back to site</Link>
        <button className="dash-sidebar-link dash-logout-btn" onClick={handleLogout}>Sign out</button>
      </div>
    </aside>
    </>
  );
}
