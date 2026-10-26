'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import { createClient } from '@/lib/supabase/client';
import { PROJECT_STATUS } from '@/lib/portal';
import type { Milestone, MilestoneTask } from '@/lib/types';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';
import Icon from '@/components/portal/Icon';
import { Progress } from '@/components/portal/Charts';

async function loadMilestones(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order');
  const mils = (data ?? []) as Milestone[];
  if (mils.length) {
    const { data: tasks } = await supabase.from('milestone_tasks').select('*').in('milestone_id', mils.map((m) => m.id)).order('sort_order');
    mils.forEach((m) => { m.tasks = ((tasks ?? []) as MilestoneTask[]).filter((t) => t.milestone_id === m.id); });
  }
  return mils;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBC');

export default function ProjectPage() {
  const { boot, loading } = useDashboard();
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const projectId = boot?.project?.id;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    loadMilestones(projectId).then((m) => { if (!cancelled) setMilestones(m); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading || !boot) return <PortalLoading />;
  const project = boot.project;
  const ms = milestones ?? [];
  const done = ms.filter((m) => m.status === 'complete').length;
  const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
  const status = project ? PROJECT_STATUS[project.status] ?? { label: project.status, tone: 'sky' } : null;

  return (
    <ClientShell
      boot={boot}
      kicker="Project"
      title={project ? <>{project.name.replace(/ project$/i, '')} <em>project.</em></> : <>Your <em>project.</em></>}
      subtitle={project ? 'Every milestone and task, updated by your team as the work happens.' : 'Your project timeline will appear here once it’s set up.'}
      actions={status && <span className={`pt-pill tone-${status.tone}`}>{status.label}</span>}
    >
      {!project ? (
        <div className="pt-card pt-empty">
          <span className="pt-empty-icon">🗺️</span>
          <h3>No project yet</h3>
          <p>Once your project is created, you’ll see each milestone, its tasks, and due dates here.</p>
          <Link href="/dashboard/support" className="pt-btn pt-btn-ghost pt-btn-sm">Ask your team</Link>
        </div>
      ) : (
        <div className="pt-grid pt-grid-main">
          <section>
            {milestones === null ? (
              <p className="pt-muted">Loading the timeline…</p>
            ) : ms.length === 0 ? (
              <div className="pt-card pt-empty">
                <span className="pt-empty-icon">🧭</span>
                <h3>Your plan is being written</h3>
                <p>{project.status === 'pending' ? 'After your kickoff call, your milestones and due dates land here.' : 'Your team is mapping out the milestones — check back soon.'}</p>
              </div>
            ) : (
              <ol className="pt-timeline">
                {ms.map((m, i) => {
                  const tasks = m.tasks ?? [];
                  const tDone = tasks.filter((t) => t.status === 'done').length;
                  return (
                    <li key={m.id} className={`pt-ms is-${m.status}`}>
                      <span className="pt-ms-dot">{m.status === 'complete' ? <Icon name="check" size={18} /> : i + 1}</span>
                      <div className="pt-ms-body">
                        <div className="pt-card-head" style={{ marginBottom: 0, alignItems: 'flex-start' }}>
                          <div>
                            <p className="pt-small pt-muted" style={{ margin: 0 }}>Milestone {i + 1} · {m.status === 'complete' ? 'Done' : `Due ${fmt(m.due_date)}`}</p>
                            <h3 className="pt-card-title" style={{ marginTop: 2 }}>{m.name}</h3>
                          </div>
                          <span className={`pt-pill ${m.status === 'complete' ? 'tone-lime' : m.status === 'active' ? 'tone-tomato' : ''}`}>
                            {m.status === 'complete' ? 'Complete' : m.status === 'active' ? 'In progress' : 'Coming up'}
                          </span>
                        </div>
                        {m.description && <p className="pt-muted" style={{ margin: '0.5rem 0 0' }}>{m.description}</p>}
                        {tasks.length > 0 && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginTop: '0.8rem' }}>
                              <div style={{ flex: 1 }}><Progress value={(tDone / tasks.length) * 100} tone={m.status === 'complete' ? 'forest' : 'tomato'} /></div>
                              <span className="pt-small pt-muted">{tDone}/{tasks.length}</span>
                            </div>
                            <ul className="pt-tasks">
                              {tasks.map((t) => (
                                <li key={t.id} className={`pt-task is-${t.status}`}>
                                  <span className="pt-task-box">{t.status === 'done' && <Icon name="check" size={12} />}</span>{t.name}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <aside className="pt-stack">
            <div className="pt-card">
              <h2 className="pt-card-title">Progress</h2>
              <p className="pt-metric-value" style={{ margin: '0.6rem 0 0.4rem' }}>{pct}%</p>
              <Progress value={pct} />
              <p className="pt-muted pt-small" style={{ margin: '0.6rem 0 0' }}>{done} of {ms.length} milestones complete</p>
            </div>
            <div className="pt-card">
              <h2 className="pt-card-title">Project details</h2>
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                <li className="pt-row"><span className="pt-row-main pt-muted">Plan</span><strong>{project.plan || '—'}</strong></li>
                <li className="pt-row"><span className="pt-row-main pt-muted">Started</span><strong>{fmt(project.started_at ?? null)}</strong></li>
                <li className="pt-row"><span className="pt-row-main pt-muted">Status</span><strong>{status?.label}</strong></li>
              </ul>
            </div>
            <div className="pt-card">
              <h2 className="pt-card-title">Questions about the plan?</h2>
              <p className="pt-muted" style={{ margin: '0.4rem 0 1rem' }}>Ask anything — your team usually replies within minutes during support hours.</p>
              <Link href="/dashboard/support" className="pt-btn pt-btn-primary pt-btn-sm">Open a ticket</Link>
            </div>
          </aside>
        </div>
      )}
    </ClientShell>
  );
}
