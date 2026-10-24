import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ApplyForm from '@/components/ApplyForm';
import { JOBS, getJob } from '@/lib/jobs';

const GENERAL = 'general-application';

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

  return (
    <main>
      <section className="page-hero contact-hero">
        <div className="container">
          <Link href="/careers#open-roles" className="job-back">← All open roles</Link>
          <p className="eyebrow">{job ? job.department : 'Careers'}</p>
          <h1>{job ? job.title : 'General application'}</h1>
          {job ? (
            <div className="job-meta">
              <span>{job.location}</span>
              <span>{job.type}</span>
              <span>{job.salary}</span>
            </div>
          ) : (
            <p className="subtitle">Don&apos;t see the right role? Tell us about yourself and where you&apos;d make an impact.</p>
          )}
        </div>
      </section>

      <section className="section contact-section">
        <div className="container">
          <div className="contact-layout job-layout">
            {job && (
              <aside className="job-details">
                <p className="job-summary">{job.summary}</p>
                <div className="sidebar-block">
                  <p className="sidebar-label">What you&apos;ll do</p>
                  <ul className="list">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
                <div className="sidebar-block">
                  <p className="sidebar-label">What we&apos;re looking for</p>
                  <ul className="list">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
                {job.niceToHave.length > 0 && (
                  <div className="sidebar-block">
                    <p className="sidebar-label">Nice to have</p>
                    <ul className="list">{job.niceToHave.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                )}
              </aside>
            )}

            <div className="contact-form-wrap" id="apply">
              <ApplyForm jobSlug={job?.slug ?? GENERAL} jobTitle={job?.title ?? 'General application'} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
