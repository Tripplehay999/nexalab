import type { Metadata } from 'next';
import Image from 'next/image';
import BigCta from '@/components/site/BigCta';
import { LiveStatus } from '@/components/site/live';
import TicketForm from '@/components/site/TicketForm';
import { CONTACT, SUPPORT_HOURS, SUPPORT_TEAM, person, photo } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Customer Support — NexaLab',
  description: 'Get help from real people. NexaLab support replies in minutes, monitors checkout 24/7, and gives every client a named account manager.',
};

const CHANNELS = [
  { icon: '🎫', title: 'Open a ticket', body: 'The fastest way to get anything done. Track progress in your client portal.', meta: 'Avg. first reply: 9 min', href: '#ticket', cta: 'Open a ticket', color: 'tomato' },
  { icon: '✉️', title: 'Email support', body: 'Send screenshots, details, and context — it all lands in the same queue.', meta: CONTACT.support, href: `mailto:${CONTACT.support}`, cta: 'Send an email', color: 'sky' },
  { icon: '📞', title: 'Call us', body: 'Prefer to talk it through? Ring the studio during support hours.', meta: CONTACT.phone, href: CONTACT.phoneHref, cta: 'Call the studio', color: 'lime' },
  { icon: '🚨', title: 'Emergency line', body: 'Checkout down or orders not coming through? Operate & Scale clients get a 24/7 line, answered by our on-call developers.', meta: `24/7 · ${CONTACT.phone}`, href: CONTACT.phoneHref, cta: 'Call the emergency line', color: 'lilac' },
];

const PRIORITIES = [
  { level: 'Urgent', example: 'Checkout down, payments failing, site offline', response: '15 minutes', hours: '24/7', tone: 'tomato' },
  { level: 'High', example: 'A feature is broken, orders not syncing', response: '1 hour', hours: 'Support hours', tone: 'sun' },
  { level: 'Normal', example: 'Content changes, new products, small tweaks', response: 'Same business day', hours: 'Support hours', tone: 'sky' },
  { level: 'Planning', example: 'New features, ideas, strategy questions', response: '2 business days', hours: 'Support hours', tone: 'lilac' },
];

const TOPICS = [
  { title: 'Orders & shipping', body: 'Tracking issues, label problems, carrier delays, returns.' },
  { title: 'Payments & checkout', body: 'Declines, refunds, discount codes, tax settings.' },
  { title: 'Store changes', body: 'New pages, products, banners, and seasonal updates.' },
  { title: 'Integrations', body: 'Inventory sync, apps, email tools, and connected accounts.' },
  { title: 'Reports & analytics', body: 'Understanding your numbers and weekly reports.' },
  { title: 'Billing & account', body: 'Invoices, plan changes, and team access.' },
];

const FAQ = [
  { q: 'How fast will someone reply?', a: 'During support hours our average first reply is under 10 minutes. Urgent issues like checkout outages are picked up within 15 minutes, any time of day.' },
  { q: 'Is support included in my plan?', a: 'Yes. Every plan includes support. Launch clients get 30 days after go-live; Operate and Scale clients get ongoing priority support plus the 24/7 emergency line.' },
  { q: 'Will I talk to the same person each time?', a: 'You’ll have a named account manager who knows your store. Day-to-day tickets are handled by our support team, who can see your full history.' },
  { q: 'Can you help if you didn’t build my store?', a: 'Often, yes. Get in touch and we’ll take a look — many of our clients came to us because their old setup needed rescuing.' },
];

const ON_CALL = person('Al-Hamid (AJ)');

export default function SupportPage() {
  return (
    <main>
      <section className="page-top support-top">
        <div className="wrap support-hero">
          <div>
            <LiveStatus openText="Support is online right now" closedText="Support is offline — emergency line still open" />
            <h1 className="h-display">Real humans. <em>Fast answers.</em></h1>
            <p className="lead">No bots, no call centers. When you need help with your store, you get people who know it — usually in under 10 minutes.</p>
            <div className="btn-row">
              <a href="#ticket" className="s-btn s-btn-tomato s-btn-lg">Open a ticket</a>
              <a href={`mailto:${CONTACT.support}`} className="s-btn s-btn-line s-btn-lg">Email support</a>
            </div>
            <p className="hours-note">{SUPPORT_HOURS.label} · Emergencies 24/7</p>
          </div>
          <div className="agent-card" aria-label="Support team on shift">
            <p className="agent-card-title">On shift today</p>
            <ul>
              {[ON_CALL, ...SUPPORT_TEAM].map((p, i) => (
                <li key={p.name}>
                  <span className="agent-photo">
                    <Image src={photo(p.photo, 120, 120)} alt={p.name} width={52} height={52} />
                    <span className={`agent-dot ${i === 4 ? 'is-away' : ''}`} aria-hidden="true" />
                  </span>
                  <span><strong>{p.name}</strong>{p.role} · {p.city}</span>
                </li>
              ))}
            </ul>
            <div className="agent-msg">
              <Image src={photo(SUPPORT_TEAM[0].photo, 80, 80)} alt="" width={28} height={28} />
              <p>“Hey! Just pushed the fix for your shipping rates — can you check an order on your end?”</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Get in touch</p>
            <h2 className="h-section">Pick whatever’s easiest.</h2>
          </div>
          <div className="channel-grid">
            {CHANNELS.map((c) => (
              <a key={c.title} href={c.href} className={`channel c-${c.color} rv`}>
                <span className="channel-icon" aria-hidden="true">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <span className="channel-meta">{c.meta}</span>
                <span className="svc-more">{c.cta} →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-paper2" id="ticket">
        <div className="wrap ticket-layout">
          <div className="ticket-side rv">
            <p className="kicker">Open a ticket</p>
            <h2 className="h-section">Tell us what’s wrong. <em>We’ll take it from here.</em></h2>
            <p className="sec-sub">Every ticket goes straight to a real person. You’ll get a reference number right away and a reply by email.</p>
            <div className="oncall-card">
              <Image src={photo(ON_CALL.photo, 160, 160)} alt={ON_CALL.name} width={64} height={64} />
              <div>
                <p className="host-label">On call right now</p>
                <strong>{ON_CALL.name}</strong>
                <span>{ON_CALL.role} · {ON_CALL.city}</span>
              </div>
            </div>
          </div>
          <div className="form-card">
            <TicketForm />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Response times</p>
            <h2 className="h-section">Our promise, <em>in writing.</em></h2>
            <p className="sec-sub">These are guaranteed response times for Operate and Scale clients. In practice we’re usually faster.</p>
          </div>
          <div className="sla rv" role="table" aria-label="Response times by priority">
            <div className="sla-row sla-head" role="row">
              <span role="columnheader">Priority</span><span role="columnheader">For things like</span><span role="columnheader">First response</span><span role="columnheader">Coverage</span>
            </div>
            {PRIORITIES.map((p) => (
              <div key={p.level} className="sla-row" role="row">
                <span role="cell"><span className={`sla-tag c-${p.tone}`}>{p.level}</span></span>
                <span role="cell">{p.example}</span>
                <span role="cell"><strong>{p.response}</strong></span>
                <span role="cell">{p.hours}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Your support team</p>
            <h2 className="h-section">The people <em>on the other end.</em></h2>
          </div>
          <div className="people-grid people-grid-light people-grid-4">
            {SUPPORT_TEAM.map((p) => (
              <figure key={p.name} className="person rv">
                <div className="person-img">
                  <Image src={photo(p.photo, 500, 600)} alt={p.name} fill sizes="(max-width: 640px) 45vw, 22vw" />
                  <p className="person-fun">{p.fun}</p>
                </div>
                <figcaption><strong>{p.name}</strong><span>{p.role} · {p.city}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-paper2">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">What we help with</p>
            <h2 className="h-section">If it touches your store, <em>we’ve got it.</em></h2>
          </div>
          <div className="topic-grid">
            {TOPICS.map((t) => (
              <div key={t.title} className="topic rv">
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap faq-wrap">
          <div className="sec-head rv">
            <p className="kicker">Support FAQ</p>
            <h2 className="h-section">Good to know.</h2>
          </div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q} className="faq-row">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <BigCta title="Not a client yet?" sub="Imagine having this team on your store. Tell us what you’re working on and we’ll reply today." />
    </main>
  );
}
