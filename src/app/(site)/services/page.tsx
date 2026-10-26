import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import BigCta from '@/components/site/BigCta';
import { OFFICE_PHOTOS, SERVICES, photo } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'What We Do — NexaLab',
  description: 'NexaLab designs and builds online stores, connects inventory and shipping, grows sales every month, and supports you every day.',
};

const SERVICE_PHOTOS: Record<string, string> = {
  'design-build': OFFICE_PHOTOS.stickies,
  operations: OFFICE_PHOTOS.checkout,
  growth: OFFICE_PHOTOS.talk,
  support: OFFICE_PHOTOS.pairing,
};

const INTEGRATIONS = [
  { label: 'Store platforms', items: ['Shopify', 'Shopify Plus', 'WooCommerce', 'BigCommerce', 'Custom / headless'] },
  { label: 'Payments', items: ['Stripe', 'PayPal', 'Shop Pay', 'Klarna', 'Afterpay'] },
  { label: 'Shipping', items: ['ShipStation', 'EasyPost', 'UPS', 'FedEx', 'USPS', 'DHL'] },
  { label: 'Growth', items: ['Google Analytics', 'Meta', 'TikTok', 'Klaviyo', 'Postscript'] },
];

const PLANS = [
  {
    name: 'Launch',
    tag: 'Build your store',
    price: '$3,500',
    unit: 'one-time, from',
    features: ['Store design & build', 'Checkout & payments setup', 'Analytics & tracking', 'Shipping carrier setup', '30 days of launch support'],
    cta: 'Get started',
    href: '/contact?plan=Launch',
  },
  {
    name: 'Operate',
    tag: 'Build + run + grow',
    price: '$4,500',
    unit: 'per month',
    featured: true,
    features: ['Everything in Launch', 'Inventory & shipping operations', 'Monthly growth experiments', 'Named account manager', 'Priority support, 24/7 checkout monitoring', 'Weekly reports'],
    cta: 'Book a call',
    href: '/contact?plan=Operate',
  },
  {
    name: 'Scale',
    tag: 'Multi-brand & enterprise',
    price: 'Custom',
    unit: 'tailored to you',
    features: ['Everything in Operate', 'Multiple brands & regions', 'Custom integrations & APIs', 'Dedicated squad', 'Enterprise SLAs', 'Quarterly strategy sessions'],
    cta: 'Talk to us',
    href: '/contact?plan=Scale',
  },
];

export default function ServicesPage() {
  return (
    <main>
      <section className="page-top">
        <div className="wrap">
          <p className="kicker">What we do</p>
          <h1 className="h-display">Everything your online store needs. <em>One team.</em></h1>
          <p className="lead">Most brands juggle a designer, a developer, a shipping consultant, and an ads freelancer. We’re all of them — working together, on your store, every week.</p>
          <nav className="chip-row" aria-label="Jump to service">
            {SERVICES.map((s) => (
              <a key={s.slug} href={`#${s.slug}`} className={`chip c-${s.color}`}>{s.num} · {s.title.replace('We ', '')}</a>
            ))}
            <a href="#pricing" className="chip">Pricing</a>
          </nav>
        </div>
      </section>

      {SERVICES.map((s, i) => (
        <section key={s.slug} id={s.slug} className="sec svc-detail-sec">
          <div className={`wrap svc-detail ${i % 2 ? 'is-flipped' : ''}`}>
            <div className="svc-detail-copy rv">
              <span className={`svc-badge c-${s.color}`}>{s.num}</span>
              <h2 className="h-section">{s.title}</h2>
              <p className="sec-sub">{s.body}</p>
              <ul className="tick-list">
                {s.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <figure className={`svc-detail-img c-${s.color} rv`}>
              <Image src={photo(SERVICE_PHOTOS[s.slug], 900, 700)} alt="" fill sizes="(max-width: 980px) 90vw, 45vw" />
            </figure>
          </div>
        </section>
      ))}

      <section className="sec sec-paper2">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Works with your tools</p>
            <h2 className="h-section">We plug into what you already use.</h2>
            <p className="sec-sub">No ripping and replacing. If you already have a platform, carrier, or email tool you like, we build around it.</p>
          </div>
          <div className="integ-grid">
            {INTEGRATIONS.map((g) => (
              <div key={g.label} className="integ rv">
                <p className="integ-label">{g.label}</p>
                <div className="chip-row">
                  {g.items.map((it) => <span key={it} className="chip chip-sm">{it}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="pricing">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Pricing</p>
            <h2 className="h-section">Simple plans. <em>No lock-in.</em></h2>
            <p className="sec-sub">Every plan includes full ownership of your code and data. Monthly plans are month-to-month — we earn your business every month.</p>
          </div>
          <div className="plans">
            {PLANS.map((p) => (
              <div key={p.name} className={`plan rv ${p.featured ? 'is-featured' : ''}`}>
                {p.featured && <span className="plan-badge">Most popular</span>}
                <p className="plan-name">{p.name}</p>
                <p className="plan-tag">{p.tag}</p>
                <p className="plan-price">{p.price}<span>{p.unit}</span></p>
                <ul className="tick-list">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href={p.href} className={`s-btn ${p.featured ? 's-btn-tomato' : 's-btn-ink'}`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BigCta title="Not sure which plan fits?" sub="Tell us where your store is today. We’ll recommend the smallest plan that gets you where you want to go." />
    </main>
  );
}
