import type { Metadata } from 'next';
import { Suspense } from 'react';
import IntakeForm from '@/components/IntakeForm';

export const metadata: Metadata = {
  title: 'Book a Demo — NexaLab',
  description:
    'Book a demo with NexaLab. Tell us about your brand and we\'ll map your complete commerce infrastructure.',
};

export default function ContactPage() {
  return (
    <main>
      <section className="page-hero contact-hero">
        <div className="container">
          <p className="eyebrow">Start your project</p>
          <h1>Let&apos;s build your commerce layer.</h1>
          <p className="subtitle">
            Tell us about your brand. We respond same-day and come prepared — no discovery fishing, just a focused conversation about your infrastructure.
          </p>
        </div>
      </section>

      <section className="section contact-section">
        <div className="container">
          <div className="contact-layout">

            <aside className="contact-sidebar">
              <div className="sidebar-block">
                <p className="sidebar-label">What happens next</p>
                <ol className="next-steps">
                  {[
                    { num: '01', title: 'We review your intake', body: 'Our team reads every submission — same day, usually within a few hours.' },
                    { num: '02', title: 'Strategy call (30 min)', body: 'No pitch deck. We map your stack, identify gaps, and outline the plan.' },
                    { num: '03', title: 'Proposal + timeline', body: 'Custom scope, deliverables list, and projected milestones — delivered within 48 h.' },
                    { num: '04', title: '14-day sprint kickoff', body: 'Once aligned, we start immediately. First deliverable within the first week.' },
                  ].map((step) => (
                    <li key={step.num} className="next-step">
                      <span className="next-num">{step.num}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="sidebar-block">
                <p className="sidebar-label">We specialize in</p>
                <ul className="service-chips">
                  {['Storefront engineering','Checkout optimization','Inventory & catalog ops','Fulfillment integration','Analytics & growth','Security & compliance'].map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="sidebar-block sidebar-trust">
                {['Same-day response guaranteed','No lock-in contracts','NDA on request','Dedicated account lead'].map((item) => (
                  <div key={item} className="trust-row-item">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#22d3a8" strokeWidth="1.5" />
                      <path d="M6 10l3 3 5-5" stroke="#22d3a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </aside>

            <div className="contact-form-wrap">
              <Suspense>
                <IntakeForm />
              </Suspense>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
