import type { Metadata } from 'next';
import FitChecker from '@/components/FitChecker';

export const metadata: Metadata = {
  title: 'Who We Serve — NexaLab',
  description: 'Who NexaLab serves: startups, scaling brands, service businesses, and e-commerce teams.',
};

export default function WhoWeServePage() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">Who We Serve</p>
          <h1>Teams that care about execution quality, not just aesthetics.</h1>
        </div>
      </section>

      <section className="section">
        <div className="container service-grid">
          {[
            { title: 'Startups shipping their first serious website', desc: 'You need credibility, clarity, and speed without overbuilding.' },
            { title: 'Companies stuck with outdated UX', desc: 'Your current site creates friction and no longer reflects the business.' },
            { title: 'E-commerce operators scaling traffic', desc: 'You need ongoing iteration across storefront, checkout, and conversion data.' },
            { title: 'Service businesses improving lead quality', desc: 'You need clearer paths from ad/cold traffic to qualified conversations.' },
          ].map((card) => (
            <article key={card.title} className="card">
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <FitChecker />
        </div>
      </section>
    </main>
  );
}
