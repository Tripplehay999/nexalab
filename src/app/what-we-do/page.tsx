import type { Metadata } from 'next';
import Estimator from '@/components/Estimator';

export const metadata: Metadata = {
  title: 'What We Do — NexaLab',
  description: 'Service models at NexaLab: premium website builds and monthly growth retainers.',
};

export default function WhatWeDoPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">What We Do</p>
          <h1>Execution-first web and growth support.</h1>
          <p className="subtitle">Choose the model based on whether you need a full rebuild, ongoing velocity, or deeper e-commerce support.</p>
        </div>
      </section>

      <section className="section">
        <div className="container service-grid">
          {[
            { title: 'Website Rebuild', intro: 'For companies replacing an underperforming site.', items: ['Positioning and page architecture','Premium UI + frontend implementation','Tracking setup and launch QA'] },
            { title: 'Growth Retainer', intro: 'For teams with active campaigns and frequent changes.', items: ['Landing page and funnel updates','Performance and UX optimization','Monthly reporting and roadmap'] },
            { title: 'E-commerce Retainer', intro: 'For stores balancing catalog, checkout, and conversion pressure.', items: ['Storefront and checkout improvements','Merchandising and technical maintenance','Advanced integration ownership'] },
          ].map((card) => (
            <article key={card.title} className="card">
              <h3>{card.title}</h3>
              <p className="card-intro">{card.intro}</p>
              <ul className="list">
                {card.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Monthly Retainer Plans</h2>
          <p className="subtitle">Our retainers are built for teams that need dependable execution after launch, not one-off handoffs.</p>
          <div className="service-grid">
            {[
              { title: 'Starter Retainer', intro: 'For small businesses needing stability and core support.', items: ['Website maintenance & updates','Security monitoring','Hosting management','Minor content edits','Performance checks','Monthly reporting'] },
              { title: 'Growth Retainer', intro: 'For businesses scaling campaigns and lead generation.', items: ['Everything in Starter','Landing page creation','Conversion optimization','Funnel improvements','Analytics & tracking setup','CRM & email integrations','Priority support'] },
              { title: 'E-Commerce / Advanced Retainer', intro: 'For online stores and high-traffic businesses.', items: ['WooCommerce or Shopify management','Product uploads & optimization','Checkout optimization','Sales funnel improvements','A/B testing','Technical troubleshooting','Advanced integrations','Dedicated support hours'] },
            ].map((card) => (
              <article key={card.title} className="card">
                <h3>{card.title}</h3>
                <p className="card-intro">{card.intro}</p>
                <ul className="list">
                  {card.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <Estimator />
        </div>
      </section>
    </main>
  );
}
