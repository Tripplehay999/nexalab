'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import DashSidebar from '@/components/DashSidebar';
import { createClient } from '@/lib/supabase/client';

export default function DeliverablesPage() {
  const { boot, loading } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deliverables, setDeliverables] = useState<any[]>([]);

  useEffect(() => {
    if (!boot?.project) return;
    const supabase = createClient();
    supabase
      .from('deliverables')
      .select('*')
      .eq('project_id', boot.project.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDeliverables(data ?? []));
  }, [boot]);

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const typeIcon: Record<string, string> = { document:'📄', repo:'💻', link:'🔗', design:'🎨', video:'🎥' };
  const groups = deliverables.reduce((acc: Record<string, any[]>, d: any) => {
    const g = d.category || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(d);
    return acc;
  }, {});

  return (
    <div className="dashboard-body">
      <DashSidebar clientName={boot.profile.full_name || boot.email} company={boot.profile.company || ''} initials={boot.initials} isOpen={menuOpen} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Deliverables</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        {deliverables.length === 0 ? (
          <div className="dash-card" style={{ textAlign:'center', padding:'3rem 2rem' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>📦</div>
            <h3 style={{ margin:'0 0 0.5rem', fontSize:'1.05rem' }}>No deliverables yet</h3>
            <p style={{ color:'var(--muted)', fontSize:'0.88rem', margin:0 }}>Files, repositories, and links will appear here as your project progresses.</p>
          </div>
        ) : (
          <div>
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="dash-card" style={{ marginBottom:'1rem' }}>
                <p className="dash-card-title">{group}</p>
                <div className="deliverable-list">
                  {items.map((d: any) => (
                    <div key={d.id} className="deliverable-item">
                      <span className="deliverable-icon">{typeIcon[d.type] || '📁'}</span>
                      <div className="deliverable-info">
                        <p className="deliverable-name">{d.name}</p>
                        {d.description && <p className="deliverable-desc">{d.description}</p>}
                      </div>
                      <div className="deliverable-actions">
                        <span className={`deliverable-badge ${d.status === 'ready' ? 'badge-ready' : d.status === 'upcoming' ? 'badge-upcoming' : 'badge-draft'}`}>{d.status}</span>
                        {d.status === 'ready' && d.url && (
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline" style={{ fontSize:'0.75rem' }}>
                            {d.type === 'repo' ? 'View repo' : d.type === 'document' ? 'Download' : 'Open'}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
