'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import AdminSidebar from '@/components/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, timeAgo } from '@/lib/utils';
import type { SupportRequest, Ticket, TicketReply } from '@/lib/types';

type TicketRow = Ticket & { profiles: { full_name: string | null; company: string | null } | null };
type Filter = 'open' | 'in-progress' | 'resolved' | 'all';

const STATUS_OPTS = ['open', 'in-progress', 'resolved'] as const;
// Older rows were written as 'in_progress'; treat both spellings the same.
const statusValues = (f: Filter) => (f === 'in-progress' ? ['in-progress', 'in_progress'] : [f]);
const norm = (s: string) => s.replace('_', '-');
const statusBadge = (s: string) => (s === 'open' ? 'badge-open' : norm(s) === 'in-progress' ? 'badge-inprogress' : 'badge-resolved');

async function fetchTickets(filter: Filter) {
  const supabase = createClient();
  const q = supabase.from('tickets').select('*, profiles!client_id(full_name,company)').order('created_at', { ascending: false });
  const { data } = filter === 'all' ? await q : await q.in('status', statusValues(filter));
  return (data ?? []) as TicketRow[];
}

async function fetchRequests(filter: Filter) {
  const supabase = createClient();
  const q = supabase.from('support_requests').select('*').order('created_at', { ascending: false });
  const { data } = filter === 'all' ? await q : await q.in('status', statusValues(filter));
  return (data ?? []) as SupportRequest[];
}

export default function AdminTicketsPage() {
  const { boot, loading } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<'clients' | 'public'>('clients');
  const [filter, setFilter] = useState<Filter>('open');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [active, setActive] = useState<TicketRow | null>(null);
  const [activeReq, setActiveReq] = useState<SupportRequest | null>(null);
  const [messages, setMessages] = useState<TicketReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTickets = () => fetchTickets(filter).then(setTickets);
  const loadRequests = () => fetchRequests(filter).then(setRequests);

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    if (view === 'clients') fetchTickets(filter).then((rows) => { if (!cancelled) setTickets(rows); });
    else fetchRequests(filter).then((rows) => { if (!cancelled) setRequests(rows); });
    return () => { cancelled = true; };
  }, [boot, view, filter]);

  async function openThread(ticket: TicketRow) {
    setActive(ticket);
    const supabase = createClient();
    const { data } = await supabase.from('ticket_replies').select('*').eq('ticket_id', ticket.id).order('created_at');
    setMessages((data ?? []) as TicketReply[]);
    setReplyContent('');
  }

  async function updateStatus(table: 'tickets' | 'support_requests', id: string, status: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from(table).update({ status }).eq('id', id);
    setSaving(false);
    if (table === 'tickets') {
      setActive((prev) => (prev?.id === id ? { ...prev, status } : prev));
      loadTickets();
    } else {
      setActiveReq((prev) => (prev?.id === id ? { ...prev, status } : prev));
      loadRequests();
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim() || !active || !boot) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('ticket_replies').insert({
      ticket_id: active.id,
      author_id: boot.userId,
      author_name: boot.firstName,
      content: replyContent,
      is_admin: true,
    });
    setSaving(false);
    setReplyContent('');
    openThread(active);
  }

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const list = view === 'clients' ? tickets : requests;

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

        <div className="adm-toolbar">
          <div className="adm-seg" role="tablist" aria-label="Ticket source">
            <button role="tab" aria-selected={view === 'clients'} className={view === 'clients' ? 'is-active' : ''} onClick={() => { setView('clients'); setActiveReq(null); }}>Client tickets</button>
            <button role="tab" aria-selected={view === 'public'} className={view === 'public' ? 'is-active' : ''} onClick={() => { setView('public'); setActive(null); }}>Public requests</button>
          </div>
          <div className="adm-filters">
            {(['open', 'in-progress', 'resolved', 'all'] as Filter[]).map((s) => (
              <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)} style={{ textTransform:'capitalize' }}>{s.replace('-', ' ')}</button>
            ))}
          </div>
        </div>

        <div className="dash-two-col">
          <div className="dash-card">
            <p className="dash-card-title" style={{ marginBottom:'0.5rem' }}>{view === 'clients' ? 'Tickets' : 'Requests'} ({list.length})</p>
            {list.length === 0 && <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>None in this status.</p>}

            {view === 'clients' && tickets.map((t) => (
              <div key={t.id} className={`adm-inquiry-row${active?.id === t.id ? ' is-active' : ''}`} onClick={() => openThread(t)} style={{ cursor:'pointer', padding:'0.65rem 0.5rem', borderBottom:'1px solid var(--line)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:'0.5rem', marginBottom:'0.2rem' }}>
                  <p style={{ fontSize:'0.85rem', fontWeight:600, margin:0 }}>{t.title}</p>
                  <span className={`deliverable-badge ${statusBadge(t.status)}`}>{norm(t.status).replace('-', ' ')}</span>
                </div>
                <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>
                  {t.ticket_ref ? `${t.ticket_ref} · ` : ''}{t.profiles?.full_name || '—'} {t.profiles?.company ? `· ${t.profiles.company}` : ''} · {t.category} · {timeAgo(t.created_at)}
                </p>
              </div>
            ))}

            {view === 'public' && requests.map((r) => (
              <div key={r.id} className={`adm-inquiry-row${activeReq?.id === r.id ? ' is-active' : ''}`} onClick={() => setActiveReq(r)} style={{ cursor:'pointer', padding:'0.65rem 0.5rem', borderBottom:'1px solid var(--line)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:'0.5rem', marginBottom:'0.2rem' }}>
                  <p style={{ fontSize:'0.85rem', fontWeight:600, margin:0 }}>
                    {r.priority === 'urgent' && <span className="adm-urgent">Urgent</span>}{r.subject}
                  </p>
                  <span className={`deliverable-badge ${statusBadge(r.status)}`}>{norm(r.status).replace('-', ' ')}</span>
                </div>
                <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>{r.ref} · {r.full_name}{r.company ? ` · ${r.company}` : ''} · {r.topic} · {timeAgo(r.created_at)}</p>
              </div>
            ))}
          </div>

          {view === 'clients' && active && (
            <div className="dash-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
                <div>
                  <p className="dash-card-title" style={{ margin:'0 0 0.15rem' }}>{active.title}</p>
                  <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>{active.category} · opened {fmtDate(active.created_at)}</p>
                </div>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {STATUS_OPTS.map((s) => (
                    <button key={s} className={`btn btn-sm ${norm(active.status) === s ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform:'capitalize', fontSize:'0.72rem' }} onClick={() => updateStatus('tickets', active.id, s)} disabled={saving}>{s.replace('-', ' ')}</button>
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
                {messages.map((msg) => (
                  <div key={msg.id} className={`ticket-msg ticket-msg--${msg.is_admin ? 'admin' : 'client'}`}>
                    <p style={{ fontSize:'0.78rem', color:'var(--muted)', margin:'0 0 0.2rem', fontWeight:600 }}>{msg.is_admin ? `${msg.author_name || 'Admin'} (team)` : msg.author_name || 'Client'} · {timeAgo(msg.created_at)}</p>
                    <p style={{ fontSize:'0.85rem', margin:0, lineHeight:1.5 }}>{msg.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} style={{ marginTop:'0.75rem' }}>
                <textarea rows={2} placeholder="Send a reply…" className="adm-inline-input" style={{ width:'100%', resize:'vertical' }} required value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
                <button className="btn btn-sm btn-primary" type="submit" disabled={saving} style={{ marginTop:'0.5rem' }}>{saving ? 'Sending…' : 'Send reply'}</button>
              </form>
            </div>
          )}

          {view === 'public' && activeReq && (
            <div className="dash-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
                <div>
                  <p className="dash-card-title" style={{ margin:'0 0 0.15rem' }}>{activeReq.subject}</p>
                  <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>{activeReq.ref} · {activeReq.topic} · {activeReq.priority} priority · {fmtDate(activeReq.created_at)}</p>
                </div>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {STATUS_OPTS.map((s) => (
                    <button key={s} className={`btn btn-sm ${norm(activeReq.status) === s ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform:'capitalize', fontSize:'0.72rem' }} onClick={() => updateStatus('support_requests', activeReq.id, s)} disabled={saving}>{s.replace('-', ' ')}</button>
                  ))}
                </div>
              </div>
              <div className="adm-detail">
                <p><strong>From:</strong> {activeReq.full_name} · <a href={`mailto:${activeReq.email}?subject=${encodeURIComponent(`[${activeReq.ref}] ${activeReq.subject}`)}`} className="auth-link">{activeReq.email}</a></p>
                {activeReq.company && <p><strong>Company:</strong> {activeReq.company}</p>}
                {activeReq.store_url && <p><strong>Store:</strong> <a href={activeReq.store_url} target="_blank" rel="noreferrer" className="auth-link">{activeReq.store_url}</a></p>}
                <p style={{ whiteSpace:'pre-wrap', lineHeight:1.55 }}>{activeReq.description}</p>
              </div>
              <a className="btn btn-sm btn-primary" style={{ marginTop:'0.75rem' }} href={`mailto:${activeReq.email}?subject=${encodeURIComponent(`[${activeReq.ref}] ${activeReq.subject}`)}`}>Reply by email</a>
            </div>
          )}

          {((view === 'clients' && !active) || (view === 'public' && !activeReq)) && (
            <div className="dash-card" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
              <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>Select a {view === 'clients' ? 'ticket' : 'request'} to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
