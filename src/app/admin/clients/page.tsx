'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import AdminSidebar from '@/components/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import { fmtDate } from '@/lib/utils';

export default function AdminClientsPage() {
  const { boot, loading } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!boot) return;
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('*, projects(id,name,status,plan)')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
      .then(({ data }) => setClients(data ?? []));
  }, [boot]);

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || (c.full_name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="dashboard-body">
      <AdminSidebar initials={boot.initials} adminName={boot.firstName} isOpen={menuOpen} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Clients</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        <div className="dash-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem', gap:'1rem', flexWrap:'wrap' }}>
            <p className="dash-card-title" style={{ margin:0 }}>All clients ({clients.length})</p>
            <input type="search" placeholder="Search by name, company or email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize:'0.82rem', padding:'0.45rem 0.75rem', background:'var(--card-raised)', border:'1px solid var(--line)', borderRadius:6, color:'var(--text)', outline:'none', minWidth:220 }} />
          </div>

          {filtered.length === 0
            ? <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>No clients found.</p>
            : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Company</th><th>Plan</th><th>Project</th><th>Status</th><th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c: any) => {
                      const project = c.projects?.[0];
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight:600 }}>{c.full_name || '—'}</div>
                            <div style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{c.email}</div>
                          </td>
                          <td>{c.company || '—'}</td>
                          <td>{project?.plan || '—'}</td>
                          <td>{project?.name || '—'}</td>
                          <td>{project ? <span className={`deliverable-badge ${project.status === 'active' ? 'badge-ready' : project.status === 'pending' ? 'badge-upcoming' : 'badge-draft'}`}>{project.status}</span> : <span style={{ color:'var(--muted)', fontSize:'0.8rem' }}>No project</span>}</td>
                          <td style={{ color:'var(--muted)', fontSize:'0.8rem' }}>{fmtDate(c.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
