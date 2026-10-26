import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ApplyForm from '@/components/ApplyForm';
import { JOBS, getJob } from '@/lib/jobs';
import { TEAM, photo } from '@/lib/site-data';

const GENERAL = 'general-application';

const TEAM_FOR: Record<string, string[]> = {
  Engineering: ['Engineering'],
  Design: ['Design', 'Leadership'],
  Growth: ['Growth'],
  Operations: ['Client Success', 'Operations'],
};

export function generateStaticParams() {
  return [...JOBS.map((j) => ({ slug: j.slug })), { slug: GENERAL }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = getJob(slug);
  if (slug === GENERAL) return { title: 'General Application — NexaLab Careers' };
  if (!job) return { title: 'Role not found — NexaLab' };
  return { title: `${job.title} — NexaLab Careers`, description: job.summary };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = getJob(slug);
  if (!job && slug !== GENERAL) notFound();

  const teammates = job
    ? TEAM.filter((p) => TEAM_FOR[job.department].includes(p.team)).filter((p) => p.name !== 'Al-Hamid (AJ)').slice(0, 4)
    : TEAM.slice(0, 4);

  return (
    <main>
      <section className="page-top page-top-sm">
        <div className="wrap">
          <Link href="/careers#roles" className="back-link">← All open roles</Link>
          <p className="kicker">{job ? job.department : 'Careers'}</p>
          <h1 className="h-display h-display-sm">{job ? job.title : 'General application'}</h1>
          {job ? (
            <div className="chip-row">
              <span className="chip">{job.location}</span>
              <span className="chip">{job.type}</span>
              <span className="chip c-lime">{job.salary}</span>
            </div>
          ) : (
            <p className="lead">Don’t see the right role? Tell us about yourself and where you’d make an impact.</p>
          )}
        </div>
      </section>

      <section className="sec sec-flush-top">
        <div className="wrap job-layout">
          <aside className="job-side">
            {job && (
              <>
                <p className="job-lede">{job.summary}</p>
                <div className="job-block">
                  <h2>What you’ll do</h2>
                  <ul className="tick-list">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
                <div className="job-block">
                  <h2>What we’re looking for</h2>
                  <ul className="tick-list">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
                {job.niceToHave.length > 0 && (
                  <div className="job-block">
                    <h2>Nice to have</h2>
                    <ul className="tick-list">{job.niceToHave.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                )}
              </>
            )}
            <div className="job-block job-team">
              <h2>{job ? 'People you’ll work with' : 'Some of the team'}</h2>
              <ul>
                {teammates.map((p) => (
                  <li key={p.name}>
                    <Image src={photo(p.photo, 120, 120)} alt={p.name} width={48} height={48} />
                    <span><strong>{p.name}</strong>{p.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="form-card" id="apply">
            <ApplyForm jobSlug={job?.slug ?? GENERAL} jobTitle={job?.title ?? 'General application'} />
          </div>
        </div>
      </section>
    </main>
  );
}
