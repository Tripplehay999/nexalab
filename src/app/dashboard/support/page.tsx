'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';
import Avatar from '@/components/portal/Avatar';
import Icon from '@/components/portal/Icon';
import { fetchTeam } from '@/lib/portal';
import { createClient } from '@/lib/supabase/client';
import { timeAgo, fmtDate, sendNotification } from '@/lib/utils';
import type { Assignment, Ticket, TicketReply } from '@/lib/types';

async function fetchTickets(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Ticket[];
}

export default function SupportPage() {
  const { boot, loading } = useDashboard();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketReply[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'General', description: '' });
  const [replyContent, setReplyContent] = useState('');
  const [formError, setFormError] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [team, setTeam] = useState<Assignment[]>([]);

  const projectId = boot?.project?.id;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetchTickets(projectId).then((rows) => { if (!cancelled) setTickets(rows); });
    return () => { cancelled = true; };
  }, [projectId]);

  const userId = boot?.userId;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchTeam(userId).then((t) => { if (!cancelled) setTeam(t); });
    return () => { cancelled = true; };
  }, [userId]);

  function loadTickets() {
    if (projectId) fetchTickets(projectId).then(setTickets);
  }

  async function openTicket(ticket: Ticket) {
    setActiveTicket(ticket);
    const supabase = createClient();
    const { data } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at');
    setMessages((data ?? []) as TicketReply[]);
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!boot?.project) return;
    setSubmitting(true); setFormError('');
    const supabase = createClient();
    const ref = `NX-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const { error } = await supabase.from('tickets').insert({
      project_id: boot.project.id,
      client_id: boot.userId,
      title: form.title,
      category: form.category,
      description: form.description,
      status: 'open',
      ticket_ref: ref,
    });
    setSubmitting(false);
    if (error) { setFormError(error.message); return; }
    sendNotification('support_request_admin_alert', {
      ref, priority: 'normal', topic: form.category, subject: form.title, description: form.description,
      name: boot.profile.full_name || boot.email, email: boot.email, isClient: true,
    });
    setForm({ title:'', category:'General', description:'' });
    setShowNewForm(false);
    loadTickets();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim() || !activeTicket) return;
    setSubmitting(true); setReplyError('');
    const supabase = createClient();
    const { error } = await supabase.from('ticket_replies').insert({
      ticket_id: activeTicket.id,
      author_id: boot!.userId,
      author_name: boot!.profile.full_name || boot!.email,
      content: replyContent,
      is_admin: false,
    });
    setSubmitting(false);
    if (error) { setReplyError(error.message); return; }
    sendNotification('ticket_reply_admin', {
      clientName: boot!.profile.full_name || boot!.email,
      ticketRef: activeTicket.ticket_ref ?? '',
      ticketTitle: activeTicket.title,
      replyContent,
    });
    setReplyContent('');
    openTicket(activeTicket);
  }

  if (loading || !boot) return <PortalLoading />;

  const openCount = tickets.filter((t) => t.status !== 'resolved').length;
  const tone = (s: string) => (s === 'open' ? 'rose' : s === 'resolved' ? 'lime' : 'sun');
  const label = (s: string) => (s === 'open' ? 'Open' : s === 'resolved' ? 'Resolved' : 'In progress');
  const lead = team.find((a) => a.is_primary) ?? team[0];

  return (
    <ClientShell
      boot={boot}
      openTickets={openCount}
      kicker="Support"
      title={<>How can we <em>help?</em></>}
      subtitle="Ask anything — bugs, changes, ideas. A real person replies, usually within minutes during support hours (Mon–Fri 8am–8pm ET)."
      actions={boot.project ? <button className="pt-btn pt-btn-primary" onClick={() => { setShowNewForm(true); setActiveTicket(null); }}><Icon name="plus" size={16} /> New ticket</button> : null}
    >
      <div className="pt-grid pt-grid-main">
        <div className="pt-stack">
          {showNewForm && boot.project && (
            <section className="pt-card">
              <div className="pt-card-head"><h2 className="pt-card-title">New ticket</h2><button className="pt-link" onClick={() => setShowNewForm(false)}>Cancel</button></div>
              <form className="pt-form" onSubmit={submitTicket}>
                <label className="pt-field">What’s it about?<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Discount code isn’t applying at checkout" maxLength={140} /></label>
                <label className="pt-field">Type
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {['General', 'Bug report', 'Change request', 'Feature idea', 'Billing', 'Account'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="pt-field">Details<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened, where, and anything that helps us find it (order numbers, links, screenshots)." /></label>
                {formError && <p className="pt-error">{formError}</p>}
                <button className="pt-btn pt-btn-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send to the team'}</button>
              </form>
            </section>
          )}

          {activeTicket ? (
            <section className="pt-card">
              <div className="pt-card-head" style={{ alignItems: 'flex-start' }}>
                <div>
                  <button className="pt-link pt-small" onClick={() => setActiveTicket(null)}>← All tickets</button>
                  <h2 className="pt-card-title" style={{ marginTop: 6 }}>{activeTicket.title}</h2>
                  <p className="pt-card-sub">{activeTicket.ticket_ref ? `${activeTicket.ticket_ref} · ` : ''}{activeTicket.category} · opened {fmtDate(activeTicket.created_at)}</p>
                </div>
                <span className={`pt-pill tone-${tone(activeTicket.status)}`}>{label(activeTicket.status)}</span>
              </div>
              <div className="ticket-messages">
                {activeTicket.description && (
                  <div className="ticket-msg ticket-msg--client">
                    <p className="pt-small pt-muted" style={{ margin: '0 0 0.2rem', fontWeight: 600 }}>You · {timeAgo(activeTicket.created_at)}</p>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{activeTicket.description}</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`ticket-msg ticket-msg--${msg.is_admin ? 'admin' : 'client'}`}>
                    <p className="pt-small" style={{ margin: '0 0 0.2rem', fontWeight: 600, opacity: 0.75 }}>{msg.is_admin ? `${msg.author_name || 'NexaLab'} · NexaLab` : 'You'} · {timeAgo(msg.created_at)}</p>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>
                ))}
                {messages.length === 0 && <p className="pt-muted pt-small">No replies yet — we’ll email you as soon as someone responds.</p>}
              </div>
              {activeTicket.status !== 'resolved' && (
                <form className="pt-form" onSubmit={sendReply} style={{ marginTop: '0.8rem' }}>
                  <textarea className="pt-input" rows={3} placeholder="Write a reply…" required value={replyContent} onChange={(e) => setReplyContent(e.target.value)} style={{ minHeight: 90 }} />
                  {replyError && <p className="pt-error">{replyError}</p>}
                  <button className="pt-btn pt-btn-primary" disabled={submitting} style={{ justifySelf: 'start' }}>{submitting ? 'Sending…' : 'Send reply'}</button>
                </form>
              )}
            </section>
          ) : (
            <section className="pt-card">
              <div className="pt-card-head">
                <div><h2 className="pt-card-title">Your tickets</h2><p className="pt-card-sub">{openCount ? `${openCount} open` : 'Nothing open right now'}</p></div>
              </div>
              {!boot.project ? (
                <p className="pt-muted" style={{ margin: 0 }}>Tickets open once your project is set up. Until then, email <a href="mailto:hello@nexalab.studio" className="pt-link">hello@nexalab.studio</a> or call 416-206-1469.</p>
              ) : tickets.length === 0 ? (
                <div className="pt-empty">
                  <span className="pt-empty-icon">💬</span>
                  <h3>No tickets yet</h3>
                  <p>Need a change, spotted a bug, or have an idea? Open a ticket and we’ll take it from there.</p>
                  <button className="pt-btn pt-btn-primary pt-btn-sm" onClick={() => setShowNewForm(true)}><Icon name="plus" size={15} /> New ticket</button>
                </div>
              ) : (
                <ul className="pt-list">
                  {tickets.map((t) => (
                    <li key={t.id}>
                      <button className="pt-row pt-row-link pt-row-btn" onClick={() => { setShowNewForm(false); openTicket(t); }}>
                        <span className="pt-row-icon">🎫</span>
                        <div className="pt-row-main"><p className="pt-row-title">{t.title}</p><p className="pt-row-sub">{t.ticket_ref ? `${t.ticket_ref} · ` : ''}{t.category} · {timeAgo(t.created_at)}</p></div>
                        <span className={`pt-pill tone-${tone(t.status)}`}>{label(t.status)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="pt-stack">
          <section className="pt-card">
            <h2 className="pt-card-title">Your go-to person</h2>
            {lead?.staff ? (
              <div className="pt-person" style={{ marginTop: '0.9rem' }}>
                <Avatar name={lead.staff.full_name} src={lead.staff.photo_url} size={52} />
                <div><strong>{lead.staff.full_name}</strong><span>{lead.role}{lead.staff.city ? ` · ${lead.staff.city}` : ''}</span></div>
              </div>
            ) : (
              <p className="pt-muted" style={{ margin: '0.5rem 0 0' }}>Your account lead will appear here once assigned.</p>
            )}
            <ul className="pt-list" style={{ marginTop: '1rem' }}>
              <li className="pt-row"><span className="pt-row-icon"><Icon name="mail" size={18} /></span><div className="pt-row-main"><p className="pt-row-title">Email</p><p className="pt-row-sub"><a href={`mailto:${lead?.staff?.email || 'hello@nexalab.studio'}`}>{lead?.staff?.email || 'hello@nexalab.studio'}</a></p></div></li>
              <li className="pt-row"><span className="pt-row-icon"><Icon name="phone" size={18} /></span><div className="pt-row-main"><p className="pt-row-title">Phone</p><p className="pt-row-sub"><a href="tel:+14162061469">416-206-1469</a></p></div></li>
              <li className="pt-row"><span className="pt-row-icon">🚨</span><div className="pt-row-main"><p className="pt-row-title">Store down?</p><p className="pt-row-sub">Call now — our on-call developer answers 24/7 on Operate &amp; Scale plans.</p></div></li>
            </ul>
          </section>
          <section className="pt-card">
            <h2 className="pt-card-title">Quick answers</h2>
            {[
              ['How fast do you reply?', 'Usually within minutes during support hours. Urgent issues like checkout outages are picked up within 15 minutes, any time.'],
              ['Where are my files?', 'Everything we deliver lives in Deliverables — designs, documents, code, and links.'],
              ['Can I request a change?', 'Of course. Open a ticket with the “Change request” type and describe what you’d like.'],
            ].map(([q, a]) => (
              <details key={q} className="faq-item"><summary>{q}</summary><p className="faq-answer">{a}</p></details>
            ))}
          </section>
        </aside>
      </div>
    </ClientShell>
  );
}
