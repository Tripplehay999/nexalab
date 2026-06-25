'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import AdminSidebar from '@/components/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, timeAgo } from '@/lib/utils';

const STATUS_OPTS = ['new', 'reviewing', 'contacted', 'closed'];

export default function AdminInquiriesPage() {
  const { boot, loading } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [filter, setFilter] = useState('new');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!boot) return;
    loadInquiries();
  }, [boot, filter]);

  async function loadInquiries() {
    const supabase = createClient();
    const q = supabase.from('inquiries').select('*').order('created_at', { ascending: false });
    const { data } = filter === 'all' ? await q : await q.eq('status', filter);
    setInquiries(data ?? []);
  }

  async function updateStatus(id: string, status: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('inquiries').update({ status }).eq('id', id);
    setSaving(false);
    setActive((prev: any) => prev?.id === id ? { ...prev, status } : prev);
    loadInquiries();
  }

  async function saveNote() {
    if (!active) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('inquiries').update({ admin_note: note }).eq('id', active.id);
    setSaving(false);
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
          <div className="dash-topbar-left"><h1 className="dash-page-title">Inquiries</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
          {['new','reviewing','contacted','closed','all'].map((s) => (
            <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-outline'}`} onClick={() => setFilter(s)} style={{ textTransform:'capitalize' }}>{s}</button>
          ))}
        </div>

        <div className="dash-two-col">
          <div className="dash-card">
            <p className="dash-card-title" style={{ marginBottom:'0.5rem' }}>Inquiries ({inquiries.length})</p>
            {inquiries.length === 0
              ? <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>None in this status.</p>
              : inquiries.map((inq: any) => (
                <div key={inq.id} className={`adm-inquiry-row${active?.id === inq.id ? ' is-active' : ''}`} onClick={() => { setActive(inq); setNote(inq.admin_note || ''); }} style={{ cursor:'pointer', padding:'0.65rem 0.5rem', borderBottom:'1px solid var(--line)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:'0.5rem', marginBottom:'0.25rem' }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:600, margin:0 }}>{inq.name || inq.first_name || '—'} {inq.last_name || ''}</p>
                    <span className={`deliverable-badge ${inq.status === 'new' ? 'badge-open' : inq.status === 'reviewing' ? 'badge-inprogress' : 'badge-draft'}`}>{inq.status}</span>
                  </div>
                  <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>{inq.company || inq.email} · {timeAgo(inq.created_at)}</p>
                </div>
              ))
            }
          </div>

          {active ? (
            <div className="dash-card">
              <p className="dash-card-title">Inquiry detail</p>
              <div style={{ fontSize:'0.82rem', lineHeight:1.7 }}>
                <p><strong>Name:</strong> {active.first_name} {active.last_name}</p>
                <p><strong>Email:</strong> {active.email}</p>
                {active.company && <p><strong>Company:</strong> {active.company}</p>}
                {active.plan && <p><strong>Plan:</strong> {active.plan}</p>}
                {active.website && <p><strong>Website:</strong> <a href={active.website} target="_blank" rel="noopener noreferrer" style={{ color:'var(--purple)' }}>{active.website}</a></p>}
                {active.message && <div style={{ marginTop:'0.5rem', padding:'0.75rem', background:'var(--card-raised)', borderRadius:8 }}><p style={{ margin:0, whiteSpace:'pre-wrap' }}>{active.message}</p></div>}
                <p style={{ color:'var(--muted)', fontSize:'0.78rem', marginTop:'0.5rem' }}>Submitted {fmtDate(active.created_at)}</p>
              </div>

              <div style={{ marginTop:'1rem' }}>
                <p style={{ fontSize:'0.82rem', fontWeight:600, margin:'0 0 0.4rem' }}>Update status</p>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {STATUS_OPTS.map((s) => (
                    <button key={s} className={`btn btn-sm ${active.status===s?'btn-primary':'btn-outline'}`} style={{ textTransform:'capitalize' }} onClick={() => updateStatus(active.id, s)} disabled={saving}>{s}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop:'1rem' }}>
                <p style={{ fontSize:'0.82rem', fontWeight:600, margin:'0 0 0.4rem' }}>Internal note</p>
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={{ width:'100%', resize:'vertical', fontSize:'0.82rem', padding:'0.5rem', background:'var(--card-raised)', border:'1px solid var(--line)', borderRadius:6, color:'var(--text)' }} />
                <button className="btn btn-sm btn-primary" style={{ marginTop:'0.4rem' }} onClick={saveNote} disabled={saving}>{saving ? 'Saving…' : 'Save note'}</button>
              </div>
            </div>
          ) : (
            <div className="dash-card" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
              <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>Select an inquiry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
