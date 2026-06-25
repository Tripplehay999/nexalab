import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Platform — NexaLab',
  description:
    'NexaLab designs, secures, operates, and scales complete commerce systems — from storefront to fulfillment. The full technical backbone for your brand.',
};

export default function PlatformPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="page-hero" style={{ paddingBottom: '4rem' }}>
        <div className="container">
          <p className="eyebrow">The Platform</p>
          <h1 style={{ maxWidth: '16ch' }}>Commerce infrastructure, end to end.</h1>
          <p className="subtitle" style={{ maxWidth: '60ch', marginTop: '0.8rem' }}>
            NexaLab is an end-to-end e-commerce infrastructure company. We don&apos;t just build online stores — we design, secure, operate, and scale complete commerce systems for brands. From storefront development to inventory management and fulfillment integration, we handle the entire technical backbone so founders can focus on growth.
          </p>
          <div className="hero-actions" style={{ marginTop: '2rem', marginBottom: 0 }}>
            <Link href="/contact" className="btn btn-primary">Book a Demo</Link>
            <Link href="/#pricing" className="btn btn-outline">View Pricing</Link>
          </div>
        </div>
      </section>

      {/* ── Stack Overview ── */}
      <section className="section-alt">
        <div className="container" style={{ textAlign: 'center' }}>
          <p className="section-label">Architecture</p>
          <h2>One system. Every layer.</h2>
          <p className="subtitle" style={{ margin: '0.5rem auto 0' }}>Every module is built to talk to the next. No duct tape, no gaps — just a single operating layer for your brand.</p>
          <div className="stack-visual">
            {[
              { grad: 'rgba(124,92,252,0.18),rgba(255,79,216,0.1)', stroke: '#a78bfa', name: 'Storefront & Checkout', desc: 'Custom-engineered storefronts + conversion-focused checkout', path: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8h14M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z' },
              { grad: 'rgba(34,211,168,0.15),rgba(34,211,168,0.05)', stroke: '#22d3a8', name: 'Inventory & Catalog', desc: 'Real-time stock sync, variant management, multi-channel', path: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
              { grad: 'rgba(251,191,36,0.15),rgba(251,191,36,0.05)', stroke: '#fbbf24', name: 'Fulfillment & Shipping', desc: 'Carrier integrations, routing rules, label automation', path: null },
              { grad: 'rgba(239,68,68,0.12),rgba(239,68,68,0.04)', stroke: '#f87171', name: 'Analytics & Growth Ops', desc: 'Attribution, experiments, monthly revenue iteration', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            ].map((layer, i, arr) => (
              <div key={layer.name} className="stack-layer">
                <div className="stack-icon" style={{ background: `linear-gradient(135deg,${layer.grad})` }}>
                  <svg fill="none" stroke={layer.stroke} strokeWidth="1.8" viewBox="0 0 24 24">
                    {layer.name === 'Fulfillment & Shipping' ? (
                      <>
                        <rect x="1" y="3" width="15" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 8h4l3 5v3h-7V8z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                      </>
                    ) : (
                      <path d={layer.path!} strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                </div>
                <div className="stack-info">
                  <div className="stack-name">{layer.name}</div>
                  <div className="stack-desc">{layer.desc}</div>
                </div>
                <div className="stack-arrow" style={i === arr.length - 1 ? { visibility: 'hidden' } : {}}>↓</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Storefront & Checkout ── */}
      <section className="section feature-section" id="storefront">
        <div className="container feature-row">
          <div className="feature-content">
            <span className="feature-tag" style={{ background: 'rgba(124,92,252,0.12)', color: '#a78bfa', border: '1px solid rgba(124,92,252,0.2)' }}>Storefront &amp; Checkout</span>
            <h2>A store built to convert, not just exist.</h2>
            <p className="feature-desc">Most stores are built on templates — fast to launch, slow to convert. We engineer storefronts from the ground up around your brand&apos;s specific products, customers, and funnel. Every checkout interaction is designed to remove friction, not add it.</p>
            <ul className="feature-bullet-list">
              <li>Custom storefront builds — no templates, no platform ceilings</li>
              <li>Mobile-first, sub-2s load times with Core Web Vitals optimization</li>
              <li>One-page checkout flows with minimal drop-off points</li>
              <li>Stripe, PayPal, Klarna, Afterpay — fully integrated</li>
              <li>Guest checkout + account creation with cart persistence</li>
              <li>Cart abandonment setup and recovery flows</li>
              <li>PCI DSS compliant checkout architecture from day one</li>
            </ul>
            <Link href="/contact" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Build My Storefront</Link>
          </div>
          <div className="feature-visual">
            <div className="store-mock">
              <div className="dash-topbar">
                <div className="dash-dots"><div className="dash-dot r" /><div className="dash-dot y" /><div className="dash-dot g" /></div>
                <span className="dash-title">store.vantage.co</span>
                <span className="store-lock">🔒 Secure</span>
              </div>
              <div className="store-body">
                <div className="store-img-placeholder">
                  <div className="store-img-inner">
                    <svg fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" viewBox="0 0 48 48" width="48" height="48">
                      <rect x="4" y="8" width="40" height="32" rx="4" /><circle cx="18" cy="20" r="4" /><path d="M4 32l10-8 8 6 8-10 14 12" />
                    </svg>
                  </div>
                  <div className="store-img-badge">New Drop</div>
                </div>
                <div className="store-details">
                  <div className="store-brand-tag">Vantage Studio</div>
                  <div className="store-product-name">Premium Gel Kit — Complete Set</div>
                  <div className="store-price-row"><span className="store-price">$124.00</span><span className="store-price-orig">$148.00</span></div>
                  <div className="store-variants-label">Size</div>
                  <div className="store-variants">
                    {['S','M','L','XL'].map((s) => <span key={s} className={`variant-chip${s === 'M' ? ' active' : ''}`}>{s}</span>)}
                  </div>
                  <button className="store-atc-btn">Add to Cart</button>
                  <div className="store-trust-row"><span>🔒 Secure checkout</span><span>↩ Free returns</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Inventory & Catalog ── */}
      <section className="section-alt feature-section" id="inventory">
        <div className="container feature-row flip">
          <div className="feature-visual">
            <div className="inventory-mock">
              <div className="dash-topbar">
                <div className="dash-dots"><div className="dash-dot r" /><div className="dash-dot y" /><div className="dash-dot g" /></div>
                <span className="dash-title">Inventory — NexaLab</span>
                <span className="dash-badge">● Synced</span>
              </div>
              <div className="inv-body">
                <div className="inv-header-row"><span>SKU</span><span>Product</span><span>Stock</span><span>Status</span></div>
                {[
                  { sku: '#1042', name: 'Gel Kit — S', stock: '248', warn: false },
                  { sku: '#1043', name: 'Gel Kit — M', stock: '91', warn: false },
                  { sku: '#1044', name: 'Gel Kit — L', stock: '12', warn: true },
                  { sku: '#1045', name: 'Serum Bundle', stock: '335', warn: false },
                ].map((row) => (
                  <div key={row.sku} className={`inv-row${row.warn ? ' inv-row-warn' : ''}`}>
                    <span className="inv-sku">{row.sku}</span>
                    <span className="inv-name">{row.name}</span>
                    <span className="inv-stock" style={row.warn ? { color: 'var(--warn)' } : {}}>{row.stock}</span>
                    <span className={`dash-status ${row.warn ? 'status-pending' : 'status-shipped'}`}>{row.warn ? 'Low Stock' : 'In Stock'}</span>
                  </div>
                ))}
                <div className="inv-alert"><span>⚡ Auto-reorder triggered for SKU #1044 — 200 units</span></div>
              </div>
            </div>
          </div>
          <div className="feature-content">
            <span className="feature-tag" style={{ background: 'rgba(34,211,168,0.1)', color: '#22d3a8', border: '1px solid rgba(34,211,168,0.18)' }}>Inventory &amp; Catalog</span>
            <h2>No more spreadsheets. No more surprises.</h2>
            <p className="feature-desc">Most brands manage inventory in a patchwork of spreadsheets, Shopify, and a 3PL portal — and discover stockouts when a customer complains. NexaLab centralizes everything: one source of truth, synced across every channel in real time.</p>
            <ul className="feature-bullet-list">
              <li>Centralized product catalog with variant + bundle configuration</li>
              <li>Real-time stock sync across storefronts, marketplaces, and warehouses</li>
              <li>Low-stock alerts and configurable automated reorder triggers</li>
              <li>Warehouse and 3PL integration — ShipStation, EasyPost, custom</li>
              <li>Multi-location inventory routing and zone allocation</li>
              <li>Bulk import/export with SKU mapping and conflict resolution</li>
              <li>Channel-level oversell prevention with priority rules</li>
            </ul>
            <Link href="/contact" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Fix My Inventory</Link>
          </div>
        </div>
      </section>

      {/* ── Fulfillment & Shipping ── */}
      <section className="section feature-section" id="fulfillment">
        <div className="container feature-row">
          <div className="feature-content">
            <span className="feature-tag" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.18)' }}>Fulfillment &amp; Shipping</span>
            <h2>Delivery your customers can actually trust.</h2>
            <p className="feature-desc">Shipping failures — wrong carrier, bad routing, no tracking — destroy brand trust faster than almost anything else. NexaLab builds your fulfillment layer from the carrier integrations up, with rules that route every order to the fastest and cheapest option automatically.</p>
            <ul className="feature-bullet-list">
              <li>FedEx, UPS, DHL, USPS, and ShipStation integrations out of the box</li>
              <li>Smart carrier routing by cost, SLA, weight, and destination</li>
              <li>Automated label generation and batch manifest processing</li>
              <li>Branded real-time tracking page for customers</li>
              <li>Returns management flow with automated label issuance</li>
              <li>Failed delivery alerts and re-routing logic</li>
              <li>Fulfillment SLA dashboards and carrier performance reporting</li>
            </ul>
            <Link href="/contact" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Streamline Shipping</Link>
          </div>
          <div className="feature-visual">
            <div className="tracking-mock">
              <div className="dash-topbar">
                <div className="dash-dots"><div className="dash-dot r" /><div className="dash-dot y" /><div className="dash-dot g" /></div>
                <span className="dash-title">Order Tracking</span>
                <span className="dash-badge">● On the way</span>
              </div>
              <div className="tracking-body">
                <div className="tracking-order-header">
                  <div>
                    <div className="tracking-order-id">Order #4821</div>
                    <div className="tracking-carrier">via FedEx · <span style={{ color: 'var(--text)', fontWeight: 600 }}>794 819 283 000</span></div>
                  </div>
                  <div className="tracking-eta">
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Est. delivery</div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Feb 20</div>
                  </div>
                </div>
                <div className="track-timeline">
                  {[
                    { label: 'Order Placed', time: 'Feb 18 · 9:02 AM', done: true, active: false },
                    { label: 'Processing at warehouse', time: 'Feb 18 · 2:14 PM', done: true, active: false },
                    { label: 'In transit — Atlanta Hub', time: 'Feb 19 · 6:30 AM', done: false, active: true },
                    { label: 'Delivered', time: 'Est. Feb 20', done: false, active: false },
                  ].map((step) => (
                    <div key={step.label} className={`track-step${step.done ? ' done' : step.active ? ' active' : ''}`}>
                      <div className={`track-dot${step.done ? ' done' : step.active ? ' active' : ''}`} />
                      <div className="track-content">
                        <div className="track-label" style={step.active ? { color: 'var(--text)' } : {}}>{step.label}</div>
                        <div className="track-time">{step.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Analytics & Growth Ops ── */}
      <section className="section-alt feature-section" id="analytics">
        <div className="container feature-row flip">
          <div className="feature-visual">
            <div className="analytics-mock">
              <div className="dash-topbar">
                <div className="dash-dots"><div className="dash-dot r" /><div className="dash-dot y" /><div className="dash-dot g" /></div>
                <span className="dash-title">Growth — NexaLab</span>
                <span className="dash-badge">● Feb 2025</span>
              </div>
              <div className="analytics-body">
                <div className="analytics-header">
                  <div>
                    <div className="analytics-title">Revenue — Last 30 days</div>
                    <div className="analytics-val">$48,241</div>
                  </div>
                  <span className="analytics-delta">↑ 23.4%</span>
                </div>
                <div className="bar-chart" aria-hidden="true">
                  {[['W1','38%'],['W2','55%'],['W3','72%',true],['W4','88%']].map(([label, h, active]) => (
                    <div key={label as string} className="bar-group">
                      <div className={`bar${active ? ' active' : ''}`} style={{ height: h as string }} />
                      <div className="bar-label">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="analytics-metrics">
                  {[
                    { label: 'Conv. Rate', val: '3.8%', delta: '↑ 0.4pp' },
                    { label: 'Avg. Order', val: '$112', delta: '↑ $8' },
                    { label: 'ROAS', val: '4.2×', delta: '↑ 0.6×' },
                  ].map((m) => (
                    <div key={m.label} className="analytics-metric-item">
                      <div className="analytics-metric-label">{m.label}</div>
                      <div className="analytics-metric-val">{m.val}</div>
                      <div className="analytics-metric-delta" style={{ color: 'var(--success)' }}>{m.delta}</div>
                    </div>
                  ))}
                </div>
                <div className="experiment-pill">
                  <span style={{ color: 'var(--primary-soft)', fontWeight: 700 }}>▶ Active experiment:</span>
                  <span> Checkout CTA copy — variant B +11% CVR</span>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-content">
            <span className="feature-tag" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>Analytics &amp; Growth Ops</span>
            <h2>Data that drives decisions, not just reports.</h2>
            <p className="feature-desc">Most brands have analytics. Almost none have analytics that actually change what they do each month. NexaLab sets up the full event taxonomy, builds attribution that works across channels, and then runs a monthly experiment pipeline designed to compound revenue over time.</p>
            <ul className="feature-bullet-list">
              <li>Full event taxonomy setup — every touchpoint, properly named</li>
              <li>Multi-touch attribution modeling across Google, Meta, email, and direct</li>
              <li>A/B test design, execution, and statistical analysis each month</li>
              <li>Revenue cohort and LTV analysis for product and channel decisions</li>
              <li>GA4 + Meta Pixel + TikTok Pixel correctly configured</li>
              <li>Custom weekly reporting dashboards with actionable takeaways</li>
              <li>Monthly strategy review with experiment backlog for next sprint</li>
            </ul>
            <Link href="/contact" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Start Growing</Link>
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section className="section" id="security">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
            <p className="section-label">Security</p>
            <h2>Commerce-grade security, built in — not bolted on.</h2>
            <p className="subtitle">Security is not an add-on at NexaLab. Every system we build starts with a security-first architecture — because a breach doesn&apos;t just hurt your data, it destroys customer trust.</p>
          </div>
          <div className="security-grid">
            {[
              { name: 'PCI DSS Compliance', desc: 'Checkout architecture aligned to PCI standards so cardholder data is never at risk.' },
              { name: 'SSL/TLS Configuration', desc: 'End-to-end encryption properly configured — not just a certificate thrown on at the end.' },
              { name: 'Fraud Detection Rules', desc: 'Order-level fraud scoring and rule-based review queues to catch bad actors before chargebacks.' },
              { name: 'DDoS Mitigation', desc: "Traffic filtering and rate-limiting so a traffic spike — from a drop or an attack — doesn't take you offline." },
              { name: 'GDPR & CCPA Compliance', desc: 'Consent management, data handling policies, and customer data request workflows built correctly.' },
              { name: 'Regular Security Audits', desc: 'Ongoing vulnerability scanning and periodic audits — not a one-time checkbox at launch.' },
            ].map((item) => (
              <div key={item.name} className="security-item">
                <div className="security-icon">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22" height="22">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="security-name">{item.name}</div>
                  <div className="security-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <p className="section-label">Get started</p>
          <h2>Ready to build your full commerce layer?</h2>
          <p>Whether you&apos;re starting from scratch or fixing a system that&apos;s breaking at scale, we map your full stack in the first call.</p>
          <div className="cta-actions">
            <Link href="/contact" className="btn btn-primary">Book a Demo</Link>
            <Link href="/#pricing" className="btn btn-outline">See Pricing</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
