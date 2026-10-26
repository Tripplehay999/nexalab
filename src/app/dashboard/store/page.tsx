'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import DashSidebar from '@/components/DashSidebar';
import { createClient } from '@/lib/supabase/client';
import { fmtDate } from '@/lib/utils';
import type { StoreIntegration, StoreOrder } from '@/lib/types';

export default function StorePage() {
  const { boot, loading } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [storeData, setStoreData] = useState<StoreIntegration | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);

  useEffect(() => {
    if (!boot) return;
    const supabase = createClient();
    const uid = boot.userId;

    async function load() {
      const [storeRes, ordersRes] = await Promise.all([
        supabase.from('store_integrations').select('id, client_id, platform, store_url, is_active, last_synced_at, created_at').eq('client_id', uid).eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('store_orders').select('*').eq('client_id', uid).order('ordered_at', { ascending: false }).limit(20),
      ]);
      setStoreData(storeRes.data);
      setOrders(ordersRes.data ?? []);
    }
    load();
  }, [boot]);

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const pending    = orders.filter((o) => o.status === 'pending').length;
  const processing = orders.filter((o) => o.status === 'processing').length;
  const latestDay  = orders.slice(0, 10);
  const dayRevenue = latestDay.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => { const s = o.status || 'unknown'; statusCounts[s] = (statusCounts[s] || 0) + 1; });

  return (
    <div className="dashboard-body">
      <DashSidebar clientName={boot.profile.full_name || boot.email} company={boot.profile.company || ''} initials={boot.initials} isOpen={menuOpen} onClose={closeMenu} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Store</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        {!storeData ? (
          <div className="dash-card" style={{ textAlign:'center', padding:'3rem 2rem' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🛍️</div>
            <h3 style={{ margin:'0 0 0.5rem', fontSize:'1.05rem' }}>No store connected yet</h3>
            <p style={{ color:'var(--muted)', fontSize:'0.88rem', margin:0 }}>Your NexaLab team will connect your store once it&apos;s ready. Live orders and revenue will appear here.</p>
          </div>
        ) : (
          <div>
            <div className="dash-two-col" style={{ marginBottom:'1rem' }}>
              <div className="dash-card">
                <p className="dash-card-title">Connection</p>
                <p style={{ fontSize:'0.85rem', color:'var(--text)', fontWeight:600 }}>{storeData.platform || 'Connected'}</p>
                <p style={{ fontSize:'0.78rem', color:'var(--muted)', marginTop:'0.25rem' }}>Last sync: {fmtDate(storeData.last_synced_at)}</p>
              </div>
              <div className="dash-card">
                <p className="dash-card-title">Sync schedule</p>
                <p className="store-sync-desc">Your store data syncs automatically every <strong>15 minutes</strong>. Contact your account lead via Support for an immediate refresh.</p>
              </div>
            </div>

            <div className="dash-stats" style={{ marginBottom:'1rem' }}>
              <div className="dash-stat-card"><p className="dash-stat-label">Revenue (last 10 orders)</p><p className="dash-stat-val">${dayRevenue.toLocaleString()}</p></div>
              <div className="dash-stat-card"><p className="dash-stat-label">Recent orders</p><p className="dash-stat-val">{latestDay.length}</p></div>
              <div className="dash-stat-card"><p className="dash-stat-label">Pending orders</p><p className="dash-stat-val">{pending}</p></div>
              <div className="dash-stat-card"><p className="dash-stat-label">Processing orders</p><p className="dash-stat-val">{processing}</p></div>
            </div>

            <div className="dash-two-col">
              <div className="dash-card">
                <p className="dash-card-title">Order status breakdown</p>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="store-order-row" style={{ display:'flex', justifyContent:'space-between', padding:'0.4rem 0', borderBottom:'1px solid var(--line)', fontSize:'0.83rem' }}>
                    <span style={{ textTransform:'capitalize' }}>{status}</span>
                    <span style={{ fontWeight:700 }}>{count}</span>
                  </div>
                ))}
              </div>
              <div className="dash-card">
                <p className="dash-card-title">Live order feed</p>
                {orders.slice(0, 8).map((o) => (
                  <div key={o.id} className="store-order-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0', borderBottom:'1px solid var(--line)', fontSize:'0.82rem', gap:'0.5rem' }}>
                    <span style={{ color:'var(--muted)', flexShrink:0 }}>#{o.external_id || o.id.slice(0,8)}</span>
                    <span style={{ flex:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{o.customer_name || '—'}</span>
                    <span style={{ fontWeight:700, flexShrink:0 }}>${Number(o.amount || 0).toFixed(2)}</span>
                    <span className={`dash-status ${o.status === 'shipped' ? 'status-shipped' : o.status === 'processing' ? 'status-processing' : 'status-pending'}`} style={{ flexShrink:0 }}>{o.status}</span>
                  </div>
                ))}
                {orders.length === 0 && <p style={{ color:'var(--muted)', fontSize:'0.82rem' }}>No orders yet.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
