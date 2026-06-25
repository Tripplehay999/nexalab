'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import DashSidebar from '@/components/DashSidebar';
import { createClient } from '@/lib/supabase/client';

export default function ProjectPage() {
  const { boot, loading } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    if (!boot?.project) return;
    const supabase = createClient();
    const pid = boot.project.id;

    async function load() {
      const { data: mils } = await supabase.from('milestones').select('*').eq('project_id', pid).order('sort_order');
      if (!mils) return;
      const milIds = mils.map((m: any) => m.id);
      if (milIds.length > 0) {
        const { data: tasks } = await supabase.from('milestone_tasks').select('*').in('milestone_id', milIds);
        mils.forEach((m: any) => { m.tasks = (tasks ?? []).filter((t: any) => t.milestone_id === m.id); });
      } else {
        mils.forEach((m: any) => { m.tasks = []; });
      }
      setMilestones(mils);
    }
    load();
  }, [boot]);

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const statusColor: Record<string, string> = { complete:'#22d3a8', active:'#7c5cfc', pending:'var(--muted)' };

  return (
    <div className="dashboard-body">
      <DashSidebar clientName={boot.profile.full_name || boot.email} company={boot.profile.company || ''} initials={boot.initials} isOpen={menuOpen} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left">
            <h1 className="dash-page-title">Project</h1>
            {boot.project && <span style={{ fontSize:'0.78rem', color:'var(--muted)', marginLeft:'0.75rem' }}>{boot.project.name}</span>}
          </div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        {!boot.project ? (
          <div className="dash-card" style={{ textAlign:'center', padding:'3rem 2rem' }}>
            <p style={{ fontWeight:700, margin:'0 0 0.5rem' }}>No project set up yet</p>
            <p style={{ color:'var(--muted)', fontSize:'0.88rem', margin:0 }}>Your project timeline will appear here once your team sets it up.</p>
          </div>
        ) : (
          <div>
            {boot.project.description && (
              <div className="dash-card" style={{ marginBottom:'1rem' }}>
                <p className="dash-card-title">Project overview</p>
                <p style={{ fontSize:'0.88rem', color:'var(--text)', lineHeight:1.6 }}>{boot.project.description}</p>
                <div style={{ display:'flex', gap:'1.5rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
                  {boot.project.plan && <span style={{ fontSize:'0.78rem', color:'var(--muted)' }}>Plan: <strong style={{ color:'var(--text)' }}>{boot.project.plan}</strong></span>}
                  {boot.project.started_at && <span style={{ fontSize:'0.78rem', color:'var(--muted)' }}>Started: <strong style={{ color:'var(--text)' }}>{new Date(boot.project.started_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong></span>}
                </div>
              </div>
            )}

            {milestones.length === 0 ? (
              <div className="dash-card" style={{ textAlign:'center', padding:'2rem' }}>
                <p style={{ color:'var(--muted)', fontSize:'0.88rem' }}>No milestones have been created yet. Check back soon.</p>
              </div>
            ) : (
              <div className="dash-card">
                <p className="dash-card-title">Project timeline</p>
                <div className="project-timeline">
                  {milestones.map((m: any, idx: number) => {
                    const tasks    = m.tasks || [];
                    const done     = tasks.filter((t: any) => t.status === 'done').length;
                    const pct      = tasks.length ? Math.round((done / tasks.length) * 100) : (m.status === 'complete' ? 100 : 0);
                    const dueStr   = m.due_date ? new Date(m.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : null;
                    const isLast   = idx === milestones.length - 1;
                    return (
                      <div key={m.id} className={`timeline-item timeline-item--${m.status}`}>
                        <div className="timeline-left">
                          <div className="timeline-dot" style={{ background: statusColor[m.status] || 'var(--muted)', border: m.status === 'active' ? '2px solid var(--purple)' : 'none' }} />
                          {!isLast && <div className="timeline-line" style={{ background: m.status === 'complete' ? statusColor.complete : 'var(--line)' }} />}
                        </div>
                        <div className="timeline-body">
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.3rem', flexWrap:'wrap' }}>
                            <span className="milestone-tag">Phase {idx + 1}</span>
                            {m.status === 'active' && <span className="dash-status-pill dash-status-pill--active" style={{ fontSize:'0.7rem', padding:'0.15rem 0.6rem' }}>In progress</span>}
                            {m.status === 'complete' && <span style={{ fontSize:'0.72rem', color:'#22d3a8', fontWeight:600 }}>✓ Complete</span>}
                            {dueStr && <span className="milestone-due" style={{ marginLeft:'auto' }}>Due {dueStr}</span>}
                          </div>
                          <p className="milestone-name" style={{ marginBottom:'0.25rem' }}>{m.name}</p>
                          {m.description && <p className="milestone-desc">{m.description}</p>}
                          {tasks.length > 0 && (
                            <div style={{ marginTop:'0.5rem' }}>
                              <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.25rem' }}>
                                <div className="progress-bar" style={{ flex:1 }}><div className="progress-fill" style={{ width:`${pct}%` }} /></div>
                                <span style={{ fontSize:'0.72rem', color:'var(--muted)', whiteSpace:'nowrap' }}>{done}/{tasks.length} tasks</span>
                              </div>
                              <ul className="milestone-task-list">
                                {tasks.map((t: any, i: number) => <li key={i} className={`mtask ${t.status}`}>{t.name}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
