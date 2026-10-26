import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import RoleBrowser from '@/components/site/RoleBrowser';
import { JOBS } from '@/lib/jobs';
import { CONTACT, OFFICE_PHOTOS, TEAM, person, photo } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Careers — NexaLab',
  description: 'Join NexaLab. We’re hiring designers, engineers, and operators to build and run online stores for growing brands.',
};

const RECRUITER = person('Jade McMiller');

const SPOTLIGHTS = [
  { person: person('Rafael Ortiz'), tenure: '3 years at NexaLab', quote: 'I’ve connected more shipping carriers here than I knew existed. But what keeps me is the team — nobody’s precious about ideas, everyone just wants the store to work.' },
  { person: person('Sofia Marchetti'), tenure: '4 years at NexaLab', quote: 'I started as a project manager and now lead Client Success. Every promotion here came from doing work I was proud of, not from politics.' },
  { person: person('Theo Laurent'), tenure: '1 year at NexaLab', quote: 'I shipped my first client storefront in week three. You get real ownership fast, and real feedback from people who care about craft.' },
];

const PERKS = [
  { icon: '🌍', title: 'Remote & hybrid', body: 'Work remotely or hybrid, with a few overlap hours and studio days at our Brooklyn and Toronto hubs.' },
  { icon: '💸', title: 'Top pay + equity', body: 'Competitive salaries and real ownership in the company you’re building.' },
  { icon: '🩺', title: 'Full health cover', body: 'Medical, dental, and vision for you and your family.' },
  { icon: '📚', title: '$2,000 learning budget', body: 'Courses, books, conferences — whatever makes you better.' },
  { icon: '🌴', title: '25 days off, minimum', body: 'And we check that you actually take them.' },
  { icon: '🏕️', title: 'Twice-yearly offsites', body: 'The whole team, somewhere nice, for a week of planning and fun.' },
];

const PROCESS = [
  { step: 'Intro call', time: '30 min', body: 'A friendly chat with Jade, our Head of Recruiting, about you, the role, and what you’re looking for.' },
  { step: 'Meet the team', time: '45 min', body: 'Talk to the people you’d work with day to day. Ask them anything.' },
  { step: 'Paid project', time: '~4 hours', body: 'A small, real-world task — and yes, we pay you for your time.' },
  { step: 'Offer', time: 'within 48h', body: 'We decide fast and always share feedback, whatever the outcome.' },
];

export default function CareersPage() {
  return (
    <main>
      <section className="page-top careers-top">
        <div className="wrap careers-hero">
          <div>
            <p className="kicker">Careers at NexaLab</p>
            <h1 className="h-display">Do the best work of your career, <em>with people you’ll like.</em></h1>
            <p className="lead">We’re a team of 30 building and running online stores for brands people love. Small enough that your work matters, busy enough that you’ll never be bored.</p>
            <div className="btn-row">
              <a href="#roles" className="s-btn s-btn-tomato s-btn-lg">See {JOBS.length} open roles ↓</a>
              <Link href="/careers/general-application" className="s-btn s-btn-line s-btn-lg">General application</Link>
            </div>
          </div>
          <div className="face-mosaic" aria-hidden="true">
            {TEAM.slice(0, 9).map((p, i) => (
              <figure key={p.name} className={`mosaic-face m-${i}`}>
                <Image src={photo(p.photo, 300, 300)} alt="" fill sizes="120px" />
              </figure>
            ))}
            <span className="sticker st-mosaic">👋 Say hi to the team</span>
          </div>
        </div>
      </section>

      <section className="photo-strip" aria-label="Life at NexaLab">
        <div className="photo-strip-track">
          {[OFFICE_PHOTOS.offsite, OFFICE_PHOTOS.laughing, OFFICE_PHOTOS.highFive, OFFICE_PHOTOS.coding, OFFICE_PHOTOS.stickies, OFFICE_PHOTOS.team, OFFICE_PHOTOS.talk].map((id, i) => (
            <figure key={id} className={`strip-img s-${i % 3}`}>
              <Image src={photo(id, 600, 450)} alt="NexaLab team at work" fill sizes="320px" />
            </figure>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">From the team</p>
            <h2 className="h-section">Don’t take our word for it.</h2>
          </div>
          <div className="spot-grid">
            {SPOTLIGHTS.map(({ person, tenure, quote }) => (
              <figure key={person.name} className="spot rv">
                <div className="spot-img">
                  <Image src={photo(person.photo, 600, 640)} alt={person.name} fill sizes="(max-width: 980px) 90vw, 30vw" />
                </div>
                <blockquote>“{quote}”</blockquote>
                <figcaption><strong>{person.name}</strong><span>{person.role} · {tenure}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-paper2">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Perks & benefits</p>
            <h2 className="h-section">We take care of the people <em>who take care of clients.</em></h2>
          </div>
          <div className="perk-cards">
            {PERKS.map((p) => (
              <div key={p.title} className="perk rv">
                <span className="perk-icon" aria-hidden="true">{p.icon}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">How we hire</p>
            <h2 className="h-section">Four steps. <em>About two weeks.</em></h2>
            <p className="sec-sub">No trick questions, no unpaid take-homes, no ghosting.</p>
          </div>
          <ol className="steps steps-4">
            {PROCESS.map((p) => (
              <li key={p.step} className="step rv">
                <span className="step-when">{p.time}</span>
                <h3>{p.step}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec sec-paper2" id="roles">
        <div className="wrap">
          <div className="sec-head rv">
            <p className="kicker">Open roles</p>
            <h2 className="h-section">Find your seat at the table.</h2>
          </div>
          <RoleBrowser jobs={JOBS} />

          <div className="recruiter rv">
            <Image src={photo(RECRUITER.photo, 160, 160)} alt={RECRUITER.name} width={72} height={72} />
            <div>
              <h3>Don’t see your role?</h3>
              <p>Send a general application, or email {RECRUITER.name.split(' ')[0]}, our {RECRUITER.role}, at <a href={`mailto:${CONTACT.careers}`}>{CONTACT.careers}</a> with any questions. We reply to everyone.</p>
            </div>
            <Link href="/careers/general-application" className="s-btn s-btn-ink">Apply anyway</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
