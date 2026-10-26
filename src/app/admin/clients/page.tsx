'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { createClient } from '@/lib/supabase/client';
import { PROJECT_STATUS, hostOf } from '@/lib/portal';
import { timeAgo } from '@/lib/utils';
import type { Assignment, Profile, Project } from '@/lib/types';
import AdminShell from '@/components/portal/AdminShell';
import { PortalLoading } from '@/components/portal/ClientShell';
import Avatar from '@/components/portal/Avatar';

type Row = Profile & { projects: Pick<Project, 'id' | 'name' | 'status' | 'plan'>[] | null; team: Assignment[] };
type Filter = 'all' | 'unassigned' | 'active' | 'pending' | 'onboarding';

async function loadClients(): Promise<Row[]> {
  const supabase = createClient();
  const [clients, assigns] = await Promise.all([
    supabase.from('profiles').select('*, projects(id,name,status,plan)').eq('role', 'client').order('created_at', { ascending: false }),
    supabase.from('client_assignments').select('*, staff(*)').order('is_primary', { ascending: false }),
  ]);
  const team = (assigns.data ?? []) as Assignment[];
  return ((clients.data ?? []) as Row[]).map((c) => ({ ...c, team: team.filter((a) => a.client_id === c.id && a.staff) }));
}

export default function AdminClientsPage() {
  const { boot, loading } = useAdmin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    loadClients().then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [boot]);

  if (loading || !boot) return <PortalLoading />;

  const q = search.toLowerCase();
  const shown = (rows ?? []).filter((c) => {
    const project = c.projects?.[0];
    if (filter === 'unassigned' && c.team.length) return false;
    if (filter === 'active' && project?.status !== 'active') return false;
    if (filter === 'pending' && project?.status !== 'pending') return false;
    if (filter === 'onboarding' && c.onboarded_at) return false;
    return !q || [c.full_name, c.company, c.email, c.website].some((v) => (v ?? '').toLowerCase().includes(q));
  });
  const count = (f: Filter) => (rows ?? []).filter((c) => {
    const p = c.projects?.[0];
    return f === 'all' || (f === 'unassigned' && !c.team.length) || (f === 'active' && p?.status === 'active') || (f === 'pending' && p?.status === 'pending') || (f === 'onboarding' && !c.onboarded_at);
  }).length;

  return (
    <AdminShell boot={boot} kicker="Clients" title={<>Your <em>clients.</em></>} subtitle="Open a client to manage their team, project, deliverables, insights, and resources.">
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input className="pt-input" type="search" placeholder="Search name, company, email or website…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>
      <div className="pt-tabbar" role="tablist" aria-label="Filter clients">
        {(['all', 'unassigned', 'active', 'pending', 'onboarding'] as Filter[]).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f === 'unassigned' ? 'No team' : f === 'onboarding' ? 'Still onboarding' : f} ({count(f)})
          </button>
        ))}
      </div>

      <section className="pt-card pt-card-flush">
        {rows === null ? <p className="pt-muted" style={{ padding: '1.2rem' }}>Loading…</p> : shown.length === 0 ? (
          <div className="pt-empty"><span className="pt-empty-icon">🔍</span><h3>No clients match</h3><p>Try a different search or filter.</p></div>
        ) : (
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead><tr><th>Client</th><th>Project</th><th>Team</th><th>Website</th><th>Joined</th></tr></thead>
              <tbody>
                {shown.map((c) => {
                  const p = c.projects?.[0];
                  const st = p ? PROJECT_STATUS[p.status] ?? { label: p.status, tone: '' } : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/clients/${c.id}`} className="pt-person">
                          <Avatar name={c.full_name || c.email || '?'} size={36} />
                          <div><strong>{c.full_name || '—'}</strong><span>{c.company || c.email}</span></div>
                        </Link>
                      </td>
                      <td>{p ? <><span className={`pt-pill tone-${st!.tone}`}>{st!.label}</span>{p.plan && <span className="pt-muted pt-small"> · {p.plan}</span>}</> : <span className="pt-muted">No project</span>}</td>
                      <td>
                        {c.team.length ? (
                          <div className="pt-avatars" title={c.team.map((a) => `${a.staff!.full_name} (${a.role})`).join(', ')}>
                            {c.team.slice(0, 4).map((a) => <Avatar key={a.id} name={a.staff!.full_name} src={a.staff!.photo_url} size={30} />)}
                          </div>
                        ) : <Link href={`/admin/clients/${c.id}?tab=team`} className="pt-pill tone-sun">Assign team</Link>}
                      </td>
                      <td className="pt-muted">{hostOf(c.website) || '—'}</td>
                      <td className="pt-muted">{timeAgo(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
