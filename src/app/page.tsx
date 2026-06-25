import type { Metadata } from 'next';
import Link from 'next/link';
import StatCounter from '@/components/StatCounter';
import FaqAccordion from '@/components/FaqAccordion';
import RevealWrapper from '@/components/RevealWrapper';

export const metadata: Metadata = {
  title: 'NexaLab — The Commerce OS for Serious Brands',
  description:
    'NexaLab is your complete commerce OS — storefront engineering, checkout, inventory, and shipping. One team, one system, zero gaps.',
};

const faqItems = [
  {
    question: 'How is NexaLab different from just using Shopify?',
    answer:
      "Shopify is a platform — you build on it yourself, or hire agencies piecemeal. NexaLab is an embedded team that builds, runs, and improves your entire commerce layer. You own all the code and data. We're not a SaaS subscription — we're your operating partner.",
  },
  {
    question: 'What does the 14-day sprint actually deliver?',
    answer:
      'A live, working store: secure storefront, integrated checkout, payment processor connected, event tracking set up, and at least one carrier integration. You get something real at the end — not a slide deck or a roadmap. Most brands are transacting within 14 days of kickoff.',
  },
  {
    question: 'Do I need to rebuild my entire existing store?',
    answer:
      "Not necessarily. We audit first. Some clients migrate fully, others get surgical upgrades to checkout, tracking, or fulfillment. We recommend what makes commercial sense — not what's easiest to sell. If your store is 80% fine, we'll focus on the 20% that's costing you money.",
  },
  {
    question: 'Do you physically handle my inventory or warehouse?',
    answer:
      "No — we're a software and operations layer, not a 3PL. We integrate with your existing warehouse or fulfillment partner (or help you find one), set up sync rules, and manage the data and routing. The physical goods stay with whoever holds them now.",
  },
  {
    question: 'What tech stacks and platforms do you support?',
    answer:
      "We're stack-agnostic. We've built on Shopify, WooCommerce, custom headless storefronts, and hybrid setups. We recommend a stack based on your volume, team size, and growth trajectory — not brand loyalty. If you already have a stack, we build on it unless there's a strong commercial reason to migrate.",
  },
  {
    question: 'Can I cancel the monthly retainer?',
    answer:
      'Yes. Month-to-month, no lock-in contracts. We earn your business every month by delivering measurable results. That said, compounding returns require time — most clients see the biggest impact in months 3–6 as experiments and infrastructure mature.',
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="saas-hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <p className="eyebrow">The Shopify alternative for serious brands</p>
            <h1>Commerce, built to<br /><span className="text-gradient">actually scale.</span></h1>
            <p className="hero-subtitle">
              NexaLab is your complete commerce OS — storefront engineering, checkout, inventory, and shipping. One team, one system, zero gaps.
            </p>
            <div className="hero-actions">
              <Link href="/contact" className="btn btn-primary">Start a 14-Day Sprint</Link>
              <Link href="/platform" className="btn btn-outline">See the Platform</Link>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars">
                <span>JM</span><span>SA</span><span>TK</span>
              </div>
              <span>Trusted by <strong>50+ brands</strong> across fashion, beauty &amp; tech</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="dash-mock">
              <div className="dash-topbar">
                <div className="dash-dots">
                  <div className="dash-dot r" /><div className="dash-dot y" /><div className="dash-dot g" />
                </div>
                <span className="dash-title">NexaLab — Store Dashboard</span>
                <span className="dash-badge">● Live</span>
              </div>
              <div className="dash-body">
                <div className="dash-metrics">
                  <div className="dash-metric"><div className="dash-metric-label">Revenue</div><div className="dash-metric-val">$48.2k</div><div className="dash-metric-delta">↑ 18% MTD</div></div>
                  <div className="dash-metric"><div className="dash-metric-label">Orders</div><div className="dash-metric-val">1,284</div><div className="dash-metric-delta">↑ 12%</div></div>
                  <div className="dash-metric"><div className="dash-metric-label">Conv. Rate</div><div className="dash-metric-val">3.8%</div><div className="dash-metric-delta">↑ 0.4pp</div></div>
                </div>
                <div className="dash-section-label">Recent Orders</div>
                <div className="dash-orders">
                  {[
                    { id: '#4821', name: 'Air Force Gel Kit', amt: '$124', status: 'status-shipped', label: 'Shipped' },
                    { id: '#4820', name: 'Glow Serum Bundle', amt: '$89', status: 'status-processing', label: 'Processing' },
                    { id: '#4819', name: 'Wireless Earbuds Pro', amt: '$249', status: 'status-shipped', label: 'Shipped' },
                    { id: '#4818', name: 'Streetwear Hoodie XL', amt: '$78', status: 'status-pending', label: 'Pending' },
                  ].map((o) => (
                    <div key={o.id} className="dash-order">
                      <span className="dash-order-id">{o.id}</span>
                      <span className="dash-order-name">{o.name}</span>
                      <span className="dash-order-amt">{o.amt}</span>
                      <span className={`dash-status ${o.status}`}>{o.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="trust-bar">
        <div className="container">
          <div className="trust-bar-inner">
            <p className="trust-label">Powering brands in fashion, beauty, electronics &amp; more</p>
            <div className="trust-logos">
              {['Vantage Studio', 'Lumière Co.', 'AeroKit', 'Driftwood Supply', 'Nuveau Label'].map((n) => (
                <span key={n} className="trust-logo">{n}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <StatCounter items={[
        { count: 12, prefix: '$', suffix: 'M+', label: 'GMV Managed' },
        { count: 50, suffix: '+', label: 'Brands Served' },
        { count: 99.9, suffix: '%', decimals: 1, label: 'Platform Uptime' },
        { count: 40, suffix: '+', label: 'Carrier & Tool Integrations' },
      ]} />

      {/* ── Platform modules ── */}
      <RevealWrapper>
        <section className="section" id="features">
          <div className="container">
            <p className="section-label">The Platform</p>
            <h2>Everything your brand needs — built in.</h2>
            <p className="subtitle">From your first product page to your 10,000th fulfilled order, NexaLab handles every layer.</p>
            <div className="module-grid">
              {[
                { color: 'rgba(124,92,252,0.15),rgba(255,79,216,0.08)', stroke: '#a78bfa', title: 'Storefront & Checkout', desc: 'Fast, secure storefronts engineered for conversion. Custom checkout flows, payment integrations, and PCI hygiene baked in from day one.', path: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8h14M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z' },
                { color: 'rgba(34,211,168,0.13),rgba(34,211,168,0.04)', stroke: '#22d3a8', title: 'Inventory & Catalog', desc: 'Product data, variant management, and automated syncs across channels and warehouses. No more oversells or stockout surprises.', path: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                { color: 'rgba(251,191,36,0.13),rgba(251,191,36,0.04)', stroke: '#fbbf24', title: 'Fulfillment & Shipping', desc: 'Carrier integrations, routing rules, and manifest automation. Predictable delivery with real-time tracking your customers actually trust.', path: null },
                { color: 'rgba(239,68,68,0.1),rgba(239,68,68,0.04)', stroke: '#f87171', title: 'Analytics & Growth Ops', desc: 'Event taxonomy, attribution, and a monthly experiment pipeline. We turn your data into compounding revenue — not just dashboards.', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              ].map((m) => (
                <div key={m.title} className="module-card">
                  <div className="module-icon" style={{ background: `linear-gradient(135deg,${m.color})` }}>
                    <svg fill="none" stroke={m.stroke} strokeWidth="1.8" viewBox="0 0 24 24">
                      {m.title === 'Fulfillment & Shipping' ? (
                        <>
                          <rect x="1" y="3" width="15" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16 8h4l3 5v3h-7V8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </>
                      ) : (
                        <path d={m.path!} strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
                  </div>
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealWrapper>

      {/* ── How it works ── */}
      <section className="section-alt">
        <div className="container">
          <p className="section-label">How it works</p>
          <h2>Launch fast. Own the stack. Grow every month.</h2>
          <div className="steps-grid">
            <div className="step"><div className="step-num">01</div><h3>Clarify &amp; Map</h3><p>We audit your current stack, define KPIs, and map every gap in your commerce layer — from checkout friction to fulfillment delays.</p></div>
            <div className="step"><div className="step-num">02</div><h3>Build &amp; Secure</h3><p>14-day sprint to ship a secure storefront, integrated checkout, and full event tracking. You get a working system — not a proposal deck.</p></div>
            <div className="step"><div className="step-num">03</div><h3>Operate &amp; Compound</h3><p>Retained monthly ops: inventory syncs, A/B experiments, carrier SLAs, and analytics. Your store keeps improving every month.</p></div>
          </div>
        </div>
      </section>

      {/* ── Operation Model ── */}
      <section className="section" id="model">
        <div className="container">
          <p className="section-label">The Model</p>
          <h2>Not an agency. Not a SaaS.<br /><span className="text-gradient">An embedded commerce team.</span></h2>
          <p className="subtitle">Two interlocked phases — an intensive sprint to launch, then compounding monthly ops. One team across your entire commerce layer, from day one to year three.</p>
          <div className="model-phases">
            <div className="model-phase">
              <div className="model-phase-top">
                <span className="model-tag sprint-tag">Phase 01</span>
                <span className="model-phase-time">Weeks 1–2</span>
              </div>
              <h3>The Sprint</h3>
              <p>Intensive build period. We audit your stack, map every gap, and ship live infrastructure — checkout, inventory, tracking, carriers — all inside 14 days. No proposal decks. No discovery phases that last 6 weeks.</p>
              <ul className="model-list">
                <li>Commerce stack audit &amp; KPI mapping</li>
                <li>Storefront engineering &amp; checkout setup</li>
                <li>Payment processor &amp; carrier integration</li>
                <li>Event tracking &amp; analytics foundation</li>
                <li>Security review &amp; PCI hygiene</li>
              </ul>
              <div className="model-outcome"><span className="outcome-dot sprint-dot" /><span>End of sprint: a live, transacting store</span></div>
            </div>
            <div className="model-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="model-phase ops-featured">
              <div className="model-phase-top">
                <span className="model-tag ops-tag">Phase 02</span>
                <span className="model-phase-time">Month-to-month</span>
              </div>
              <h3>The Ops Layer</h3>
              <p>Your embedded team owns ongoing operations — inventory syncs, fulfillment routing, A/B experiments, and attribution. Every month builds on the last. Results compound, costs don&apos;t.</p>
              <ul className="model-list">
                <li>Inventory sync &amp; catalog management</li>
                <li>Carrier &amp; fulfillment ops oversight</li>
                <li>Monthly A/B experiment pipeline</li>
                <li>Attribution analysis &amp; spend optimization</li>
                <li>Weekly SLA reports &amp; quarterly strategy reviews</li>
              </ul>
              <div className="model-outcome"><span className="outcome-dot ops-dot" /><span>Month over month: compounding growth</span></div>
            </div>
          </div>
          <div className="model-cadence">
            <p className="model-cadence-title">Your operating cadence</p>
            <div className="cadence-grid">
              {[
                { freq: 'Daily', desc: 'Inventory & order health monitoring' },
                { freq: 'Weekly', desc: 'Performance report & carrier SLA review' },
                { freq: 'Monthly', desc: 'Experiment results & new growth hypothesis' },
                { freq: 'Quarterly', desc: 'Full commerce stack review & strategy session' },
              ].map((c) => (
                <div key={c.freq} className="cadence-item">
                  <span className="cadence-freq">{c.freq}</span>
                  <p className="cadence-desc">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why NexaLab ── */}
      <section className="section">
        <div className="container">
          <p className="section-label">Why NexaLab</p>
          <h2>A platform built around your team — not templates.</h2>
          <p className="subtitle">Shopify gives you a store. NexaLab gives you an operating system.</p>
          <div className="compare-grid">
            <div className="compare-col nexalab">
              <p className="compare-col-label">✦ NexaLab</p>
              <ul className="compare-list">
                {['Custom storefront engineered to your brand','Checkout built for conversion, not templates','Inventory + shipping as a managed service','Retained growth ops — we own the numbers','One team across site, ops, and analytics','PCI hygiene and security built-in'].map((item) => (
                  <li key={item}><i className="icon">✓</i> {item}</li>
                ))}
              </ul>
            </div>
            <div className="compare-col others">
              <p className="compare-col-label">Generic alternatives</p>
              <ul className="compare-list">
                {['Locked into platform templates and limits','Transaction fees that compound at scale','Shipping and inventory left to you','Analytics dashboards but no action on data','Stitching 8 different tools yourself','Security add-ons cost extra'].map((item) => (
                  <li key={item}><i className="icon">✗</i> {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <RevealWrapper>
        <section className="section-alt">
          <div className="container">
            <p className="section-label">What brands say</p>
            <h2>Results speak louder than promises.</h2>
            <div className="testimonials-grid">
              {[
                { quote: 'NexaLab rebuilt our checkout in under two weeks. Cart abandonment dropped 22% in the first month. That\'s not a vendor relationship — that\'s an embedded team.', name: 'Jordan M.', role: 'CEO, Vantage Studio', initials: 'JM', grad: '#7c5cfc,#ff4fd8', metric: '−22% abandonment' },
                { quote: 'We were managing inventory across three spreadsheets. NexaLab synced our warehouse and storefront in a week. Stockouts are basically a thing of the past now.', name: 'Simone A.', role: 'Founder, Lumière Co.', initials: 'SA', grad: '#22d3a8,#3b82f6', metric: '−94% stockouts' },
                { quote: 'The attribution work alone was worth it. We found out 60% of our Meta spend was wasted. First month ROI was 4x the retainer cost — and that\'s the floor, not the ceiling.', name: 'Theo K.', role: 'Head of Growth, AeroKit', initials: 'TK', grad: '#f59e0b,#ef4444', metric: '4× retainer ROI' },
              ].map((t) => (
                <div key={t.initials} className="testimonial-card">
                  <p className="testimonial-quote">{t.quote}</p>
                  <div className="testimonial-footer">
                    <div className="testimonial-avatar" style={{ background: `linear-gradient(135deg,${t.grad})` }}>{t.initials}</div>
                    <div className="testimonial-meta">
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role">{t.role}</div>
                    </div>
                    <span className="testimonial-metric">{t.metric}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealWrapper>

      {/* ── Integrations ── */}
      <section className="section">
        <div className="container integrations-container">
          <p className="section-label">Integrations</p>
          <h2>Works with the tools you already use.</h2>
          <p className="subtitle">NexaLab connects to your existing payment processors, carriers, analytics, and marketing stack — no ripping and replacing.</p>
          <div className="integrations-categories">
            {[
              { label: 'Payments', chips: [['Stripe','#635bff'],['PayPal','#0070e0'],['Klarna','#ffb3c7'],['Afterpay','#b2fce4']] },
              { label: 'Shipping & Fulfillment', chips: [['FedEx','#4d148c'],['UPS','#351c15'],['DHL','#ffcc00'],['USPS','#333399'],['ShipStation','#85c8fa'],['EasyPost','#5cb85c']] },
              { label: 'Analytics & Marketing', chips: [['Google Analytics','#e8710a'],['Meta Pixel','#0081fb'],['Klaviyo','#ff6900'],['TikTok Pixel','#010101']] },
              { label: 'Platforms & Ops', chips: [['Shopify','#95bf47'],['WooCommerce','#7f54b3'],['Zapier','#ff5900'],['Slack','#4a154b']] },
            ].map((g) => (
              <div key={g.label} className="integrations-group">
                <span className="integrations-group-label">{g.label}</span>
                <div className="integrations-chips">
                  {g.chips.map(([name, color]) => (
                    <span key={name} className="integration-chip">
                      <span className="chip-dot" style={{ background: color }} />{name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <RevealWrapper>
        <section className="section-alt" id="pricing">
          <div className="container">
            <p className="section-label">Pricing</p>
            <h2>Pick your starting point.</h2>
            <p className="subtitle">Every engagement includes full access to your team, code, and data. No lock-in.</p>
            <div className="pricing-grid">
              <div className="pricing-card">
                <h3>Launch</h3>
                <p className="muted" style={{ fontSize: '0.85rem', margin: '0.3rem 0 0.6rem' }}>Store build &amp; setup</p>
                <p className="price"><sup>$</sup>3,500<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--muted)' }}>+</span></p>
                <p className="price-note">One-time project fee</p>
                <ul className="pricing-features">
                  {['Secure storefront build','Checkout & payment setup','Analytics & event tracking','PCI & security audit','30-day handoff support'].map((f) => <li key={f}><span className="chk">✓</span> {f}</li>)}
                </ul>
                <Link href="/auth?plan=Launch" className="btn btn-outline">Get Started</Link>
              </div>
              <div className="pricing-card featured">
                <div className="pricing-badge">Most Popular</div>
                <h3>Operate</h3>
                <p className="muted" style={{ fontSize: '0.85rem', margin: '0.3rem 0 0.6rem' }}>Retained monthly ops</p>
                <p className="price"><sup>$</sup>4,500<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--muted)' }}>/mo</span></p>
                <p className="price-note">Month-to-month, cancel anytime</p>
                <ul className="pricing-features">
                  {['Everything in Launch','Inventory sync & management','Carrier & fulfillment ops','Monthly A/B experiments','Dedicated commerce team','Weekly reporting & SLAs'].map((f) => <li key={f}><span className="chk">✓</span> {f}</li>)}
                </ul>
                <Link href="/auth?plan=Operate" className="btn btn-primary">Book a Call</Link>
              </div>
              <div className="pricing-card">
                <h3>Optimize</h3>
                <p className="muted" style={{ fontSize: '0.85rem', margin: '0.3rem 0 0.6rem' }}>Enterprise &amp; multi-brand</p>
                <p className="price" style={{ fontSize: '1.6rem' }}>Custom</p>
                <p className="price-note">Volume pricing available</p>
                <ul className="pricing-features">
                  {['Everything in Operate','Multi-brand management','Custom integrations & APIs','Dedicated squad','Enterprise SLAs','Quarterly strategy reviews'].map((f) => <li key={f}><span className="chk">✓</span> {f}</li>)}
                </ul>
                <Link href="/auth?plan=Optimize" className="btn btn-outline">Contact Sales</Link>
              </div>
            </div>
          </div>
        </section>
      </RevealWrapper>

      {/* ── FAQ ── */}
      <section className="section">
        <div className="container faq-container">
          <p className="section-label">FAQ</p>
          <h2>Questions people actually ask.</h2>
          <FaqAccordion items={faqItems} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <p className="section-label">Ready when you are</p>
          <h2>Start your 14-day Commerce Sprint.</h2>
          <p>Tell us about your brand and we&apos;ll map your full commerce layer in the first call — no fluff, no pitch deck.</p>
          <div className="cta-actions">
            <Link href="/contact" className="btn btn-primary">Book Your Sprint Call</Link>
            <a href="mailto:hello@nexalab.io" className="btn btn-outline">Email Us Directly</a>
          </div>
        </div>
      </section>
    </main>
  );
}
