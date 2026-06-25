'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/dashboard',              key: 'overview',     label: 'Overview' },
  { href: '/dashboard/project',      key: 'project',      label: 'Project' },
  { href: '/dashboard/deliverables', key: 'deliverables', label: 'Deliverables' },
  { href: '/dashboard/analytics',    key: 'analytics',    label: 'Analytics' },
  { href: '/dashboard/store',        key: 'store',        label: 'Store' },
  { href: '/dashboard/support',      key: 'support',      label: 'Support' },
];

interface Props {
  clientName: string;
  company: string;
  initials: string;
  isOpen: boolean;
  openTickets?: number;
}

export default function DashSidebar({ clientName, company, initials, isOpen, openTickets = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  return (
    <aside className={`dash-sidebar${isOpen ? ' is-open' : ''}`} id="dash-sidebar">
      <div className="dash-brand">
        <Link href="/" className="brand">NexaLab</Link>
        <span className="dash-portal-badge">Client Portal</span>
      </div>
      <div className="dash-client-card">
        <div className="dash-avatar">{initials}</div>
        <div>
          <p className="dash-client-name">{clientName}</p>
          <p className="dash-client-company">{company || 'NexaLab Client'}</p>
        </div>
      </div>
      <nav className="dash-nav">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`dash-nav-item${active ? ' is-active' : ''}`}>
              {item.label}
              {item.key === 'support' && openTickets > 0 && (
                <span className="dash-badge">{openTickets}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="dash-sidebar-footer">
        <Link href="/contact" className="dash-sidebar-link">Book a call</Link>
        <Link href="/" className="dash-sidebar-link">← Back to site</Link>
        <button className="dash-sidebar-link dash-logout-btn" onClick={handleLogout}>Sign out</button>
      </div>
    </aside>
  );
}
