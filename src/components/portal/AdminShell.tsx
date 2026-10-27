'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdminBoot } from '@/lib/useAdmin';
import PortalShell, { type NavItem } from './PortalShell';

type Counts = { pending: number; tickets: number; inquiries: number };

async function fetchCounts(): Promise<Counts> {
  const supabase = createClient();
  const [p, t, i] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);
  return { pending: p.count ?? 0, tickets: t.count ?? 0, inquiries: i.count ?? 0 };
}

export default function AdminShell({ boot, kicker, title, subtitle, actions, children }: { boot: AdminBoot; kicker?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const [counts, setCounts] = useState<Counts>({ pending: 0, tickets: 0, inquiries: 0 });

  useEffect(() => {
    let cancelled = false;
    fetchCounts().then((c) => { if (!cancelled) setCounts(c); });
    return () => { cancelled = true; };
  }, []);

  const nav: NavItem[] = [
    { href: '/admin', label: 'Overview', icon: 'overview', mobile: true },
    { href: '/admin/clients', label: 'Clients', icon: 'user', mobile: true },
    { href: '/admin/team', label: 'Team', icon: 'team' },
    { href: '/admin/billing', label: 'Billing', icon: 'billing', mobile: true },
    { href: '/admin/pending', label: 'Pending projects', icon: 'clock', badge: counts.pending },
    { href: '/admin/inquiries', label: 'Inquiries', icon: 'inbox', badge: counts.inquiries },
    { href: '/admin/tickets', label: 'Tickets', icon: 'ticket', badge: counts.tickets, mobile: true },
  ];

  return (
    <PortalShell
      variant="admin"
      nav={nav}
      user={{ name: boot.firstName, sub: boot.email }}
      kicker={kicker}
      title={title}
      subtitle={subtitle}
      actions={actions}
      helpHref="/support"
    >
      {children}
    </PortalShell>
  );
}
