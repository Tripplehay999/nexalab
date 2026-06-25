'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import AdminSidebar from '@/components/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';

export default function AdminPage() {
  const { boot, loading } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({ clients: 0, activeProjects: 0, openTickets: 0, pendingInquiries: 0 });
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!boot) return;
    const supabase = createClient();

    async function load() {
      const [clientsRes, projectsRes, ticketsRes, inquiriesRes, actRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
        supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(8),
      ]);
      setStats({
        clients:          clientsRes.count ?? 0,
        activeProjects:   projectsRes.count ?? 0,
        openTickets:      ticketsRes.count ?? 0,
        pendingInquiries: inquiriesRes.count ?? 0,
      });
      setActivity(actRes.data ?? []);
    }
    load();
  }, [boot]);

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  return (
    <div className="dashboard-body">
      <AdminSidebar initials={boot.initials} adminName={boot.firstName} isOpen={menuOpen} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Admin Overview</h1></div>
          <div className="dash-topbar-right">
            <span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span>
            <div className="dash-avatar-sm" style={{ background:'linear-gradient(135deg,#ff4fd8,#7c5cfc)' }}>{boot.initials}</div>
          </div>
        </header>

        <div className="dash-stats">
          <div className="dash-stat-card"><p className="dash-stat-label">Total clients</p><p className="dash-stat-val">{stats.clients}</p></div>
          <div className="dash-stat-card"><p className="dash-stat-label">Active projects</p><p className="dash-stat-val">{stats.activeProjects}</p></div>
          <div className="dash-stat-card"><p className="dash-stat-label">Open tickets</p><p className="dash-stat-val" style={{ color: stats.openTickets > 0 ? '#ff4fd8' : undefined }}>{stats.openTickets}</p></div>
          <div className="dash-stat-card"><p className="dash-stat-label">Pending inquiries</p><p className="dash-stat-val" style={{ color: stats.pendingInquiries > 0 ? '#f59e0b' : undefined }}>{stats.pendingInquiries}</p></div>
        </div>

        <div className="dash-two-col" style={{ marginTop:'1rem' }}>
          <div className="dash-card">
            <p className="dash-card-title">Activity feed</p>
            <ul className="activity-list">
              {activity.length === 0
                ? <li style={{ color:'var(--muted)', fontSize:'0.82rem' }}>No recent activity.</li>
                : activity.map((a: any, i: number) => (
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
            <p className="dash-card-title">Quick actions</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {[
                { href:'/admin/inquiries', label:'Review new inquiries', count: stats.pendingInquiries },
                { href:'/admin/pending',   label:'Approve pending projects' },
                { href:'/admin/tickets',   label:'Respond to tickets', count: stats.openTickets },
                { href:'/admin/clients',   label:'View all clients' },
              ].map((a) => (
                <a key={a.href} href={a.href} className="dash-quicknav-card" style={{ flexDirection:'row', justifyContent:'space-between', padding:'0.6rem 0.9rem' }}>
                  <span style={{ fontSize:'0.85rem' }}>{a.label}</span>
                  {a.count !== undefined && a.count > 0 && <span className="dash-badge">{a.count}</span>}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
