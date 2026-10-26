'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Job } from '@/lib/jobs';

export default function RoleBrowser({ jobs }: { jobs: Job[] }) {
  const departments = ['All', ...Array.from(new Set(jobs.map((j) => j.department)))];
  const [dept, setDept] = useState('All');
  const shown = dept === 'All' ? jobs : jobs.filter((j) => j.department === dept);

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Filter by team">
        {departments.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={dept === d}
            className={`tab ${dept === d ? 'is-active' : ''}`}
            onClick={() => setDept(d)}
          >
            {d}
            <span>{d === 'All' ? jobs.length : jobs.filter((j) => j.department === d).length}</span>
          </button>
        ))}
      </div>
      <ul className="roles">
        {shown.map((job) => (
          <li key={job.slug}>
            <Link href={`/careers/${job.slug}`} className="role">
              <div>
                <span className="role-dept">{job.department}</span>
                <strong>{job.title}</strong>
                <p>{job.summary}</p>
              </div>
              <div className="role-meta">
                <span>{job.location}</span>
                <span>{job.salary}</span>
                <span className="role-go" aria-hidden="true">→</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
