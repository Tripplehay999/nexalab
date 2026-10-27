'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import { METRICS, fetchLinks, fetchMetrics, fetchTeam, formatMetric, greeting, groupMetrics, metricDef, trend } from '@/lib/portal';
import type { Activity, Assignment, Deliverable, Metric, Milestone, MilestoneTask, Ticket } from '@/lib/types';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';
import WebsiteCard from '@/components/portal/WebsiteCard';
import Avatar from '@/components/portal/Avatar';
import Icon from '@/components/portal/Icon';
import { Progress, Sparkline } from '@/components/portal/Charts';

type HomeData = {
  milestones: Milestone[];
  deliverables: Deliverable[];
  tickets: Ticket[];
  awaitingReply: number;
  activity: Activity[];
  metrics: Metric[];
  team: Assignment[];
  linkCount: number;
  openInvoices: { id: string; number: string; total: number; currency: string; due_date: string | null }[];
  now: number;
};

async function loadHome(clientId: string, projectId: string | null): Promise<HomeData> {
  const supabase = createClient();
  const [milRes, dlvRes, tikRes, actRes, metrics, team, links, invRes] = await Promise.all([
    projectId ? supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order') : Promise.resolve({ data: [] }),
    projectId ? supabase.from('deliverables').select('*').eq('project_id', projectId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    projectId ? supabase.from('tickets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    projectId ? supabase.from('activity').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
    fetchMetrics(clientId),
    fetchTeam(clientId),
    fetchLinks(clientId),
    supabase.from('invoices').select('id, number, total, currency, due_date').eq('client_id', clientId).eq('status', 'open').order('due_date'),
  ]);
  const milestones = (milRes.data ?? []) as Milestone[];
  if (milestones.length) {
    const { data: tasks } = await supabase.from('milestone_tasks').select('*').in('milestone_id', milestones.map((m) => m.id)).order('sort_order');
    milestones.forEach((m) => { m.tasks = ((tasks ?? []) as MilestoneTask[]).filter((t) => t.milestone_id === m.id); });
  }
  const tickets = (tikRes.data ?? []) as Ticket[];
  const openIds = tickets.filter((t) => t.status !== 'resolved').map((t) => t.id);
  let awaitingReply = 0;
  if (openIds.length) {
    const { data: replies } = await supabase.from('ticket_replies').select('ticket_id, is_admin, created_at').in('ticket_id', openIds).order('created_at', { ascending: false });
    const latest = new Map<string, boolean>();
    (replies ?? []).forEach((r: { ticket_id: string; is_admin: boolean | null }) => { if (!latest.has(r.ticket_id)) latest.set(r.ticket_id, !!r.is_admin); });
    awaitingReply = [...latest.values()].filter(Boolean).length;
  }
  return {
    milestones, deliverables: (dlvRes.data ?? []) as Deliverable[], tickets, awaitingReply,
    activity: (actRes.data ?? []) as Activity[], metrics, team, linkCount: links.length,
    openInvoices: (invRes.data ?? []) as HomeData['openInvoices'], now: Date.now(),
  };
}

export default function DashboardHome() {
  const { boot, loading } = useDashboard();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    loadHome(boot.userId, boot.project?.id ?? null).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [boot]);

  if (loading || !boot) return <PortalLoading />;

  const project = boot.project;
  const first = boot.firstName;
  const onboarding = (boot.profile.onboarding ?? {}) as { answers?: { website?: string; platform?: string } };
  const website = boot.profile.website || onboarding.answers?.website || null;
  const platform = boot.profile.platform || onboarding.answers?.platform || null;
  const openTickets = data?.tickets.filter((t) => t.status !== 'resolved').length ?? 0;

  const ms = data?.milestones ?? [];
  const done = ms.filter((m) => m.status === 'complete').length;
  const active = ms.find((m) => m.status === 'active');
  const next = active ?? ms.find((m) => m.status === 'pending');
  const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
  const nextTasks = next?.tasks ?? [];
  const tasksDone = nextTasks.filter((t) => t.status === 'done').length;

  const statusLine = !project
    ? 'Your portal is ready — your project will appear here soon.'
    : project.status === 'pending'
      ? 'Your project details are with our team for review.'
      : project.status === 'complete'
        ? 'Your store is live. We’re keeping it running smoothly and growing.'
        : active
          ? `We’re working on “${active.name}” — ${done} of ${ms.length} milestones done.`
          : ms.length
            ? `${done} of ${ms.length} milestones complete.`
            : 'Your team is setting up your project plan.';

  // Things waiting on the client
  const attention: { icon: string; title: string; sub: string; href: string }[] = [];
  if (data) {
    data.openInvoices.slice(0, 2).forEach((inv) => {
      const overdue = inv.due_date && inv.due_date < new Date(data.now).toISOString().slice(0, 10);
      attention.push({ icon: overdue ? '⚠️' : '🧾', title: `Invoice ${inv.number} ${overdue ? 'is overdue' : 'is ready'}`, sub: `${new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(Number(inv.total))}${inv.due_date ? ` · due ${new Date(`${inv.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''} — pay securely by card`, href: `/invoice/${inv.id}` });
    });
    if (data.awaitingReply) attention.push({ icon: '💬', title: `Your team replied on ${data.awaitingReply} ticket${data.awaitingReply > 1 ? 's' : ''}`, sub: 'Have a look and let us know.', href: '/dashboard/support' });
    const fresh = data.deliverables.filter((d) => d.status === 'ready' && d.delivered_at && data.now - new Date(d.delivered_at).getTime() < 14 * 864e5);
    if (fresh.length) attention.push({ icon: '📦', title: `${fresh.length} new deliverable${fresh.length > 1 ? 's' : ''} ready`, sub: fresh.slice(0, 2).map((d) => d.name).join(', '), href: '/dashboard/deliverables' });
    if (!website) attention.push({ icon: '🌐', title: 'Add your website address', sub: 'So we can show a live preview and keep an eye on uptime.', href: '/dashboard/resources#store-details' });
    if (data.linkCount === 0) attention.push({ icon: '🎨', title: 'Share your brand assets', sub: 'Logo, fonts, photos — drop the links in Resources.', href: '/dashboard/resources' });
    if (data.metrics.length === 0) attention.push({ icon: '📈', title: 'Add your current numbers', sub: 'Revenue, orders, visitors — so we can track progress together.', href: '/dashboard/analytics' });
  }

  const grouped = groupMetrics(data?.metrics ?? []);
  const tiles = [...METRICS.map((m) => m.key), ...[...grouped.keys()].filter((k) => !METRICS.some((m) => m.key === k))]
    .filter((k) => grouped.has(k)).slice(0, 4);

  return (
    <ClientShell
      boot={boot}
      openTickets={openTickets}
      autoTour
      kicker={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      title={<>{greeting()}, <em>{first}.</em></>}
      subtitle={statusLine}
      actions={<Link href="/dashboard/support" className="pt-btn pt-btn-ghost"><Icon name="support" size={17} /> Message your team</Link>}
    >
      <div className="pt-grid pt-grid-main">
        <div className="pt-stack">
          {/* Project status */}
          <section className="pt-card pt-hero-card" data-tour="status">
            {!project ? (
              <>
                <p className="pt-kicker" style={{ color: 'var(--lime)' }}>Getting started</p>
                <h2 className="pt-title" style={{ fontSize: '1.7rem' }}>We’re setting things up.</h2>
                <p className="pt-muted" style={{ margin: '0.5rem 0 1.2rem' }}>As soon as your project is created, its timeline and progress show up right here.</p>
                <Link href="/dashboard/support" className="pt-btn pt-btn-light">Ask a question</Link>
              </>
            ) : project.status === 'pending' ? (
              <>
                <p className="pt-kicker" style={{ color: 'var(--lime)' }}>Under review</p>
                <h2 className="pt-title" style={{ fontSize: '1.7rem' }}>{project.name}</h2>
                <p className="pt-muted" style={{ margin: '0.5rem 0 1.2rem' }}>Your account lead will reach out within one business day to book your kickoff call. Your plan, timeline, and fixed price follow within 48 hours of that call.</p>
                <Progress value={15} tone="lime" />
              </>
            ) : project.status === 'rejected' ? (
              <>
                <p className="pt-kicker" style={{ color: 'var(--lime)' }}>Project update</p>
                <h2 className="pt-title" style={{ fontSize: '1.7rem' }}>We couldn’t take this one on right now.</h2>
                <p className="pt-muted" style={{ margin: '0.5rem 0 1.2rem' }}>We sent you an email with more detail. Reply any time — timing changes, and we’d love to help when it does.</p>
              </>
            ) : (
              <>
                <div className="pt-card-head" style={{ marginBottom: '0.6rem' }}>
                  <p className="pt-kicker" style={{ color: 'var(--lime)', margin: 0 }}>{project.plan ? `${project.plan} plan` : 'Your project'}</p>
                  <span className="pt-pill tone-lime">{project.status === 'complete' ? 'Launched' : project.status === 'paused' ? 'Paused' : 'In progress'}</span>
                </div>
                <h2 className="pt-title" style={{ fontSize: '1.8rem' }}>{project.name}</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.1rem 0 0.45rem', fontSize: '0.88rem' }}>
                  <span>{ms.length ? (active ? `Phase ${ms.indexOf(active) + 1} of ${ms.length}` : `${done} of ${ms.length} milestones`) : 'Plan coming soon'}</span>
                  <strong>{pct}%</strong>
                </div>
                <Progress value={pct} tone="lime" />
                {next && (
                  <div style={{ marginTop: '1.2rem', padding: '0.9rem 1rem', borderRadius: 14, background: 'rgba(245,239,228,0.1)' }}>
                    <p className="pt-small pt-muted" style={{ margin: 0 }}>{active ? 'Working on now' : 'Up next'}{next.due_date ? ` · due ${new Date(next.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</p>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, fontSize: '1.05rem' }}>{next.name}</p>
                    {nextTasks.length > 0 && <p className="pt-small pt-muted" style={{ margin: '0.2rem 0 0' }}>{tasksDone} of {nextTasks.length} tasks done</p>}
                  </div>
                )}
                <Link href="/dashboard/project" className="pt-btn pt-btn-light" style={{ marginTop: '1.1rem' }}>See the full timeline <Icon name="arrow" size={16} /></Link>
              </>
            )}
          </section>

          {/* Needs your attention */}
          <section className="pt-card" data-tour="attention">
            <div className="pt-card-head">
              <div>
                <h2 className="pt-card-title">Needs your attention</h2>
                <p className="pt-card-sub">{attention.length ? 'A few things that would help us move faster.' : 'Nothing right now — you’re all caught up.'}</p>
              </div>
            </div>
            {attention.length === 0 ? (
              <p className="pt-muted" style={{ margin: 0 }}>🎉 We’ll let you know here as soon as anything needs you.</p>
            ) : (
              <ul className="pt-list">
                {attention.map((a) => (
                  <li key={a.title}>
                    <Link href={a.href} className="pt-row pt-row-link">
                      <span className="pt-row-icon">{a.icon}</span>
                      <div className="pt-row-main"><p className="pt-row-title">{a.title}</p><p className="pt-row-sub">{a.sub}</p></div>
                      <Icon name="arrow" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Insights snapshot */}
          <section className="pt-card" data-tour="insights">
            <div className="pt-card-head">
              <div>
                <h2 className="pt-card-title">Your numbers</h2>
                <p className="pt-card-sub">{tiles.length ? 'Latest figures and how they’ve moved.' : 'Track revenue, orders, visitors and more.'}</p>
              </div>
              <Link href="/dashboard/analytics" className="pt-card-link">{tiles.length ? 'All insights' : 'Add numbers'} <Icon name="arrow" size={15} /></Link>
            </div>
            {tiles.length === 0 ? (
              <div className="pt-empty" style={{ padding: '1rem' }}>
                <span className="pt-empty-icon">📈</span>
                <p>Add your first numbers and they’ll chart here — it takes 30 seconds.</p>
                <Link href="/dashboard/analytics" className="pt-btn pt-btn-primary pt-btn-sm"><Icon name="plus" size={15} /> Add numbers</Link>
              </div>
            ) : (
              <div className="pt-grid pt-grid-2">
                {tiles.map((k) => {
                  const list = grouped.get(k)!;
                  const { latest, change } = trend(list);
                  const def = metricDef(k, list[0].label);
                  return (
                    <div key={k} className="pt-metric">
                      <span className="pt-metric-label">{def.label}</span>
                      <span className="pt-metric-value">{formatMetric(k, latest.value, { compact: true })}</span>
                      <div className="pt-metric-foot">
                        <span>{change === null ? new Date(latest.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : <span className={change >= 0 ? 'pt-up' : 'pt-down'}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%</span>}</span>
                        <Sparkline values={list.slice(-12).map((m) => Number(m.value))} color={def.color} width={90} height={28} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Activity */}
          <section className="pt-card">
            <div className="pt-card-head"><h2 className="pt-card-title">What’s been happening</h2></div>
            {data && data.activity.length > 0 ? (
              <ul className="pt-feed">
                {data.activity.map((a) => (
                  <li key={a.id}><span className={`pt-feed-dot ${a.color}`} /><div><p>{a.text}</p><time>{timeAgo(a.created_at)}</time></div></li>
                ))}
              </ul>
            ) : (
              <p className="pt-muted" style={{ margin: 0 }}>Updates from your team will appear here as work happens.</p>
            )}
          </section>
        </div>

        <div className="pt-stack">
          <WebsiteCard website={website} platform={platform} editHref="/dashboard/resources#store-details" />

          {/* Team */}
          <section className="pt-card" data-tour="team">
            <div className="pt-card-head">
              <div>
                <h2 className="pt-card-title">Your team</h2>
                <p className="pt-card-sub">Real people, a message away.</p>
              </div>
            </div>
            {data && data.team.length > 0 ? (
              <ul className="pt-list">
                {data.team.map((a) => (
                  <li key={a.id} className="pt-row">
                    <div className="pt-person" style={{ flex: 1, minWidth: 0 }}>
                      <Avatar name={a.staff!.full_name} src={a.staff!.photo_url} size={46} />
                      <div style={{ minWidth: 0 }}>
                        <strong>{a.staff!.full_name}{a.is_primary && <span className="pt-pill tone-lime" style={{ marginLeft: 6, fontSize: '0.66rem' }}>Lead</span>}</strong>
                        <span>{a.role}{a.staff!.city ? ` · ${a.staff!.city}` : ''}</span>
                      </div>
                    </div>
                    {a.staff!.email && <a href={`mailto:${a.staff!.email}`} className="pt-icon-btn" aria-label={`Email ${a.staff!.full_name}`}><Icon name="mail" size={17} /></a>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pt-muted" style={{ margin: 0 }}>We’re matching you with your team — you’ll see their names and faces here shortly.</p>
            )}
            <Link href="/dashboard/support" className="pt-btn pt-btn-ghost pt-btn-sm" style={{ marginTop: '1rem', width: '100%' }}>Open a ticket</Link>
          </section>

          {/* Shortcuts */}
          <section className="pt-card">
            <div className="pt-card-head"><h2 className="pt-card-title">Shortcuts</h2></div>
            <ul className="pt-list">
              {[
                { href: '/dashboard/deliverables', icon: '📦', title: 'Deliverables', sub: `${data?.deliverables.filter((d) => d.status === 'ready').length ?? 0} ready to download` },
                { href: '/dashboard/resources', icon: '🔗', title: 'Resources', sub: `${data?.linkCount ?? 0} shared link${data?.linkCount === 1 ? '' : 's'}` },
                { href: '/dashboard/store', icon: '🛍️', title: 'Store', sub: 'Live orders & sync status' },
              ].map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="pt-row pt-row-link">
                    <span className="pt-row-icon">{s.icon}</span>
                    <div className="pt-row-main"><p className="pt-row-title">{s.title}</p><p className="pt-row-sub">{s.sub}</p></div>
                    <Icon name="arrow" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </ClientShell>
  );
}
