'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendNotification } from '@/lib/utils';
import { CONTACT, person, photo } from '@/lib/site-data';
import type { Profile, Project } from '@/lib/types';

const STEPS = ['Welcome', 'Your business', 'Your goals', 'Kickoff call', 'All set'];

const PLATFORMS = [
  ['shopify', 'Shopify / Shopify Plus'], ['woocommerce', 'WooCommerce'], ['bigcommerce', 'BigCommerce'],
  ['magento', 'Magento / Adobe Commerce'], ['custom', 'Custom-built'], ['none', 'No store yet'], ['other', 'Other'],
];
const REVENUE = [['pre-revenue', 'Pre-revenue / launching'], ['under-50k', 'Under $50k / mo'], ['50k-200k', '$50k–$200k / mo'], ['200k-500k', '$200k–$500k / mo'], ['500k+', '$500k+ / mo']];
const BUDGET = [['$1k-$3k', '$1k – $3k / mo'], ['$3k-$7k', '$3k – $7k / mo'], ['$7k-$15k', '$7k – $15k / mo'], ['$15k+', '$15k+ / mo']];
const TIMELINE = [['asap', 'ASAP — within 2 weeks'], ['1-3mo', '1 – 3 months'], ['3-6mo', '3 – 6 months'], ['exploring', 'Just exploring']];
const SERVICES = [
  ['storefront', 'Store design & build'], ['inventory', 'Inventory & catalog'], ['fulfillment', 'Shipping & fulfillment'],
  ['analytics', 'Analytics & growth'], ['support', 'Ongoing support'], ['full-stack', 'All of the above'],
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIMES = ['Morning', 'Midday', 'Afternoon', 'Evening'];
const CHANNELS = [['video', 'Video call'], ['phone', 'Phone call'], ['email', 'Email first']];
const TIMEZONES = ['America/Toronto', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Vancouver', 'Europe/London', 'Europe/Berlin', 'Europe/Lisbon', 'Australia/Sydney'];

type Answers = {
  fullName: string; company: string; jobTitle: string; phone: string; website: string; platform: string; revenue: string;
  services: string[]; goal: string; budget: string; timeline: string; projectNotes: string;
  timezone: string; days: string[]; times: string[]; channel: string; notes: string;
  projectCreated?: boolean;
};

const EMPTY: Answers = {
  fullName: '', company: '', jobTitle: '', phone: '', website: '', platform: '', revenue: '',
  services: [], goal: '', budget: '', timeline: '', projectNotes: '',
  timezone: '', days: [], times: [], channel: 'video', notes: '',
};

const label = (list: string[][], v: string) => list.find(([k]) => k === v)?.[1] ?? v;

export default function OnboardingPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState('');
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const lead = person('Sofia Marchetti');
  const team = [person('Marcus Tan'), person('Al-Hamid (AJ)'), person('Hannah Brooks')];

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return; }
      const [{ data: profile }, { data: proj }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('projects').select('*').eq('client_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const p = profile as Profile | null;
      if (p?.role === 'admin') { router.replace('/admin'); return; }
      if (p?.onboarded_at) { router.replace('/dashboard'); return; }

      const saved = (p?.onboarding ?? {}) as { step?: number; answers?: Partial<Answers> };
      setA({
        ...EMPTY,
        fullName: p?.full_name ?? '',
        company: p?.company ?? '',
        jobTitle: p?.job_title ?? '',
        phone: p?.phone ?? '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...saved.answers,
      });
      setStep(Math.min(saved.step ?? 0, 3));
      setUserId(session.user.id);
      // Plan picked on the pricing page: saved on the account at signup, or in this browser.
      let pickedPlan = (session.user.user_metadata?.plan as string | undefined) ?? '';
      try { pickedPlan ||= localStorage.getItem('nexalab_plan') ?? ''; } catch { /* storage blocked */ }
      setPlan(pickedPlan);
      setEmail(session.user.email ?? '');
      setProject(proj as Project | null);
      setReady(true);

      // One-time welcome email from hello@nexalab.studio (the function skips repeats).
      if (!p?.welcome_sent_at) sendNotification('welcome', { name: p?.full_name ?? '' });
    });
  }, [router, supabase]);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((prev) => ({ ...prev, [k]: v }));
  const toggle = (k: 'services' | 'days' | 'times', v: string) =>
    setA((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }));

  function validate(s: number): string {
    if (s === 1) {
      if (!a.fullName.trim()) return 'Please add your name.';
      if (!a.company.trim()) return 'Please add your company or brand name.';
      if (!a.revenue) return 'Please pick your monthly revenue range.';
    }
    if (s === 2 && !project && !a.projectCreated) {
      if (a.services.length === 0) return 'Pick at least one thing we can help with.';
      if (!a.goal.trim()) return 'Tell us a little about your goal.';
      if (!a.budget) return 'Please pick a monthly budget range.';
    }
    if (s === 3) {
      if (a.days.length === 0 || a.times.length === 0) return 'Pick at least one day and one time that work for you.';
    }
    return '';
  }

  async function save(nextStep: number, extra: Partial<Answers> = {}, complete = false) {
    const answers = { ...a, ...extra };
    const { error: err } = await supabase.from('profiles').update({
      full_name: answers.fullName.trim(),
      company: answers.company.trim() || null,
      job_title: answers.jobTitle.trim() || null,
      phone: answers.phone.trim() || null,
      onboarding: { step: nextStep, answers },
      ...(complete ? { onboarded_at: new Date().toISOString() } : {}),
    }).eq('id', userId);
    return err;
  }

  async function next() {
    const msg = validate(step);
    if (msg) { setError(msg); return; }
    setError('');
    setSaving(true);
    let extra: Partial<Answers> = {};

    // Step 3 for new clients: create their intake + pending project, like the contact form.
    if (step === 2 && !project && !a.projectCreated) {
      const inquiryId = crypto.randomUUID();
      const { error: inqErr } = await supabase.from('inquiries').insert({
        id: inquiryId, full_name: a.fullName.trim(), work_email: email, company: a.company.trim() || null,
        website: a.website.trim() || null, platform: a.platform || null, revenue: a.revenue, budget: a.budget,
        timeline: a.timeline || null, services: a.services, goal: a.goal.trim(), plan: plan || null,
      });
      if (!inqErr) {
        const { data: proj } = await supabase.from('projects').insert({
          client_id: userId, inquiry_id: inquiryId, name: `${a.company.trim() || 'New'} project`, plan: plan || null,
          status: 'pending', description: 'Created during onboarding — awaiting review by the NexaLab team.',
        }).select().single();
        if (proj) setProject(proj as Project);
        extra = { projectCreated: true };
        try { localStorage.removeItem('nexalab_plan'); } catch { /* storage blocked */ }
      } else {
        setSaving(false);
        setError(`We couldn’t save your project details. Please try again or email ${CONTACT.email}.`);
        return;
      }
    }

    const complete = step === 3;
    const err = await save(step + 1, extra, complete);
    if (err) {
      setSaving(false);
      setError(`Something went wrong saving your answers. Please try again or email ${CONTACT.email}.`);
      return;
    }
    if (extra.projectCreated) setA((prev) => ({ ...prev, projectCreated: true }));

    if (complete) {
      await sendNotification('onboarding_complete_admin', {
        name: a.fullName, email, company: a.company, jobTitle: a.jobTitle, phone: a.phone, website: a.website,
        platform: label(PLATFORMS, a.platform), revenue: label(REVENUE, a.revenue), services: a.services.map((s) => label(SERVICES, s)),
        goal: a.goal || a.projectNotes, kickoffDays: a.days.join(', '), kickoffTimes: a.times.join(', '),
        timezone: a.timezone, channel: label(CHANNELS, a.channel), notes: a.notes,
      });
    }
    setSaving(false);
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  if (!ready) {
    return <div className="ob-loading"><span className="live-dot" /> Getting things ready…</div>;
  }

  const firstName = a.fullName.split(' ')[0] || 'there';

  return (
    <div className="ob">
      <header className="ob-top">
        <Link href="/" className="logo"><span className="logo-mark" aria-hidden="true"><span /></span>NexaLab</Link>
        <ol className="ob-steps" aria-label="Onboarding progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span>{i < step ? '✓' : i + 1}</span><em>{s}</em>
            </li>
          ))}
        </ol>
        <button className="lg-link ob-signout" onClick={signOut}>Sign out</button>
      </header>
      <div className="ob-progress" aria-hidden="true"><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>

      <main className="ob-body">
        <section className="ob-main">
          {step === 0 && (
            <div className="ob-panel">
              <p className="kicker">Step 1 of 5</p>
              <h1 className="ob-title">Welcome to NexaLab, <em>{firstName}.</em></h1>
              <p className="lead">We just sent a welcome note to <strong>{email}</strong>. The next few minutes help us understand your business, so your kickoff call starts with answers instead of questions.</p>
              <ol className="ob-timeline">
                <li><strong>Today</strong><span>Finish onboarding — about 3 minutes.</span></li>
                <li><strong>Within 1 business day</strong><span>Your account lead reaches out to book your kickoff.</span></li>
                <li><strong>Within 48h of kickoff</strong><span>A clear scope, timeline, and fixed price.</span></li>
                <li><strong>Day 1 of your sprint</strong><span>Your portal fills up with milestones and deliverables.</span></li>
              </ol>
            </div>
          )}

          {step === 1 && (
            <div className="ob-panel">
              <p className="kicker">Step 2 of 5</p>
              <h1 className="ob-title">Tell us about <em>your business.</em></h1>
              <div className="form-grid">
                <label className="form-field">Your name * <input value={a.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" placeholder="Jane Smith" /></label>
                <label className="form-field">Your role <input value={a.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} autoComplete="organization-title" placeholder="Founder, Head of Ecommerce…" /></label>
                <label className="form-field">Company / brand * <input value={a.company} onChange={(e) => set('company', e.target.value)} autoComplete="organization" placeholder="Acme Inc." /></label>
                <label className="form-field">Phone <input type="tel" value={a.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="416-555-0123" /></label>
                <label className="form-field">Website <input type="url" value={a.website} onChange={(e) => set('website', e.target.value)} placeholder="https://yourbrand.com" /></label>
                <label className="form-field">Store platform
                  <select value={a.platform} onChange={(e) => set('platform', e.target.value)}>
                    <option value="">Select platform</option>
                    {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="form-field">Monthly revenue *
                  <select value={a.revenue} onChange={(e) => set('revenue', e.target.value)}>
                    <option value="">Select range</option>
                    {REVENUE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="ob-panel">
              <p className="kicker">Step 3 of 5</p>
              <h1 className="ob-title">What should we <em>focus on?</em></h1>
              {project ? (
                <>
                  <div className="ob-project">
                    <span className="ob-project-tag">{project.status === 'pending' ? 'Under review' : project.status}</span>
                    <strong>{project.name}</strong>
                    <p>{project.status === 'pending'
                      ? 'We’ve got your project details and the team is reviewing them now.'
                      : 'Your project is set up and ready for kickoff.'}</p>
                  </div>
                  <label className="form-field form-field-full">Anything to add before kickoff?
                    <textarea rows={5} value={a.projectNotes} onChange={(e) => set('projectNotes', e.target.value)} placeholder="New goals, deadlines, links, or anything that’s changed since you got in touch." />
                  </label>
                </>
              ) : (
                <>
                  {plan && (
                    <p className="ob-plan">Plan: <strong>{plan}</strong> <Link href="/services#pricing" className="lg-link">compare plans</Link></p>
                  )}
                  <div className="form-section">
                    <p className="form-section-label">What can we help with? *</p>
                    <div className="checkbox-grid">
                      {SERVICES.map(([v, l]) => (
                        <label key={v} className="checkbox-field">
                          <input type="checkbox" checked={a.services.includes(v)} onChange={() => toggle('services', v)} />
                          <span className="checkbox-box" />{l}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="form-field form-field-full">Your main goal or challenge *
                    <textarea rows={5} value={a.goal} onChange={(e) => set('goal', e.target.value)} placeholder="What are you building or fixing? What does success look like in 6 months?" />
                  </label>
                  <div className="form-grid ob-gap">
                    <label className="form-field">Monthly budget *
                      <select value={a.budget} onChange={(e) => set('budget', e.target.value)}>
                        <option value="">Select budget</option>
                        {BUDGET.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                    <label className="form-field">Timeline
                      <select value={a.timeline} onChange={(e) => set('timeline', e.target.value)}>
                        <option value="">Select timeline</option>
                        {TIMELINE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="ob-panel">
              <p className="kicker">Step 4 of 5</p>
              <h1 className="ob-title">Let’s book your <em>kickoff call.</em></h1>
              <p className="lead">30 minutes with your account lead. Pick what usually works — we’ll send a calendar invite.</p>
              <div className="form-section">
                <p className="form-section-label">Best days *</p>
                <div className="ob-chips">
                  {DAYS.map((d) => <button type="button" key={d} className={`ob-chip ${a.days.includes(d) ? 'is-on' : ''}`} aria-pressed={a.days.includes(d)} onClick={() => toggle('days', d)}>{d}</button>)}
                </div>
              </div>
              <div className="form-section">
                <p className="form-section-label">Best times *</p>
                <div className="ob-chips">
                  {TIMES.map((t) => <button type="button" key={t} className={`ob-chip ${a.times.includes(t) ? 'is-on' : ''}`} aria-pressed={a.times.includes(t)} onClick={() => toggle('times', t)}>{t}</button>)}
                </div>
              </div>
              <div className="form-grid">
                <label className="form-field">Your time zone
                  <select value={a.timezone} onChange={(e) => set('timezone', e.target.value)}>
                    {[...new Set([a.timezone, ...TIMEZONES])].filter(Boolean).map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                  </select>
                </label>
                <label className="form-field">How should we meet?
                  <select value={a.channel} onChange={(e) => set('channel', e.target.value)}>
                    {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>
              <label className="form-field form-field-full">Anything we should know before the call?
                <textarea rows={3} value={a.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Who else should join, upcoming launches, things you’d like to cover…" />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="ob-panel ob-done">
              <span className="lg-done-icon" aria-hidden="true">🎉</span>
              <p className="kicker">All set</p>
              <h1 className="ob-title">You’re in, <em>{firstName}.</em></h1>
              <p className="lead">{lead.name.split(' ')[0]} will reach out within one business day to confirm your kickoff — usually much sooner.</p>
              <ul className="ob-summary">
                <li><span>Company</span><strong>{a.company}</strong></li>
                <li><span>Platform</span><strong>{a.platform ? label(PLATFORMS, a.platform) : '—'}</strong></li>
                <li><span>Kickoff</span><strong>{a.days.join(', ')} · {a.times.join(', ').toLowerCase()} · {label(CHANNELS, a.channel)}</strong></li>
                <li><span>Project</span><strong>{project?.name ?? 'Submitted for review'}</strong></li>
                {(plan || project?.plan) && <li><span>Plan</span><strong>{project?.plan || plan}</strong></li>}
              </ul>
              <div className="btn-row">
                <Link href="/dashboard" className="s-btn s-btn-tomato s-btn-lg">Go to my dashboard →</Link>
                <Link href="/support" className="s-btn s-btn-line s-btn-lg">Visit support</Link>
              </div>
            </div>
          )}

          {error && <p className="lg-error ob-error" aria-live="polite">{error}</p>}

          {step < 4 && (
            <div className="ob-nav">
              {step > 0 ? <button className="s-btn s-btn-line" onClick={back} disabled={saving}>← Back</button> : <span />}
              <button className="s-btn s-btn-tomato s-btn-lg" onClick={next} disabled={saving}>
                {saving ? 'Saving…' : step === 0 ? 'Let’s go →' : step === 3 ? 'Finish onboarding' : 'Continue →'}
              </button>
            </div>
          )}
        </section>

        <aside className="ob-side">
          <div className="ob-lead">
            <Image src={photo(lead.photo, 200, 200)} alt={lead.name} width={72} height={72} />
            <p className="host-label">Your account lead</p>
            <strong>{lead.name}</strong>
            <span>{lead.role} · {lead.city}</span>
            <p className="ob-lead-quote">“I’ll be your main point of contact from kickoff to launch — and long after. Reach out any time.”</p>
          </div>
          <div className="ob-team">
            <p className="host-label">Also on your team</p>
            <ul>
              {team.map((p) => (
                <li key={p.name}>
                  <Image src={photo(p.photo, 96, 96)} alt={p.name} width={40} height={40} />
                  <span><strong>{p.name}</strong>{p.role}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="ob-help">Need a hand? Call <a href={CONTACT.phoneHref}>{CONTACT.phone}</a> or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
        </aside>
      </main>
    </div>
  );
}
