import type { Metadata } from 'next';
import Image from 'next/image';
import BigCta from '@/components/site/BigCta';
import { CASE_STUDIES, TESTIMONIALS, photo } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Our Work — NexaLab',
  description: 'Online stores NexaLab has built and grown — and the numbers they moved.',
};

const INDUSTRIES = ['Fashion & apparel', 'Beauty & skincare', 'Consumer electronics', 'Home & living', 'Food & beverage', 'Health & wellness', 'Outdoor & sport', 'Boutique retail'];

export default function WorkPage() {
  return (
    <main>
      <section className="page-top">
        <div className="wrap">
          <p className="kicker">Our work</p>
          <h1 className="h-display">Stores we’ve built, <em>and the numbers they moved.</em></h1>
          <p className="lead">Every project starts with a goal you can measure — more orders, fewer stockouts, less wasted ad spend. Here’s how a few of them turned out.</p>
        </div>
      </section>

      <section className="sec sec-flush-top">
        <div className="wrap work-list">
          {CASE_STUDIES.map((c, i) => (
            <article key={c.client} className={`work-item rv ${i % 2 ? 'is-flipped' : ''}`}>
              <div className="work-img">
                <Image src={photo(c.photo, 1100, 800)} alt={`${c.client} project`} fill sizes="(max-width: 980px) 90vw, 55vw" />
              </div>
              <div className="work-copy">
                <p className="case-client">{c.client} · {c.industry}</p>
                <h2>{c.headline}</h2>
                <p>{c.summary}</p>
                <div className={`work-metric c-${c.color}`}>
                  <strong>{c.metric}</strong>
                  <span>{c.metricLabel}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sec sec-forest">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">In their words</p>
            <h2 className="h-section">What clients say <em>after launch.</em></h2>
          </div>
          <div className="quote-grid">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="quote quote-dark rv">
                <p>“{t.quote}”</p>
                <footer>
                  <Image src={photo(t.photo, 96, 96)} alt={t.name} width={44} height={44} />
                  <span><strong>{t.name}</strong>{t.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Who we work with</p>
            <h2 className="h-section">Brands selling physical products, online.</h2>
          </div>
          <div className="chip-row chip-row-lg rv">
            {INDUSTRIES.map((i) => <span key={i} className="chip">{i}</span>)}
          </div>
        </div>
      </section>

      <BigCta title="Want to be our next case study?" />
    </main>
  );
}
