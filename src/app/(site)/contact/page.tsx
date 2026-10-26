import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import IntakeForm from '@/components/IntakeForm';
import { LiveStatus } from '@/components/site/live';
import { CONTACT, person, photo } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Start a Project — NexaLab',
  description: 'Tell us about your brand. A NexaLab strategist will reply the same day with a plan for your store.',
};

const NEXT_STEPS = [
  { title: 'We read it today', body: 'A real person reviews every submission — usually within a few hours.' },
  { title: '30-minute call', body: 'No pitch deck. We look at your store together and map out the gaps.' },
  { title: 'Plan & price in 48h', body: 'A clear scope, timeline, and fixed price. No surprises.' },
  { title: 'Kickoff', body: 'Once you’re happy, we start right away. First results in week one.' },
];

export default function ContactPage() {
  const lead = person('Marcus Tan');
  return (
    <main>
      <section className="page-top page-top-sm">
        <div className="wrap">
          <LiveStatus openText="We’re online — expect a reply today" closedText="We’re offline — we’ll reply first thing" />
          <h1 className="h-display h-display-sm">Let’s talk about <em>your store.</em></h1>
          <p className="lead">Tell us a bit about your brand and what you need. You’ll hear back from a real strategist — not an auto-responder.</p>
        </div>
      </section>

      <section className="sec sec-flush-top">
        <div className="wrap contact-layout">
          <aside className="contact-side">
            <div className="host-card">
              <Image src={photo(lead.photo, 200, 200)} alt={lead.name} width={72} height={72} />
              <div>
                <p className="host-label">You’ll be talking to</p>
                <strong>{lead.name}</strong>
                <span>{lead.role}</span>
              </div>
              <p className="host-quote">“I personally read every new project request. Tell me what’s keeping you up at night and we’ll figure it out together.”</p>
            </div>

            <ol className="next-list">
              {NEXT_STEPS.map((s, i) => (
                <li key={s.title}>
                  <span>{i + 1}</span>
                  <div><strong>{s.title}</strong><p>{s.body}</p></div>
                </li>
              ))}
            </ol>

            <div className="direct">
              <p className="host-label">Prefer to reach out directly?</p>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              <Link href="/support">Already a client? Visit support →</Link>
            </div>
          </aside>

          <div className="form-card">
            <Suspense>
              <IntakeForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
