'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import AdminSidebar from '@/components/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, timeAgo } from '@/lib/utils';

const STATUS_OPTS = ['open', 'in_progress', 'resolved'];

export default function AdminTicketsPage() {
  const { boot, loading } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [filter, setFilter] = useState('open');
  const [replyContent, setReplyContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!boot) return;
    loadTickets();
  }, [boot, filter]);

  async function loadTickets() {
    const supabase = createClient();
    const q = supabase.from('tickets').select('*, profiles!client_id(full_name,company)').order('created_at', { ascending: false });
    const { data } = filter === 'all' ? await q : await q.eq('status', filter);
    setTickets(data ?? []);
  }

  async function openThread(ticket: any) {
    setActive(ticket);
    const supabase = createClient();
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at');
    setMessages(data ?? []);
    setReplyContent('');
  }

  async function updateStatus(id: string, status: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('tickets').update({ status }).eq('id', id);
    setSaving(false);
    setActive((prev: any) => prev?.id === id ? { ...prev, status } : prev);
    loadTickets();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim() || !active) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('ticket_messages').insert({ ticket_id: active.id, sender_id: boot!.userId, sender_role: 'admin', content: replyContent });
    setSaving(false);
    setReplyContent('');
    openThread(active);
  }

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const statusBadge = (s: string) => s === 'open' ? 'badge-open' : s === 'in_progress' ? 'badge-inprogress' : 'badge-resolved';

  return (
    <div className="dashboard-body">
      <AdminSidebar initials={boot.initials} adminName={boot.firstName} isOpen={menuOpen} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Tickets</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
          {['open','in_progress','resolved','all'].map((s) => (
            <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-outline'}`} onClick={() => setFilter(s)} style={{ textTransform:'capitalize' }}>{s.replace('_',' ')}</button>
          ))}
        </div>

        <div className="dash-two-col">
          <div className="dash-card">
            <p className="dash-card-title" style={{ marginBottom:'0.5rem' }}>Tickets ({tickets.length})</p>
            {tickets.length === 0
              ? <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>None in this status.</p>
              : tickets.map((t: any) => (
                <div key={t.id} className={`adm-inquiry-row${active?.id === t.id ? ' is-active' : ''}`} onClick={() => openThread(t)} style={{ cursor:'pointer', padding:'0.65rem 0.5rem', borderBottom:'1px solid var(--line)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:'0.5rem', marginBottom:'0.2rem' }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:600, margin:0 }}>{t.title}</p>
                    <span className={`deliverable-badge ${statusBadge(t.status)}`}>{t.status.replace('_',' ')}</span>
                  </div>
                  <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>
                    {t.profiles?.full_name || '—'} {t.profiles?.company ? `· ${t.profiles.company}` : ''} · {t.category} · {timeAgo(t.created_at)}
                  </p>
                </div>
              ))
            }
          </div>

          {active ? (
            <div className="dash-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
                <div>
                  <p className="dash-card-title" style={{ margin:'0 0 0.15rem' }}>{active.title}</p>
                  <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>{active.category} · opened {fmtDate(active.created_at)}</p>
                </div>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {STATUS_OPTS.map((s) => (
                    <button key={s} className={`btn btn-sm ${active.status===s?'btn-primary':'btn-outline'}`} style={{ textTransform:'capitalize', fontSize:'0.72rem' }} onClick={() => updateStatus(active.id, s)} disabled={saving}>{s.replace('_',' ')}</button>
                  ))}
                </div>
              </div>

              <div className="ticket-messages">
                {active.description && (
                  <div className="ticket-msg ticket-msg--client" style={{ marginBottom:'0.5rem' }}>
                    <p style={{ fontSize:'0.78rem', color:'var(--muted)', margin:'0 0 0.2rem', fontWeight:600 }}>Client (original)</p>
                    <p style={{ fontSize:'0.85rem', margin:0, lineHeight:1.5 }}>{active.description}</p>
                  </div>
                )}
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`ticket-msg ticket-msg--${msg.sender_role}`}>
                    <p style={{ fontSize:'0.78rem', color:'var(--muted)', margin:'0 0 0.2rem', fontWeight:600 }}>{msg.sender_role === 'client' ? 'Client' : 'Admin (you)'} · {timeAgo(msg.created_at)}</p>
                    <p style={{ fontSize:'0.85rem', margin:0, lineHeight:1.5 }}>{msg.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} style={{ marginTop:'0.75rem' }}>
                <textarea rows={2} placeholder="Send a reply…" style={{ width:'100%', resize:'vertical', fontSize:'0.82rem', padding:'0.5rem', background:'var(--card-raised)', border:'1px solid var(--line)', borderRadius:6, color:'var(--text)' }} required value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
                <button className="btn btn-sm btn-primary" type="submit" disabled={saving} style={{ marginTop:'0.5rem' }}>{saving ? 'Sending…' : 'Send reply'}</button>
              </form>
            </div>
          ) : (
            <div className="dash-card" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
              <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>Select a ticket to view thread</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
