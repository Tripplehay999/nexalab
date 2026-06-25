'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/admin',            label: 'Overview' },
  { href: '/admin/clients',    label: 'Clients' },
  { href: '/admin/inquiries',  label: 'Inquiries' },
  { href: '/admin/pending',    label: 'Pending Projects' },
  { href: '/admin/tickets',    label: 'Tickets' },
];

interface Props { initials: string; adminName: string; isOpen: boolean; }

export default function AdminSidebar({ initials, adminName, isOpen }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  return (
    <aside className={`dash-sidebar${isOpen ? ' is-open' : ''}`} id="dash-sidebar">
      <div className="dash-brand">
        <Link href="/" className="brand">NexaLab</Link>
        <span className="dash-portal-badge" style={{ background:'rgba(255,79,216,0.12)', color:'#ff4fd8' }}>Admin</span>
      </div>
      <div className="dash-client-card">
        <div className="dash-avatar" style={{ background:'linear-gradient(135deg,#ff4fd8,#7c5cfc)' }}>{initials}</div>
        <div>
          <p className="dash-client-name">{adminName}</p>
          <p className="dash-client-company">Administrator</p>
        </div>
      </div>
      <nav className="dash-nav">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={`dash-nav-item${pathname === item.href ? ' is-active' : ''}`}>{item.label}</Link>
        ))}
      </nav>
      <div className="dash-sidebar-footer">
        <Link href="/" className="dash-sidebar-link">← Back to site</Link>
        <button className="dash-sidebar-link dash-logout-btn" onClick={handleLogout}>Sign out</button>
      </div>
    </aside>
  );
}
