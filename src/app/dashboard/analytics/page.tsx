'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import DashSidebar from '@/components/DashSidebar';
import { createClient } from '@/lib/supabase/client';

export default function AnalyticsPage() {
  const { boot, loading } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!boot?.project) return;
    const supabase = createClient();
    supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('project_id', boot.project.id)
      .order('snapshot_date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data && data.length > 0) { setAnalytics(data); setHasData(true); }
      });
  }, [boot]);

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const latest  = analytics[0];
  const prior   = analytics[1];
  const revDiff = latest && prior ? (Number(latest.revenue || 0) - Number(prior.revenue || 0)) : 0;
  const ordDiff = latest && prior ? (Number(latest.orders || 0) - Number(prior.orders || 0)) : 0;

  return (
    <div className="dashboard-body">
      <DashSidebar clientName={boot.profile.full_name || boot.email} company={boot.profile.company || ''} initials={boot.initials} isOpen={menuOpen} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Analytics</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        {!hasData ? (
          <div className="dash-card" style={{ textAlign:'center', padding:'3rem 2rem' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>📊</div>
            <h3 style={{ margin:'0 0 0.5rem', fontSize:'1.05rem' }}>Analytics coming soon</h3>
            <p style={{ color:'var(--muted)', fontSize:'0.88rem', margin:0 }}>Revenue trends and performance data will appear here once your store is live and tracking has been set up.</p>
          </div>
        ) : (
          <div>
            <div className="dash-stats" style={{ marginBottom:'1rem' }}>
              <div className="dash-stat-card">
                <p className="dash-stat-label">Revenue (latest snapshot)</p>
                <p className="dash-stat-val">${Number(latest.revenue || 0).toLocaleString()}</p>
                {prior && <p className={`dash-stat-sub ${revDiff >= 0 ? 'dash-stat-green' : 'dash-stat-warn'}`}>{revDiff >= 0 ? '+' : ''}{revDiff.toLocaleString()} vs prev</p>}
              </div>
              <div className="dash-stat-card">
                <p className="dash-stat-label">Orders (latest snapshot)</p>
                <p className="dash-stat-val">{Number(latest.orders || 0).toLocaleString()}</p>
                {prior && <p className={`dash-stat-sub ${ordDiff >= 0 ? 'dash-stat-green' : 'dash-stat-warn'}`}>{ordDiff >= 0 ? '+' : ''}{ordDiff} vs prev</p>}
              </div>
              <div className="dash-stat-card">
                <p className="dash-stat-label">Avg order value</p>
                <p className="dash-stat-val">{latest.orders ? '$' + (Number(latest.revenue || 0) / Number(latest.orders)).toFixed(2) : '—'}</p>
              </div>
              <div className="dash-stat-card">
                <p className="dash-stat-label">Conversion rate</p>
                <p className="dash-stat-val">{latest.conversion_rate ? `${Number(latest.conversion_rate).toFixed(1)}%` : '—'}</p>
              </div>
            </div>

            <div className="dash-card">
              <p className="dash-card-title">Revenue history</p>
              <div className="analytics-bar-chart">
                {[...analytics].reverse().map((snap: any, i: number) => {
                  const maxRev = Math.max(...analytics.map((a: any) => Number(a.revenue || 0)));
                  const pct = maxRev > 0 ? Math.round((Number(snap.revenue || 0) / maxRev) * 100) : 0;
                  return (
                    <div key={i} className="analytics-bar-col" title={`$${Number(snap.revenue || 0).toLocaleString()}`}>
                      <div className="analytics-bar-fill" style={{ height:`${Math.max(pct, 2)}%` }} />
                      <span className="analytics-bar-label">{new Date(snap.snapshot_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
