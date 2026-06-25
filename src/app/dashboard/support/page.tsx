'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/useDashboard';
import DashSidebar from '@/components/DashSidebar';
import { createClient } from '@/lib/supabase/client';
import { timeAgo, fmtDate } from '@/lib/utils';

export default function SupportPage() {
  const { boot, loading } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'General', description: '' });
  const [replyContent, setReplyContent] = useState('');
  const [formError, setFormError] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!boot?.project) return;
    loadTickets();
  }, [boot]);

  async function loadTickets() {
    if (!boot?.project) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('project_id', boot.project.id)
      .order('created_at', { ascending: false });
    setTickets(data ?? []);
  }

  async function openTicket(ticket: any) {
    setActiveTicket(ticket);
    const supabase = createClient();
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at');
    setMessages(data ?? []);
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!boot?.project) return;
    setSubmitting(true); setFormError('');
    const supabase = createClient();
    const { error } = await supabase.from('tickets').insert({
      project_id: boot.project.id,
      client_id: boot.userId,
      title: form.title,
      category: form.category,
      description: form.description,
      status: 'open',
    });
    setSubmitting(false);
    if (error) { setFormError(error.message); return; }
    setForm({ title:'', category:'General', description:'' });
    setShowNewForm(false);
    loadTickets();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim() || !activeTicket) return;
    setSubmitting(true); setReplyError('');
    const supabase = createClient();
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: activeTicket.id,
      sender_id: boot!.userId,
      sender_role: 'client',
      content: replyContent,
    });
    setSubmitting(false);
    if (error) { setReplyError(error.message); return; }
    setReplyContent('');
    openTicket(activeTicket);
  }

  if (loading || !boot) return <div className="dashboard-body"><div className="dash-main" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><p style={{ color:'var(--muted)' }}>Loading…</p></div></div>;

  const openCount = tickets.filter((t) => t.status !== 'resolved').length;

  const statusBadge = (s: string) => {
    if (s === 'open') return 'badge-open';
    if (s === 'in_progress') return 'badge-inprogress';
    if (s === 'resolved') return 'badge-resolved';
    return '';
  };

  return (
    <div className="dashboard-body">
      <DashSidebar clientName={boot.profile.full_name || boot.email} company={boot.profile.company || ''} initials={boot.initials} isOpen={menuOpen} openTickets={openCount} />
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="dash-topbar-left"><h1 className="dash-page-title">Support</h1></div>
          <div className="dash-topbar-right"><span className="dash-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        </header>

        <div className="ticket-stats-bar" style={{ marginBottom:'1rem' }}>
          <span>Total: <strong>{tickets.length}</strong></span>
          <span>Open: <strong>{openCount}</strong></span>
          <span>Resolved: <strong>{tickets.filter((t) => t.status === 'resolved').length}</strong></span>
        </div>

        <div className="dash-two-col">
          {/* Left column: tickets */}
          <div>
            <div className="dash-card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', marginBottom:'0.75rem' }}>
                <p className="dash-card-title" style={{ margin:0 }}>
                  Your tickets
                  {openCount > 0 && <span className="dash-badge" style={{ marginLeft:'0.35rem' }}>{openCount}</span>}
                </p>
                <button className="btn btn-sm btn-primary" onClick={() => setShowNewForm((v) => !v)}>
                  {showNewForm ? 'Cancel' : '+ New ticket'}
                </button>
              </div>

              {showNewForm && (
                <form onSubmit={submitTicket} style={{ marginBottom:'1rem', borderBottom:'1px solid var(--line)', paddingBottom:'1rem' }}>
                  <p style={{ fontSize:'0.85rem', fontWeight:600, margin:'0 0 0.75rem' }}>Submit a new ticket</p>
                  <div className="form-grid">
                    <label className="form-field">Title * <input type="text" placeholder="Brief description" required value={form.title} onChange={(e) => setForm({...form, title:e.target.value})} /></label>
                    <label className="form-field">Category <select value={form.category} onChange={(e) => setForm({...form, category:e.target.value})}>
                      {['General','Bug report','Feature request','Billing','Account'].map((c) => <option key={c}>{c}</option>)}
                    </select></label>
                  </div>
                  <label className="form-field" style={{ marginTop:'0.5rem' }}>Description <textarea rows={3} placeholder="Describe the issue…" value={form.description} onChange={(e) => setForm({...form, description:e.target.value})} /></label>
                  {formError && <p className="auth-error">{formError}</p>}
                  <button className="btn btn-sm btn-primary" type="submit" disabled={submitting} style={{ marginTop:'0.75rem' }}>{submitting ? 'Submitting…' : 'Submit ticket'}</button>
                </form>
              )}

              {tickets.length === 0
                ? <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>No tickets yet. Submit one if you need help.</p>
                : (
                  <ul className="ticket-list" style={{ listStyle:'none', margin:0, padding:0 }}>
                    {tickets.map((t: any) => (
                      <li key={t.id} className={`ticket-item${activeTicket?.id === t.id ? ' is-active' : ''}`} onClick={() => openTicket(t)} style={{ cursor:'pointer', padding:'0.6rem 0.5rem', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.75rem' }}>
                        <div>
                          <p style={{ fontSize:'0.85rem', fontWeight:600, margin:0 }}>{t.title}</p>
                          <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:'0.15rem 0 0' }}>{t.category} · {timeAgo(t.created_at)}</p>
                        </div>
                        <span className={`deliverable-badge ${statusBadge(t.status)}`}>{t.status.replace('_',' ')}</span>
                      </li>
                    ))}
                  </ul>
                )
              }
            </div>

            {/* Thread panel */}
            {activeTicket && (
              <div className="dash-card" style={{ marginTop:'1rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setActiveTicket(null)}>← Back</button>
                  <div>
                    <p className="dash-card-title" style={{ margin:0 }}>{activeTicket.title}</p>
                    <p style={{ fontSize:'0.78rem', color:'var(--muted)', margin:'0.1rem 0 0' }}>{activeTicket.category} · opened {fmtDate(activeTicket.created_at)}</p>
                  </div>
                </div>
                <div className="ticket-messages">
                  {activeTicket.description && (
                    <div className="ticket-msg ticket-msg--client" style={{ marginBottom:'0.5rem' }}>
                      <p style={{ fontSize:'0.82rem', color:'var(--muted)', margin:'0 0 0.2rem', fontWeight:600 }}>You</p>
                      <p style={{ fontSize:'0.85rem', margin:0, lineHeight:1.5 }}>{activeTicket.description}</p>
                    </div>
                  )}
                  {messages.map((msg: any) => (
                    <div key={msg.id} className={`ticket-msg ticket-msg--${msg.sender_role}`}>
                      <p style={{ fontSize:'0.78rem', color:'var(--muted)', margin:'0 0 0.2rem', fontWeight:600 }}>{msg.sender_role === 'client' ? 'You' : 'NexaLab'} · {timeAgo(msg.created_at)}</p>
                      <p style={{ fontSize:'0.85rem', margin:0, lineHeight:1.5 }}>{msg.content}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendReply} style={{ marginTop:'0.75rem' }}>
                  <textarea rows={2} placeholder="Reply to this ticket…" style={{ width:'100%', resize:'vertical' }} required value={replyContent} onChange={(e) => setReplyContent(e.target.value)} className="adm-inline-input" />
                  {replyError && <p className="auth-error">{replyError}</p>}
                  <button className="btn btn-sm btn-primary" type="submit" disabled={submitting} style={{ marginTop:'0.5rem' }}>{submitting ? 'Sending…' : 'Send reply'}</button>
                </form>
              </div>
            )}
          </div>

          {/* Right column */}
          <div>
            <div className="dash-card support-lead-card">
              <p className="dash-card-title">Your account lead</p>
              <div className="lead-header">
                <div className="lead-avatar">NL</div>
                <div>
                  <p className="lead-name">NexaLab Team</p>
                  <p className="lead-role">Commerce Engineer</p>
                </div>
              </div>
              <div className="lead-details">
                <div className="lead-detail-row"><span className="lead-detail-label">Time zone</span><span>EST (UTC-5)</span></div>
                <div className="lead-detail-row"><span className="lead-detail-label">Response time</span><span>Same business day</span></div>
                <div className="lead-detail-row"><span className="lead-detail-label">Next check-in</span><span>Weekly</span></div>
              </div>
              <p style={{ marginTop:'0.75rem', fontSize:'0.82rem', color:'var(--muted)' }}>
                Reach us any time at <a href="mailto:hello@nexalab.io" className="auth-link">hello@nexalab.io</a>
              </p>
            </div>

            <div className="dash-card faq-card" style={{ marginTop:'1rem' }}>
              <p className="dash-card-title">Frequently asked questions</p>
              <div className="faq-list">
                {[
                  { q:'How do I access my deliverables?', a:'Go to the Deliverables page. Click "Download" for documents, "View repo" for code, or "Open" for links. Upcoming deliverables haven\'t been released yet.' },
                  { q:'What are your response times?', a:'We typically respond to support tickets within the same business day. For urgent issues, email hello@nexalab.io directly.' },
                  { q:'How do I report a bug or request a feature?', a:'Submit a ticket using "+ New ticket" and choose "Bug report" or "Feature request". Include screenshots and steps to reproduce.' },
                ].map((faq, i) => (
                  <details key={i} className="faq-item">
                    <summary className="faq-question">{faq.q}</summary>
                    <p className="faq-answer">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
