'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchTeam } from '@/lib/portal';
import type { DashBoot } from '@/lib/useDashboard';
import type { Assignment } from '@/lib/types';
import Avatar from './Avatar';
import PortalShell, { type NavItem } from './PortalShell';
import Tour, { type TourStep } from './Tour';

export const CLIENT_TOUR: TourStep[] = [
  { title: 'Welcome to your portal 👋', body: 'This is home base for your project. Here’s a 60-second look around — you can skip any time and replay it from “Take the tour”.' },
  { target: 'nav', title: 'Everything is one click away', body: 'Your project timeline, deliverables, insights, resources, and support all live here.' },
  { target: 'tabs', title: 'Everything is one tap away', body: 'Your most-used pages sit along the bottom. “More” opens the full menu.' },
  { target: 'status', title: 'Where your project is at', body: 'The current phase, overall progress, and what’s coming up next — updated by your team as they work.' },
  { target: 'website', title: 'Your website, at a glance', body: 'A live preview of your store and whether it’s online right now.' },
  { target: 'attention', title: 'Things that need you', body: 'Anything waiting on you — a ticket reply, files to review, or details we’re missing — shows up here.' },
  { target: 'insights', title: 'Your numbers', body: 'Add your revenue, orders, visitors and more in Insights, and they’ll chart here so you can see progress over time.' },
  { target: 'team', title: 'The people on your project', body: 'Real names and faces. Your account lead is your go-to for anything.' },
  { target: 'help', title: 'Need a refresher?', body: 'Replay this tour any time from here. Questions? Open a ticket in Support — we usually reply in minutes.' },
];

export function clientNav(openTickets = 0): NavItem[] {
  return [
    { href: '/dashboard', label: 'Home', icon: 'home', tour: 'nav-home', mobile: true },
    { href: '/dashboard/project', label: 'Project', icon: 'project', mobile: true },
    { href: '/dashboard/deliverables', label: 'Deliverables', icon: 'deliverables' },
    { href: '/dashboard/analytics', label: 'Insights', icon: 'insights', mobile: true },
    { href: '/dashboard/store', label: 'Store', icon: 'store' },
    { href: '/dashboard/resources', label: 'Resources', icon: 'resources' },
    { href: '/dashboard/billing', label: 'Billing', icon: 'billing' },
    { href: '/dashboard/support', label: 'Support', icon: 'support', badge: openTickets, mobile: true },
  ];
}

type Props = {
  boot: DashBoot;
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  openTickets?: number;
  autoTour?: boolean; // start the tour automatically if they haven't finished it
  children: ReactNode;
};

export default function ClientShell({ boot, kicker, title, subtitle, actions, openTickets = 0, autoTour = false, children }: Props) {
  const [lead, setLead] = useState<Assignment | null>(null);
  const [touring, setTouring] = useState(false);
  const tourDone = Boolean((boot.profile.onboarding as { tourDone?: boolean } | null | undefined)?.tourDone);

  useEffect(() => {
    let cancelled = false;
    fetchTeam(boot.userId).then((team) => { if (!cancelled) setLead(team.find((a) => a.is_primary) ?? team[0] ?? null); });
    return () => { cancelled = true; };
  }, [boot.userId]);

  useEffect(() => {
    if (!autoTour || tourDone) return;
    let seen = false;
    try { seen = localStorage.getItem('nexalab_tour_done') === '1'; } catch { /* storage blocked */ }
    if (seen) return;
    const t = setTimeout(() => setTouring(true), 700);
    return () => clearTimeout(t);
  }, [autoTour, tourDone]);

  async function finishTour() {
    setTouring(false);
    try { localStorage.setItem('nexalab_tour_done', '1'); } catch { /* storage blocked */ }
    if (tourDone) return;
    await createClient().from('profiles')
      .update({ onboarding: { ...(boot.profile.onboarding ?? {}), tourDone: true } })
      .eq('id', boot.userId);
  }

  const leadCard = lead?.staff ? (
    <div className="pt-lead-card">
      <Avatar name={lead.staff.full_name} src={lead.staff.photo_url} size={44} ring />
      <div>
        <span>Your {lead.role.toLowerCase()}</span>
        <strong>{lead.staff.full_name}</strong>
        {lead.staff.email && <a href={`mailto:${lead.staff.email}`}>Send a message</a>}
      </div>
    </div>
  ) : null;

  return (
    <>
      <PortalShell
        variant="client"
        nav={clientNav(openTickets)}
        user={{ name: boot.profile.full_name || boot.email, sub: boot.profile.company || boot.email }}
        kicker={kicker}
        title={title}
        subtitle={subtitle}
        actions={actions}
        sidebarExtra={leadCard}
        onTour={() => setTouring(true)}
        helpHref="/dashboard/support"
      >
        {children}
      </PortalShell>
      {touring && <div className="pt-scope"><Tour steps={CLIENT_TOUR} onClose={finishTour} /></div>}
    </>
  );
}

export function PortalLoading() {
  return (
    <div className="pt pt-loading">
      <span className="pt-loading-dot" /> Loading your portal…
    </div>
  );
}
