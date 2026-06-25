import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Philosophy — NexaLab',
  description: 'How NexaLab approaches execution: practical, measurable, and consistent.',
};

export default function PhilosophyPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">Our Philosophy</p>
          <h1>The best websites are maintained systems, not static deliverables.</h1>
          <p className="subtitle">We focus on practical execution, clear ownership, and iteration you can measure.</p>
        </div>
      </section>

      <section className="section">
        <div className="container two-col">
          <article className="card">
            <h2>How we think</h2>
            <ul className="list">
              <li>Clarity beats complexity.</li>
              <li>Shipping beats endless planning.</li>
              <li>Evidence beats assumptions.</li>
              <li>Consistency beats one-time intensity.</li>
            </ul>
          </article>
          <article className="card">
            <h2>How we execute</h2>
            <ul className="list">
              <li>Prioritize work by expected business impact.</li>
              <li>Ship small changes continuously.</li>
              <li>Track outcomes and adjust direction quickly.</li>
              <li>Document decisions so momentum compounds.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <p className="section-label">Execution cadence</p>
          <h2>Our monthly rhythm: audit → implement → iterate.</h2>
          <div className="service-grid">
            <article className="card">
              <h3>1. Audit</h3>
              <p>Review analytics, campaign quality, form behavior, and technical friction to identify the highest-impact issues.</p>
            </article>
            <article className="card">
              <h3>2. Implement</h3>
              <p>Ship scoped improvements quickly: UX adjustments, tracking fixes, landing page enhancements, and speed work.</p>
            </article>
            <article className="card">
              <h3>3. Iterate</h3>
              <p>Measure results, re-prioritize for the next cycle, and stack incremental wins across every month.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
