'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import DashSidebar from '@/components/DashSidebar';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const { boot, loading } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState<{
    milestones: any[];
    deliverables: any[];
    tickets: any[];
    activity: any[];
  } | null>(null);

  useEffect(() => {
    if (!boot?.project || ['pending','rejected'].includes(boot.project.status)) return;
    const supabase = createClient();
    const pid = boot.project.id;

    async function loadData() {
      const milestoneIds = (await supabase.from('milestones').select('id').eq('project_id', pid)).data?.map((m: any) => m.id) ?? [];
      const [milRes, taskRes, dlvRes, tikRes, actRes] = await Promise.all([
        supabase.from('milestones').select('*').eq('project_id', pid).order('sort_order'),
        milestoneIds.length
          ? supabase.from('milestone_tasks').select('*, milestone_id').in('milestone_id', milestoneIds)
          : Promise.resolve({ data: [] }),
        supabase.from('deliverables').select('*').eq('project_id', pid),
        supabase.from('tickets').select('*').eq('project_id', pid).order('created_at', { ascending: false }),
        supabase.from('activity').select('*').eq('project_id', pid).order('created_at', { ascending: false }).limit(6),
      ]);
      const milestones = milRes.data ?? [];
      const allTasks   = taskRes.data ?? [];
      milestones.forEach((m: any) => { m.tasks = allTasks.filter((t: any) => t.milestone_id === m.id); });
      setData({ milestones, deliverables: dlvRes.data ?? [], tickets: tikRes.data ?? [], activity: actRes.data ?? [] });
    }
    loadData();
  }, [boot]);

  if (loading || !boot) {
    return <div className="dashboard-body"><div className="dash-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;
  }

  const project = boot.project;
  const statusMap: Record<string, string> = { active: 'Sprint Active', paused: 'Paused', complete: 'Complete' };
  const openTickets = (data?.tickets ?? []).filter((t: any) => t.status !== 'resolved').length;

  return (
    <div className="dashboard-body">
      <DashSidebar
        clientName={boot.profile.full_name || boot.email}
        company={boot.profile.company || ''}
        initials={boot.initials}
        isOpen={menuOpen}
        openTickets={openTickets}
      />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left">
            <h1 className="dash-page-title">Overview</h1>
            {project && !['pending','rejected'].includes(project.status) && (
              <span className={`dash-status-pill dash-status-pill--${project.status || 'active'}`}>
                <span className={`dash-status-dot dash-status-dot--${project.status || 'active'}`} />
                {statusMap[project.status] || project.status}
              </span>
            )}
          </div>
          <div className="dash-topbar-right">
            <span className="dash-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <div className="dash-avatar-sm">{boot.initials}</div>
          </div>
        </header>

        {/* No project */}
        {!project && (
          <div className="dash-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Setting up your portal</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>Your project will appear here once our team completes setup. You&apos;ll receive an email when it&apos;s ready.</p>
          </div>
        )}

        {/* Pending / Rejected */}
        {project && project.status === 'pending' && (
          <div className="dash-card project-status-card">
            <div className="project-status-icon">⏳</div>
            <h2 className="project-status-title">Your project is under review</h2>
            <p className="project-status-body">Our team has received your intake and will review it within 1 business day. You&apos;ll get an email the moment it&apos;s approved.</p>
            <p className="project-status-sub">In the meantime, feel free to reach out at <a href="mailto:hello@nexalab.io" className="auth-link">hello@nexalab.io</a>.</p>
          </div>
        )}
        {project && project.status === 'rejected' && (
          <div className="dash-card project-status-card">
            <div className="project-status-icon">📋</div>
            <h2 className="project-status-title">Thank you for your interest</h2>
            <p className="project-status-body">After reviewing your project intake, we weren&apos;t able to move forward at this time.</p>
            <p className="project-status-sub">Reply to our email or reach us at <a href="mailto:hello@nexalab.io" className="auth-link">hello@nexalab.io</a>.</p>
          </div>
        )}

        {/* Active project overview */}
        {project && !['pending','rejected'].includes(project.status) && data && (() => {
          const startDate   = project.started_at ? new Date(project.started_at) : new Date();
          const daysActive  = Math.floor((Date.now() - startDate.getTime()) / 86400000);
          const complete    = data.milestones.filter((m: any) => m.status === 'complete').length;
          const dlvReady    = data.deliverables.filter((d: any) => d.status === 'ready').length;
          const pctM        = data.milestones.length ? Math.round((complete / data.milestones.length) * 100) : 0;
          const pctD        = data.deliverables.length ? Math.round((dlvReady / data.deliverables.length) * 100) : 0;
          const nextM       = data.milestones.find((m: any) => m.status === 'active') || data.milestones.find((m: any) => m.status === 'pending');
          const activeM     = data.milestones.find((m: any) => m.status === 'active');
          const activeIdx   = activeM ? data.milestones.indexOf(activeM) + 1 : null;
          const totalPct    = data.milestones.length ? Math.round((complete / data.milestones.length) * 100) : 0;

          return (
            <div id="overview-content">
              <div className="dash-welcome">
                <p className="dash-welcome-text">Welcome back, <strong>{boot.firstName}</strong>. Here&apos;s where things stand.</p>
              </div>

              {/* Stats */}
              <div className="dash-stats">
                <div className="dash-stat-card"><p className="dash-stat-label">Days active</p><p className="dash-stat-val">{daysActive}</p><p className="dash-stat-sub">since {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
                <div className="dash-stat-card"><p className="dash-stat-label">Milestones complete</p><p className="dash-stat-val">{complete} <span className="dash-stat-of">/ {data.milestones.length}</span></p><div className="progress-bar"><div className="progress-fill" style={{ width: `${pctM}%` }} /></div></div>
                <div className="dash-stat-card"><p className="dash-stat-label">Deliverables ready</p><p className="dash-stat-val">{dlvReady} <span className="dash-stat-of">/ {data.deliverables.length}</span></p><div className="progress-bar"><div className="progress-fill" style={{ width: `${pctD}%` }} /></div></div>
                <div className="dash-stat-card"><p className="dash-stat-label">Open tickets</p><p className="dash-stat-val">{openTickets}</p><p className={`dash-stat-sub ${openTickets > 0 ? 'dash-stat-warn' : 'dash-stat-green'}`}>{openTickets > 0 ? 'Awaiting review' : 'All clear'}</p></div>
              </div>

              {/* Health bar */}
              {data.milestones.length > 0 && (
                <div className="dash-project-health">
                  <div className="dash-health-bar">
                    <div className="dash-health-labels">
                      <span className="dash-health-label">{activeIdx ? `Phase ${activeIdx} of ${data.milestones.length}` : `${complete} of ${data.milestones.length} phases complete`}</span>
                      <span className="dash-health-pct">{totalPct}% complete</span>
                    </div>
                    <div className="progress-bar dash-health-progress"><div className="progress-fill" style={{ width: `${totalPct}%` }} /></div>
                    {activeM && <p className="dash-health-phase">Currently in: <strong>{activeM.name}</strong></p>}
                  </div>
                </div>
              )}

              {/* Quick nav */}
              <div className="dash-quicknav">
                {[
                  { href: '/dashboard/project', label: 'Project', sub: 'Timeline & milestones' },
                  { href: '/dashboard/deliverables', label: 'Deliverables', sub: 'Files, repos & links' },
                  { href: '/dashboard/analytics', label: 'Analytics', sub: 'Revenue & trends' },
                  { href: '/dashboard/store', label: 'Store', sub: 'Live orders & metrics' },
                  { href: '/dashboard/support', label: 'Support', sub: 'Tickets & account lead' },
                ].map((card) => (
                  <a key={card.href} href={card.href} className="dash-quicknav-card">
                    <div><p className="dash-quicknav-label">{card.label}</p><p className="dash-quicknav-sub">{card.sub}</p></div>
                  </a>
                ))}
              </div>

              {/* Activity + Next milestone */}
              <div className="dash-two-col">
                <div className="dash-card">
                  <p className="dash-card-title">Recent activity</p>
                  <ul className="activity-list">
                    {data.activity.length === 0
                      ? <li className="activity-item" style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No activity yet.</li>
                      : data.activity.map((a: any, i: number) => (
                        <li key={i} className="activity-item">
                          <span className={`activity-dot activity-dot--${a.color || 'gray'}`} />
                          <div>
                            <p className="activity-text">{a.text}</p>
                            <p className="activity-time">{timeAgo(a.created_at)}</p>
                          </div>
                        </li>
                      ))
                    }
                  </ul>
                </div>
                <div className="dash-card">
                  <p className="dash-card-title">Next milestone</p>
                  {!nextM
                    ? <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>All milestones complete — great work!</p>
                    : (() => {
                      const tasks     = nextM.tasks || [];
                      const doneTasks = tasks.filter((t: any) => t.status === 'done').length;
                      const pct       = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
                      const dueStr    = nextM.due_date ? new Date(nextM.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
                      const idx       = data.milestones.indexOf(nextM) + 1;
                      return (
                        <div className="next-milestone-card">
                          <div className="milestone-header">
                            <span className="milestone-tag">Milestone {idx}</span>
                            <span className="milestone-due">Due {dueStr}</span>
                          </div>
                          <p className="milestone-name">{nextM.name}</p>
                          {nextM.description && <p className="milestone-desc">{nextM.description}</p>}
                          <div className="milestone-progress">
                            <div className="milestone-progress-bar"><div className="milestone-progress-fill" style={{ width: `${pct}%` }} /></div>
                            <span className="milestone-progress-pct">{pct}%</span>
                          </div>
                          {tasks.length > 0 && (
                            <div className="milestone-tasks">
                              <p className="milestone-tasks-label">Sub-tasks</p>
                              <ul className="milestone-task-list">
                                {tasks.map((t: any, i: number) => <li key={i} className={`mtask ${t.status}`}>{t.name}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  }
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
