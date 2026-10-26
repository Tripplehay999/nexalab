'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { createClient } from '@/lib/supabase/client';
import { greeting } from '@/lib/portal';
import { timeAgo } from '@/lib/utils';
import type { Activity, Assignment, Profile, Staff } from '@/lib/types';
import AdminShell from '@/components/portal/AdminShell';
import { PortalLoading } from '@/components/portal/ClientShell';
import Avatar from '@/components/portal/Avatar';
import Icon from '@/components/portal/Icon';

type Overview = {
  counts: { clients: number; active: number; pending: number; tickets: number; inquiries: number; requests: number };
  unassigned: Profile[];
  recent: Profile[];
  activity: Activity[];
  staffLoad: { staff: Staff; clients: number }[];
};

async function loadOverview(): Promise<Overview> {
  const supabase = createClient();
  const [clients, active, pending, tickets, inquiries, requests, act, staff, assigns] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false }),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
    supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('staff').select('*').eq('is_active', true).order('full_name'),
    supabase.from('client_assignments').select('client_id, staff_id, is_primary'),
  ]);
  const clientRows = (clients.data ?? []) as Profile[];
  const assignRows = (assigns.data ?? []) as Pick<Assignment, 'client_id' | 'staff_id' | 'is_primary'>[];
  const withLead = new Set(assignRows.map((a) => a.client_id));
  return {
    counts: {
      clients: clientRows.length, active: active.count ?? 0, pending: pending.count ?? 0,
      tickets: tickets.count ?? 0, inquiries: inquiries.count ?? 0, requests: requests.count ?? 0,
    },
    unassigned: clientRows.filter((c) => !withLead.has(c.id)).slice(0, 6),
    recent: clientRows.slice(0, 5),
    activity: (act.data ?? []) as Activity[],
    staffLoad: ((staff.data ?? []) as Staff[]).map((s) => ({ staff: s, clients: assignRows.filter((a) => a.staff_id === s.id).length })),
  };
}

export default function AdminOverview() {
  const { boot, loading } = useAdmin();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    loadOverview().then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [boot]);

  if (loading || !boot) return <PortalLoading />;
  const c = data?.counts;

  const actions = c ? [
    { n: c.pending, label: 'project', verb: 'waiting for approval', href: '/admin/pending', icon: '⏳' },
    { n: c.tickets, label: 'ticket', verb: 'open', href: '/admin/tickets', icon: '🎫' },
    { n: c.inquiries, label: 'new inquiry', verb: 'to review', href: '/admin/inquiries', icon: '📥' },
    { n: c.requests, label: 'public support request', verb: 'open', href: '/admin/tickets', icon: '🆘' },
  ].filter((a) => a.n > 0) : [];

  return (
    <AdminShell
      boot={boot}
      kicker={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      title={<>{greeting()}, <em>{boot.firstName}.</em></>}
      subtitle={actions.length ? `${actions.reduce((s, a) => s + a.n, 0)} things need attention today.` : 'All clear — nothing waiting on you.'}
      actions={<Link href="/admin/clients" className="pt-btn pt-btn-ink"><Icon name="user" size={16} /> All clients</Link>}
    >
      <div className="pt-grid pt-grid-4" style={{ marginBottom: '1rem' }}>
        {[
          ['Clients', c?.clients], ['Active projects', c?.active], ['Open tickets', c?.tickets], ['New inquiries', c?.inquiries],
        ].map(([l, v]) => (
          <div key={l as string} className="pt-metric" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <span className="pt-metric-label">{l}</span><span className="pt-metric-value">{v ?? '—'}</span>
          </div>
        ))}
      </div>

      <div className="pt-grid pt-grid-main">
        <div className="pt-stack">
          <section className="pt-card">
            <div className="pt-card-head"><h2 className="pt-card-title">Needs action</h2></div>
            {actions.length === 0 ? (
              <p className="pt-muted" style={{ margin: 0 }}>🎉 Inbox zero. Nothing waiting.</p>
            ) : (
              <ul className="pt-list">
                {actions.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className="pt-row pt-row-link">
                      <span className="pt-row-icon">{a.icon}</span>
                      <div className="pt-row-main"><p className="pt-row-title">{a.n} {a.label}{a.n > 1 ? 's' : ''} {a.verb}</p></div>
                      <Icon name="arrow" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pt-card">
            <div className="pt-card-head">
              <div><h2 className="pt-card-title">Clients without a team</h2><p className="pt-card-sub">Assign an account lead so they know who to talk to.</p></div>
            </div>
            {!data ? <p className="pt-muted">Loading…</p> : data.unassigned.length === 0 ? (
              <p className="pt-muted" style={{ margin: 0 }}>Every client has a team. Nice.</p>
            ) : (
              <ul className="pt-list">
                {data.unassigned.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/clients/${p.id}?tab=team`} className="pt-row pt-row-link">
                      <Avatar name={p.full_name || p.email || '?'} size={38} />
                      <div className="pt-row-main"><p className="pt-row-title">{p.full_name || p.email}</p><p className="pt-row-sub">{p.company || 'No company'} · joined {timeAgo(p.created_at)}</p></div>
                      <span className="pt-btn pt-btn-ghost pt-btn-sm">Assign</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pt-card">
            <div className="pt-card-head"><h2 className="pt-card-title">Recent activity</h2></div>
            {data?.activity.length ? (
              <ul className="pt-feed">
                {data.activity.map((a) => (
                  <li key={a.id}><span className={`pt-feed-dot ${a.color}`} /><div><p>{a.text}</p><time>{timeAgo(a.created_at)}</time></div></li>
                ))}
              </ul>
            ) : <p className="pt-muted" style={{ margin: 0 }}>No activity yet.</p>}
          </section>
        </div>

        <aside className="pt-stack">
          <section className="pt-card">
            <div className="pt-card-head"><h2 className="pt-card-title">Newest clients</h2><Link href="/admin/clients" className="pt-card-link">All <Icon name="arrow" size={15} /></Link></div>
            <ul className="pt-list">
              {(data?.recent ?? []).map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/clients/${p.id}`} className="pt-row pt-row-link">
                    <Avatar name={p.full_name || p.email || '?'} size={36} />
                    <div className="pt-row-main"><p className="pt-row-title">{p.full_name || p.email}</p><p className="pt-row-sub">{p.onboarded_at ? 'Onboarded' : 'Onboarding'} · {timeAgo(p.created_at)}</p></div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="pt-card">
            <div className="pt-card-head"><h2 className="pt-card-title">Team workload</h2><Link href="/admin/team" className="pt-card-link">Manage <Icon name="arrow" size={15} /></Link></div>
            <ul className="pt-list">
              {(data?.staffLoad ?? []).map(({ staff, clients }) => (
                <li key={staff.id} className="pt-row">
                  <Avatar name={staff.full_name} src={staff.photo_url} size={36} />
                  <div className="pt-row-main"><p className="pt-row-title">{staff.full_name}</p><p className="pt-row-sub">{staff.title}</p></div>
                  <span className="pt-pill">{clients} client{clients === 1 ? '' : 's'}</span>
                </li>
              ))}
              {data && data.staffLoad.length === 0 && <p className="pt-muted" style={{ margin: 0 }}>No team members yet — add them in Team.</p>}
            </ul>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
