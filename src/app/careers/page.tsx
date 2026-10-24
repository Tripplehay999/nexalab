import type { Metadata } from 'next';
import Link from 'next/link';
import { JOBS, type Job } from '@/lib/jobs';

export const metadata: Metadata = {
  title: 'Careers — NexaLab',
  description: 'Join NexaLab. We are hiring engineers, designers, and operators to build commerce infrastructure that compounds.',
};

const PERKS = [
  { title: 'Remote-first', body: 'Work from anywhere with async-first collaboration and a few overlap hours.' },
  { title: 'Competitive pay + equity', body: 'Top-of-market salaries and meaningful ownership in what we build.' },
  { title: 'Health coverage', body: 'Medical, dental, and vision for you and your dependents.' },
  { title: 'Learning budget', body: '$2,000 / year for courses, books, and conferences.' },
  { title: 'Flexible time off', body: 'Minimum 20 days a year — and we actually make sure you take them.' },
  { title: 'Home office setup', body: '$1,500 to set up a workspace you love.' },
];

const DEPARTMENTS: Job['department'][] = ['Engineering', 'Design', 'Growth', 'Operations'];

export default function CareersPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">Careers</p>
          <h1>Build the systems that power modern commerce.</h1>
          <p className="subtitle">
            We&apos;re a small, senior team shipping infrastructure for growing brands. If you like ownership, fast feedback loops, and work that compounds — we&apos;d love to meet you.
          </p>
          <div className="careers-hero-actions">
            <a href="#open-roles" className="btn btn-primary">See open roles ({JOBS.length})</a>
            <Link href="/careers/general-application" className="btn btn-outline">General application</Link>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <p className="section-label">Why NexaLab</p>
          <h2>Benefits &amp; perks</h2>
          <div className="perk-grid">
            {PERKS.map((p) => (
              <article key={p.title} className="card">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="open-roles" className="section">
        <div className="container">
          <p className="section-label">Open roles</p>
          <h2>Find your role</h2>
          {DEPARTMENTS.map((dept) => {
            const roles = JOBS.filter((j) => j.department === dept);
            if (!roles.length) return null;
            return (
              <div key={dept} className="job-dept">
                <h3 className="job-dept-title">{dept}</h3>
                <ul className="job-list">
                  {roles.map((job) => (
                    <li key={job.slug}>
                      <Link href={`/careers/${job.slug}`} className="job-row">
                        <div>
                          <strong className="job-row-title">{job.title}</strong>
                          <p className="job-row-summary">{job.summary}</p>
                        </div>
                        <div className="job-row-meta">
                          <span>{job.location}</span>
                          <span>{job.type}</span>
                          <span className="job-row-cta">Apply →</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="careers-general card">
            <div>
              <h3>Don&apos;t see your role?</h3>
              <p>We&apos;re always looking for great people. Send a general application and tell us how you&apos;d contribute.</p>
            </div>
            <Link href="/careers/general-application" className="btn btn-outline">Apply anyway</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
