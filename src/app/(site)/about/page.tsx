import type { Metadata } from 'next';
import Image from 'next/image';
import BigCta from '@/components/site/BigCta';
import { LiveClock } from '@/components/site/live';
import { OFFICE_PHOTOS, TEAM, photo } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'About Us — NexaLab',
  description: 'Meet the NexaLab team: designers, engineers, and operators who build and run online stores for growing brands.',
};

const VALUES = [
  { title: 'Plain talk', body: 'No jargon, no 40-slide decks. We tell you what’s working, what isn’t, and what we’re doing about it.', color: 'tomato' },
  { title: 'Ship, then improve', body: 'A live store beats a perfect plan. We launch fast and keep making it better every month.', color: 'lime' },
  { title: 'Numbers over opinions', body: 'Every change is measured. If it doesn’t move sales or save time, we stop doing it.', color: 'sky' },
  { title: 'Pick up the phone', body: 'When something breaks, a real person answers. Fast. That’s the whole point of having a team.', color: 'lilac' },
];

const AUDIENCE = [
  { title: 'Brands launching their first real store', body: 'You need something credible and fast without overbuilding.' },
  { title: 'Stores that outgrew their setup', body: 'Templates, plugins, and spreadsheets are holding you back.' },
  { title: 'Teams drowning in operations', body: 'Inventory, shipping, and order issues eat your whole week.' },
  { title: 'Brands spending on ads blindly', body: 'You need tracking you trust and a plan to grow profitably.' },
];

const CITIES = [
  { city: 'Brooklyn', note: 'HQ & studio', tz: 'America/New_York' },
  { city: 'Toronto', note: 'Second hub · engineering & on-call', tz: 'America/Toronto' },
  { city: 'Lisbon', note: 'Engineering hub', tz: 'Europe/Lisbon' },
  { city: 'Berlin', note: 'Frontend team', tz: 'Europe/Berlin' },
];

export default function AboutPage() {
  return (
    <main>
      <section className="page-top">
        <div className="wrap">
          <p className="kicker">About NexaLab</p>
          <h1 className="h-display">We’re the team behind <em>the store.</em></h1>
          <p className="lead">NexaLab is a commerce agency of 30 designers, engineers, operators, and support specialists. We build and run online stores for brands who’d rather spend their time on products and customers than on plugins and spreadsheets.</p>
        </div>
      </section>

      <section className="photo-band" aria-hidden="true">
        {[OFFICE_PHOTOS.team, OFFICE_PHOTOS.highFive, OFFICE_PHOTOS.stickies, OFFICE_PHOTOS.studio, OFFICE_PHOTOS.coding].map((id, i) => (
          <figure key={id} className={`band-img b-${i}`}>
            <Image src={photo(id, 700, 800)} alt="" fill sizes="(max-width: 640px) 60vw, 22vw" />
          </figure>
        ))}
      </section>

      <section className="sec">
        <div className="wrap story">
          <div className="rv">
            <p className="kicker">Our story</p>
            <h2 className="h-section">Started by two people who were tired of watching good brands lose sales.</h2>
          </div>
          <div className="story-copy rv">
            <p>Marcus was an engineer fixing broken checkouts at 2am. Amara was a designer watching beautiful stores fail because nobody looked after them after launch. In 2019 they started NexaLab with one idea: a store isn’t a project you finish — it’s something you run.</p>
            <p>Today we’re a team of 30 across four cities, working with 50+ brands. We still build every store like it’s our own, and we still pick up the phone when something breaks.</p>
          </div>
        </div>
      </section>

      <section className="sec sec-paper2">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">What we believe</p>
            <h2 className="h-section">Four things we won’t compromise on.</h2>
          </div>
          <div className="value-grid">
            {VALUES.map((v, i) => (
              <div key={v.title} className={`value c-${v.color} rv`}>
                <span className="value-num">0{i + 1}</span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="team">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">The team</p>
            <h2 className="h-section">The faces you’ll <em>actually work with.</em></h2>
          </div>
          <div className="people-grid people-grid-light">
            {TEAM.map((p) => (
              <figure key={p.name} className="person rv">
                <div className="person-img">
                  <Image src={photo(p.photo, 500, 600)} alt={p.name} fill sizes="(max-width: 640px) 45vw, 22vw" />
                  <p className="person-fun">{p.fun}</p>
                </div>
                <figcaption><strong>{p.name}</strong><span>{p.role} · {p.city}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-forest">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Who we help</p>
            <h2 className="h-section">We’re a great fit if you’re…</h2>
          </div>
          <div className="aud-grid">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="aud rv">
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Where we are</p>
            <h2 className="h-section">Four cities, <em>one team.</em></h2>
            <p className="sec-sub">Spread across time zones so someone is always awake when your store needs help.</p>
          </div>
          <div className="city-grid">
            {CITIES.map((c) => (
              <div key={c.city} className="city rv">
                <LiveClock timeZone={c.tz} className="city-time" />
                <strong>{c.city}</strong>
                <span>{c.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BigCta title="Like what you see?" sub="Work with us on your store — or come work with us on everyone else’s." primary={{ href: '/careers', label: 'See open roles →' }} />
    </main>
  );
}
