import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import BigCta from '@/components/site/BigCta';
import { CountUp, LiveStatus } from '@/components/site/live';
import { CASE_STUDIES, OFFICE_PHOTOS, SERVICES, SUPPORT_TEAM, TEAM, TESTIMONIALS, person, photo } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'NexaLab — We build and run online stores that actually sell',
  description:
    'NexaLab is a commerce agency. We design your store, connect your inventory and shipping, and grow your sales every month — with real people a message away.',
};

const FAQ = [
  { q: 'What exactly does NexaLab do?', a: 'We build and run online stores. That means designing your storefront, setting up checkout and payments, connecting inventory and shipping, then growing your sales every month with tracking, experiments, and support. One team handles all of it.' },
  { q: 'Do you work with Shopify?', a: 'Yes — and WooCommerce, BigCommerce, and fully custom stores. We recommend whatever fits your size and goals, and if you already have a platform we’ll usually build on it.' },
  { q: 'How fast can you launch?', a: 'Most stores go live in a 14-day sprint: storefront, checkout, payments, tracking, and at least one shipping carrier. Bigger migrations take a little longer and we’ll tell you upfront.' },
  { q: 'What happens after launch?', a: 'Most clients stay on a monthly plan. We keep inventory and shipping running smoothly, run monthly growth experiments, send weekly reports, and handle support tickets — month to month, no lock-in.' },
  { q: 'Who will I actually talk to?', a: 'A named account manager from day one, plus our support team for day-to-day requests. No call centers, no bots pretending to be people.' },
];

// Eight faces for the home grid, with AJ in the middle of the second row.
const HOME_TEAM = (() => {
  const aj = person('Al-Hamid (AJ)');
  const rest = TEAM.filter((p) => p !== aj).slice(0, 7);
  return [...rest.slice(0, 5), aj, ...rest.slice(5)];
})();

const MARQUEE = ['Store design', 'Checkout & payments', 'Inventory sync', 'Shipping & fulfillment', 'Growth experiments', 'Email & retention', 'Analytics', 'Real human support'];

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <LiveStatus openText="The studio is open — we’re online now" closedText="Studio’s closed — we reply first thing tomorrow" />
            <h1 className="h-display">
              We build and run online stores that <em>actually sell.</em>
            </h1>
            <p className="lead">
              NexaLab is a commerce agency. Our designers, engineers, and support team build your store, connect your inventory and shipping, and keep growing your sales — with a real person always a message away.
            </p>
            <div className="btn-row">
              <Link href="/contact" className="s-btn s-btn-tomato s-btn-lg">Start a project <span aria-hidden="true">→</span></Link>
              <Link href="/work" className="s-btn s-btn-line s-btn-lg">See our work</Link>
            </div>
            <div className="hero-proof">
              <div className="face-stack">
                {TEAM.slice(0, 5).map((p) => (
                  <Image key={p.name} src={photo(p.photo, 96, 96)} alt={p.name} width={40} height={40} />
                ))}
              </div>
              <p><strong>50+ brands</strong> work with our team of 30<br /><span className="stars" aria-label="4.9 out of 5">★★★★★</span> 4.9 average client rating</p>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <figure className="hero-photo hp-main">
              <Image src={photo(OFFICE_PHOTOS.laughing, 900, 1000)} alt="" fill sizes="(max-width: 980px) 90vw, 40vw" priority />
            </figure>
            <figure className="hero-photo hp-small">
              <Image src={photo(OFFICE_PHOTOS.stickies, 500, 500)} alt="" fill sizes="220px" />
            </figure>
            <div className="sticker st-ship"><span className="st-emoji">🚀</span> Just shipped: Driftwood checkout v2</div>
            <div className="sticker st-reply">
              <Image src={photo(person('Sofia Marchetti').photo, 80, 80)} alt="" width={36} height={36} />
              <div><strong>Sofia from Support</strong><span>“Fixed — your discount codes are live again!”</span></div>
            </div>
            <div className="sticker st-metric"><span>Conversion this month</span><strong>+38%</strong></div>
            <svg className="doodle-star" viewBox="0 0 100 100"><path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" /></svg>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <div className="marquee" aria-label="Services">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i}>{m}<i aria-hidden="true">✺</i></span>
          ))}
        </div>
      </div>

      {/* ── What we do ── */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">What we do</p>
            <h2 className="h-section">Here’s what we do, <em>in plain English.</em></h2>
            <p className="sec-sub">You sell great products. We handle everything that gets them from your website to your customer’s door — and we keep making it better.</p>
          </div>
          <div className="svc-grid">
            {SERVICES.map((s) => (
              <Link key={s.slug} href={`/services#${s.slug}`} className={`svc-card c-${s.color} rv`}>
                <span className="svc-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.short}</p>
                <span className="svc-more">Learn more <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-band">
        <div className="wrap stats-row">
          <div className="stat rv"><strong><CountUp to={12} prefix="$" suffix="M+" /></strong><span>in client sales managed</span></div>
          <div className="stat rv"><strong><CountUp to={50} suffix="+" /></strong><span>brands launched & growing</span></div>
          <div className="stat rv"><strong><CountUp to={9} suffix=" min" /></strong><span>average support reply</span></div>
          <div className="stat rv"><strong><CountUp to={14} suffix=" days" /></strong><span>from kickoff to live store</span></div>
        </div>
      </section>

      {/* ── Work ── */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head sec-head-split rv">
            <div>
              <p className="kicker">Recent work</p>
              <h2 className="h-section">Real stores. <em>Real numbers.</em></h2>
            </div>
            <Link href="/work" className="s-btn s-btn-line">All case studies →</Link>
          </div>
          <div className="case-grid">
            {CASE_STUDIES.slice(0, 3).map((c) => (
              <Link href="/work" key={c.client} className="case-card rv">
                <div className="case-img">
                  <Image src={photo(c.photo, 800, 600)} alt={`${c.client} project`} fill sizes="(max-width: 980px) 90vw, 33vw" />
                  <span className={`case-metric c-${c.color}`}><strong>{c.metric}</strong>{c.metricLabel}</span>
                </div>
                <p className="case-client">{c.client} · {c.industry}</p>
                <h3>{c.headline}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="sec sec-paper2">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">How it works</p>
            <h2 className="h-section">From first call to live store <em>in two weeks.</em></h2>
          </div>
          <ol className="steps">
            <li className="step rv">
              <span className="step-when">Day 1</span>
              <h3>Talk to a real person</h3>
              <p>A 30-minute call with a strategist — not a salesperson. We look at your store, your numbers, and what’s slowing you down.</p>
            </li>
            <li className="step rv">
              <span className="step-when">Days 2–14</span>
              <h3>We build it, fast</h3>
              <p>A focused 14-day sprint. Storefront, checkout, payments, tracking, and shipping — live and taking orders by the end.</p>
            </li>
            <li className="step rv">
              <span className="step-when">Every month after</span>
              <h3>We keep growing it</h3>
              <p>Monthly experiments, weekly reports, smooth operations, and a support team that answers in minutes.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ── People ── */}
      <section className="sec sec-forest">
        <div className="wrap">
          <div className="sec-head sec-head-split rv">
            <div>
              <p className="kicker">The people</p>
              <h2 className="h-section">Real people, <em>not a ticket queue.</em></h2>
              <p className="sec-sub">You’ll know everyone working on your store by name. Here are a few of them.</p>
            </div>
            <div className="btn-row">
              <Link href="/about" className="s-btn s-btn-cream">Meet the team</Link>
              <Link href="/careers" className="s-btn s-btn-line-light">Join us →</Link>
            </div>
          </div>
          <div className="people-grid">
            {HOME_TEAM.map((p) => (
              <figure key={p.name} className="person rv">
                <div className="person-img">
                  <Image src={photo(p.photo, 500, 600)} alt={p.name} fill sizes="(max-width: 640px) 45vw, 22vw" />
                  <p className="person-fun">{p.fun}</p>
                </div>
                <figcaption><strong>{p.name}</strong><span>{p.role}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Kind words</p>
            <h2 className="h-section">Brands that stuck around.</h2>
          </div>
          <div className="quote-grid">
            {TESTIMONIALS.map((t, i) => (
              <blockquote key={t.name} className={`quote rv ${i === 1 ? 'quote-tomato' : ''}`}>
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

      {/* ── Support teaser ── */}
      <section className="sec sec-tight">
        <div className="wrap">
          <div className="support-teaser rv">
            <div>
              <p className="kicker">Customer service</p>
              <h2 className="h-section">Something broke at 9pm? <em>We’re already on it.</em></h2>
              <p className="sec-sub">Every client gets a named account manager, a support team that replies in minutes, and 24/7 monitoring on checkout. If your store can’t take orders, we treat it like our own.</p>
              <div className="btn-row">
                <Link href="/support" className="s-btn s-btn-ink">Visit support</Link>
                <LiveStatus />
              </div>
            </div>
            <div className="support-faces">
              {SUPPORT_TEAM.map((p) => (
                <div key={p.name} className="support-face">
                  <Image src={photo(p.photo, 160, 160)} alt={p.name} width={64} height={64} />
                  <span><strong>{p.name}</strong>{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="sec">
        <div className="wrap faq-wrap">
          <div className="sec-head rv">
            <p className="kicker">FAQ</p>
            <h2 className="h-section">Questions people actually ask.</h2>
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

      <BigCta />
    </main>
  );
}
