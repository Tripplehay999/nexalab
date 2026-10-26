'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import AdminShell from '@/components/portal/AdminShell';
import { PortalLoading } from '@/components/portal/ClientShell';
import { createClient } from '@/lib/supabase/client';
import { timeAgo, sendNotification } from '@/lib/utils';
import type { Project } from '@/lib/types';

type PendingProject = Project & { profiles: { full_name: string | null; email: string | null; company: string | null } | null };

async function fetchPending() {
  const supabase = createClient();
  const { data } = await supabase
    .from('projects')
    .select('*, profiles!client_id(full_name,email,company)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return (data ?? []) as PendingProject[];
}

export default function AdminPendingPage() {
  const { boot, loading } = useAdmin();
  const [projects, setProjects] = useState<PendingProject[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    fetchPending().then((rows) => { if (!cancelled) setProjects(rows); });
    return () => { cancelled = true; };
  }, [boot]);

  const loadPending = () => fetchPending().then(setProjects);

  async function setStatus(project: PendingProject, status: 'active' | 'rejected') {
    const { id: projectId, client_id: clientId } = project;
    setSaving(projectId);
    const supabase = createClient();
    await supabase.from('projects').update({ status }).eq('id', projectId);
    const emailData = { client_id: clientId, name: project.profiles?.full_name ?? '', plan: project.plan ?? '' };
    if (status === 'active') {
      await supabase.from('activity').insert({ project_id: projectId, text: 'Project approved and activated.', color: 'green' });
      await sendNotification('project_approved', emailData);
    } else {
      await sendNotification('project_rejected', emailData);
    }
    setSaving(null);
    loadPending();
  }

  if (loading || !boot) return <PortalLoading />;

  return (
    <AdminShell boot={boot} kicker="Pending projects" title={<>Waiting for <em>approval.</em></>} subtitle="Approving sends the client their “project approved” email and opens up their portal.">

        {projects.length === 0 ? (
          <div className="dash-card" style={{ textAlign:'center', padding:'3rem 2rem' }}>
            <p style={{ fontWeight:700, margin:'0 0 0.5rem' }}>All clear</p>
            <p style={{ color:'var(--muted)', fontSize:'0.88rem', margin:0 }}>No projects pending approval.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {projects.map((p) => {
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
                      <button className="btn btn-sm btn-primary" onClick={() => setStatus(p, 'active')} disabled={saving === p.id}>{saving === p.id ? 'Saving…' : 'Approve'}</button>
                      <button className="btn btn-sm btn-outline" style={{ color:'#FF9A7F', borderColor:'rgba(255,90,54,0.35)' }} onClick={() => setStatus(p, 'rejected')} disabled={saving === p.id}>Reject</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </AdminShell>
  );
}
