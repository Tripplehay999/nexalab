'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendNotification } from '@/lib/utils';
import { CONTACT } from '@/lib/site-data';
import HumanCheck, { Honeypot } from '@/components/HumanCheck';

const TOPICS = ['Orders & shipping', 'Payments & checkout', 'Store changes', 'Integrations', 'Reports & analytics', 'Billing & account', 'Something else'];

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', hint: 'Checkout or site down' },
  { value: 'high', label: 'High', hint: 'Something is broken' },
  { value: 'normal', label: 'Normal', hint: 'Changes & questions' },
  { value: 'planning', label: 'Planning', hint: 'Ideas & new work' },
];

type Client = { userId: string; name: string; email: string; projectId: string; projectName: string };

function newRef() {
  return `NX-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export default function TicketForm() {
  const [client, setClient] = useState<Client | null>(null);
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ ref: string; isClient: boolean } | null>(null);
  const [turnstile, setTurnstile] = useState('');
  const onToken = useCallback((t: string) => setTurnstile(t), []);
  const openedAt = useRef(0);
  useEffect(() => { openedAt.current = Date.now(); }, []);

  // Signed-in clients with a project file a real ticket on that project.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const [{ data: profile }, { data: project }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
        supabase.from('projects').select('id, name').eq('client_id', session.user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!project) return;
      setClient({
        userId: session.user.id,
        name: profile?.full_name || session.user.email || 'Client',
        email: session.user.email || '',
        projectId: project.id,
        projectName: project.name,
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => ((fd.get(k) as string) || '').trim();
    const fullName = client?.name ?? get('fullName');
    const email = client?.email ?? get('email');
    const topic = get('topic');
    const subject = get('subject');
    const description = get('description');

    if (!fullName || !email || !topic || !subject || !description) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    if (!client) {
      // Visitors go through the rate-limited server route (no direct database access).
      const res = await fetch('/api/forms/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName, email, company: get('company'), storeUrl: get('storeUrl'), topic, priority, subject, description,
          company_website: get('company_website'), _t: openedAt.current, turnstile,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || `We couldn’t submit your ticket. Please email ${CONTACT.support} or call ${CONTACT.phone}.`);
        setLoading(false);
        return;
      }
      setDone({ ref: j.ref, isClient: false });
      setLoading(false);
      return;
    }

    const ref = newRef();
    const { error: insertErr } = await createClient().from('tickets').insert({
      project_id: client.projectId,
      client_id: client.userId,
      title: priority === 'urgent' ? `[Urgent] ${subject}` : subject,
      description,
      category: topic,
      status: 'open',
      ticket_ref: ref,
    });

    if (insertErr) {
      setError(`We couldn’t submit your ticket. Please email ${CONTACT.support} or call ${CONTACT.phone}.`);
      setLoading(false);
      return;
    }

    await sendNotification('support_request_admin_alert', {
      ref, priority, topic, subject, description, name: fullName, email,
      storeUrl: get('storeUrl'), isClient: true,
    });

    setDone({ ref, isClient: true });
    setLoading(false);
  }

  if (done) {
    return (
      <div className="intake-success">
        <div className="success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="#17130E" strokeWidth="1.5" />
            <path d="M7 12l4 4 6-7" stroke="#17130E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>Ticket {done.ref} is open</h3>
        <p>
          {priority === 'urgent'
            ? 'Our on-call developer has been alerted. Expect a reply within 15 minutes.'
            : 'A real person will reply by email — usually within minutes during support hours.'}
        </p>
        {done.isClient
          ? <Link href="/dashboard/support" className="s-btn s-btn-ink">Track it in your portal</Link>
          : <button className="s-btn s-btn-line" onClick={() => setDone(null)}>Open another ticket</button>}
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <h2 className="form-title">Open a ticket</h2>
      <p className="form-subtitle">
        {client
          ? <>Signed in as <strong>{client.name}</strong> · this ticket will be added to <strong>{client.projectName}</strong>.</>
          : <>Fields marked * are required. Clients can <Link href="/auth" className="text-link">sign in</Link> to track tickets in the portal.</>}
      </p>

      {!client && (
        <div className="form-section">
          <p className="form-section-label">About you</p>
          <div className="form-grid">
            <label className="form-field">Full name * <input name="fullName" type="text" placeholder="Jane Smith" autoComplete="name" required /></label>
            <label className="form-field">Email * <input name="email" type="email" placeholder="jane@yourbrand.com" autoComplete="email" required /></label>
            <label className="form-field">Company / brand <input name="company" type="text" placeholder="Acme Inc." autoComplete="organization" /></label>
            <label className="form-field">Store URL <input name="storeUrl" type="url" placeholder="https://yourbrand.com" /></label>
          </div>
        </div>
      )}

      <div className="form-section">
        <p className="form-section-label">How urgent is it?</p>
        <div className="prio-grid" role="radiogroup" aria-label="Priority">
          {PRIORITIES.map((p) => (
            <label key={p.value} className={`prio prio-${p.value} ${priority === p.value ? 'is-on' : ''}`}>
              <input type="radio" name="priority" value={p.value} checked={priority === p.value} onChange={() => setPriority(p.value)} />
              <strong>{p.label}</strong>
              <span>{p.hint}</span>
            </label>
          ))}
        </div>
        {priority === 'urgent' && (
          <p className="prio-note">For outages, also call <a href={CONTACT.phoneHref}>{CONTACT.phone}</a> — the emergency line is answered 24/7.</p>
        )}
      </div>

      <div className="form-section">
        <p className="form-section-label">What’s going on?</p>
        <div className="form-grid">
          <label className="form-field">
            Topic *
            <select name="topic" required defaultValue="">
              <option value="" disabled>Select a topic</option>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="form-field">Subject * <input name="subject" type="text" placeholder="e.g. Discount codes not applying" maxLength={140} required /></label>
        </div>
        <label className="form-field form-field-full">
          Details *
          <textarea name="description" rows={5} placeholder="What happened, when it started, and any order numbers or links that help us find it." required />
        </label>
      </div>

      <Honeypot />
      {!client && <HumanCheck onToken={onToken} />}
      {error && <p className="error-text" aria-live="polite">{error}</p>}
      <div className="form-submit-row">
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit ticket'}
        </button>
        <p className="submit-note">You’ll get a reference number right away.</p>
      </div>
    </form>
  );
}
