import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { adminOrError } from '@/lib/integrations';
import { notifyAsServer } from '@/lib/billing-server';
import { getJob } from '@/lib/jobs';
import { clientIp, looksLikeBot, rateLimit, tooMany, verifyTurnstile } from '@/lib/security';

// Job applications from /careers (multipart: fields + optional resume file).
const MAX_RESUME = 4 * 1024 * 1024; // keeps the request under Vercel's 4.5 MB body limit
const RESUME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const field = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? '').trim().slice(0, max);

export async function POST(request: Request) {
  const fd = await request.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  if (looksLikeBot({ company_website: fd.get('company_website'), _t: fd.get('_t') })) return NextResponse.json({ ok: true });

  const db = adminOrError();
  if ('error' in db) return db.error;
  const ip = clientIp(request);
  if (!(await rateLimit(db.db, 'apply-hour', ip, 3, 3600)) || !(await rateLimit(db.db, 'apply-day', ip, 6, 86400))) {
    return NextResponse.json(tooMany('applications'), { status: 429 });
  }
  if (!(await verifyTurnstile(fd.get('turnstile'), ip))) return NextResponse.json({ error: 'Please complete the “I’m human” check.' }, { status: 400 });

  const jobSlug = field(fd, 'jobSlug', 80);
  const job = getJob(jobSlug);
  const jobTitle = job?.title ?? 'General application';
  const fullName = field(fd, 'fullName', 120);
  const email = field(fd, 'email', 200);
  const linkedin = field(fd, 'linkedin');
  const coverLetter = field(fd, 'coverLetter', 8000);
  const resume = fd.get('resume');
  const hasResume = resume instanceof File && resume.size > 0;

  if (!fullName || !coverLetter || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
  if (!hasResume && !linkedin) return NextResponse.json({ error: 'Please attach a resume or add your LinkedIn profile.' }, { status: 400 });
  if (hasResume && (resume.size > MAX_RESUME || !RESUME_TYPES[resume.type])) return NextResponse.json({ error: 'Resume must be a PDF or Word document under 4 MB.' }, { status: 400 });

  const id = randomUUID();
  let resumePath: string | null = null;
  if (hasResume) {
    resumePath = `${job ? jobSlug : 'general-application'}/${id}.${RESUME_TYPES[resume.type]}`;
    const { error } = await db.db.storage.from('resumes').upload(resumePath, resume, { contentType: resume.type });
    if (error) return NextResponse.json({ error: 'Couldn’t upload your resume — please try again or email careers@nexalab.studio.' }, { status: 500 });
  }

  const { error } = await db.db.from('job_applications').insert({
    id, job_slug: job ? jobSlug : 'general-application', job_title: jobTitle, full_name: fullName, email,
    phone: field(fd, 'phone', 40) || null, location: field(fd, 'location', 120) || null,
    linkedin_url: /^https?:\/\//i.test(linkedin) ? linkedin : null,
    portfolio_url: /^https?:\/\//i.test(field(fd, 'portfolio')) ? field(fd, 'portfolio') : null,
    resume_path: resumePath, years_experience: field(fd, 'experience', 20) || null,
    work_authorization: field(fd, 'authorization', 40) || null, start_date: field(fd, 'startDate', 40) || null,
    cover_letter: coverLetter, referral_source: field(fd, 'source', 40) || null,
  });
  if (error) return NextResponse.json({ error: 'Something went wrong — please email careers@nexalab.studio.' }, { status: 500 });

  await notifyAsServer('application_admin_alert', { name: fullName, email, role: jobTitle, linkedin, portfolio: field(fd, 'portfolio'), experience: field(fd, 'experience'), location: field(fd, 'location'), hasResume });
  return NextResponse.json({ ok: true });
}
