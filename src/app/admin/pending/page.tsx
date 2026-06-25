'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import AdminSidebar from '@/components/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, timeAgo, sendNotification } from '@/lib/utils';

export default function AdminPendingPage() {
  const { boot, loading } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!boot) return;
    loadPending();
  }, [boot]);

  async function loadPending() {
    const supabase = createClient();
    const { data } = await supabase
      .from('projects')
      .select('*, profiles!client_id(full_name,email,company)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setProjects(data ?? []);
  }

  async function setStatus(projectId: string, clientId: string, status: 'active' | 'rejected') {
    setSaving(projectId);
    const supabase = createClient();
    await supabase.from('projects').update({ status }).eq('id', projectId);
    if (status === 'active') {
      await supabase.from('activity').insert({ project_id: projectId, text: 'Project approved and activated.', color: 'green' });
      await sendNotification('project_approved', { client_id: clientId, message: 'Your project has been approved! Welcome to your client portal.' });
    }
    setSaving(null);
    loadPending();
  }

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  return (
    <div className="dashboard-body">
      <AdminSidebar initials={boot.initials} adminName={boot.firstName} isOpen={menuOpen} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Pending Projects</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        {projects.length === 0 ? (
          <div className="dash-card" style={{ textAlign:'center', padding:'3rem 2rem' }}>
            <p style={{ fontWeight:700, margin:'0 0 0.5rem' }}>All clear</p>
            <p style={{ color:'var(--muted)', fontSize:'0.88rem', margin:0 }}>No projects pending approval.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {projects.map((p: any) => {
              const client = p.profiles;
              return (
                <div key={p.id} className="dash-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap' }}>
                    <div>
                      <p style={{ fontWeight:700, margin:'0 0 0.2rem' }}>{p.name || 'Untitled project'}</p>
                      <p style={{ fontSize:'0.82rem', color:'var(--muted)', margin:0 }}>
                        {client?.full_name} · {client?.email} {client?.company ? `· ${client.company}` : ''} · {timeAgo(p.created_at)}
                      </p>
                      {p.plan && <p style={{ fontSize:'0.78rem', color:'var(--purple)', margin:'0.25rem 0 0' }}>Plan: {p.plan}</p>}
                      {p.description && <p style={{ fontSize:'0.83rem', color:'var(--text)', margin:'0.5rem 0 0', lineHeight:1.5 }}>{p.description}</p>}
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => setStatus(p.id, p.client_id, 'active')} disabled={saving === p.id}>{saving === p.id ? 'Saving…' : 'Approve'}</button>
                      <button className="btn btn-sm btn-outline" style={{ color:'#ff4fd8', borderColor:'rgba(255,79,216,0.3)' }} onClick={() => setStatus(p.id, p.client_id, 'rejected')} disabled={saving === p.id}>Reject</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
