'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendNotification } from '@/lib/utils';

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function ApplyForm({ jobSlug, jobTitle }: { jobSlug: string; jobTitle: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string || '').trim();
    const fullName = get('fullName');
    const email = get('email');
    const linkedin = get('linkedin');
    const portfolio = get('portfolio');
    const coverLetter = get('coverLetter');
    const resume = fd.get('resume') as File | null;
    const hasResume = !!resume && resume.size > 0;

    if (!fullName || !email || !coverLetter) {
      setError('Please complete all required fields.');
      return;
    }
    if (!hasResume && !linkedin) {
      setError('Please attach a resume or add your LinkedIn profile.');
      return;
    }
    if (hasResume && (resume.size > MAX_RESUME_BYTES || !RESUME_TYPES.includes(resume.type))) {
      setError('Resume must be a PDF or Word document under 5 MB.');
      return;
    }
    if (!fd.get('consent')) {
      setError('Please confirm we may store your application.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const applicationId = crypto.randomUUID();

      let resumePath: string | null = null;
      if (hasResume) {
        const ext = resume.name.split('.').pop()?.toLowerCase() || 'pdf';
        resumePath = `${jobSlug}/${applicationId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('resumes')
          .upload(resumePath, resume, { contentType: resume.type });
        if (uploadErr) {
          setError('Could not upload your resume. Please try again or email careers@nexalab.io');
          setLoading(false);
          return;
        }
      }

      const { error: insertErr } = await supabase.from('job_applications').insert({
        id: applicationId,
        job_slug: jobSlug,
        job_title: jobTitle,
        full_name: fullName,
        email,
        phone: get('phone') || null,
        location: get('location') || null,
        linkedin_url: linkedin || null,
        portfolio_url: portfolio || null,
        resume_path: resumePath,
        years_experience: get('experience') || null,
        work_authorization: get('authorization') || null,
        start_date: get('startDate') || null,
        cover_letter: coverLetter,
        referral_source: get('source') || null,
      });
      if (insertErr) {
        setError('Something went wrong. Please email careers@nexalab.io');
        setLoading(false);
        return;
      }

      await sendNotification('application_admin_alert', {
        name: fullName, email, role: jobTitle, linkedin, portfolio,
        experience: get('experience'), location: get('location'), hasResume,
      });

      setSuccess(true);
    } catch {
      setError('Could not reach our servers. Please email us directly at careers@nexalab.io');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="intake-success">
        <div className="success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="#22d3a8" strokeWidth="1.5" />
            <path d="M7 12l4 4 6-7" stroke="#22d3a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>Application received!</h3>
        <p>Thanks for applying for {jobTitle}. Our team reviews every application and will be in touch within 5 business days.</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <h2 className="form-title">Apply for this role</h2>
      <p className="form-subtitle">Fields marked * are required.</p>

      <div className="form-section">
        <p className="form-section-label">About you</p>
        <div className="form-grid">
          <label className="form-field">Full name * <input name="fullName" type="text" placeholder="Jane Smith" autoComplete="name" required /></label>
          <label className="form-field">Email * <input name="email" type="email" placeholder="jane@email.com" autoComplete="email" required /></label>
          <label className="form-field">Phone <input name="phone" type="tel" placeholder="+1 555 123 4567" autoComplete="tel" /></label>
          <label className="form-field">Location <input name="location" type="text" placeholder="City, Country" /></label>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-label">Resume &amp; links <span className="form-label-muted">(resume or LinkedIn required)</span></p>
        <div className="form-grid">
          <label className="form-field file-field">
            Resume (PDF or Word, max 5 MB)
            <input name="resume" type="file" accept=".pdf,.doc,.docx" />
          </label>
          <label className="form-field">LinkedIn <input name="linkedin" type="url" placeholder="https://linkedin.com/in/..." /></label>
          <label className="form-field">Portfolio / GitHub <input name="portfolio" type="url" placeholder="https://github.com/..." /></label>
          <label className="form-field">
            Years of experience
            <select name="experience">
              <option value="">Select</option>
              <option value="0-2">0 – 2 years</option>
              <option value="3-5">3 – 5 years</option>
              <option value="6-9">6 – 9 years</option>
              <option value="10+">10+ years</option>
            </select>
          </label>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-label">Logistics</p>
        <div className="form-grid">
          <label className="form-field">
            Work authorization
            <select name="authorization">
              <option value="">Select</option>
              <option value="authorized">Authorized to work, no sponsorship needed</option>
              <option value="sponsorship">Will require sponsorship</option>
              <option value="contractor">Open to contractor arrangement</option>
            </select>
          </label>
          <label className="form-field">
            Earliest start date
            <select name="startDate">
              <option value="">Select</option>
              <option value="immediately">Immediately</option>
              <option value="2-weeks">2 weeks</option>
              <option value="1-month">1 month</option>
              <option value="2-months+">2+ months</option>
            </select>
          </label>
          <label className="form-field">
            How did you hear about us?
            <select name="source">
              <option value="">Select</option>
              <option value="linkedin">LinkedIn</option>
              <option value="referral">Referral</option>
              <option value="job-board">Job board</option>
              <option value="social">Social media</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-label">Why NexaLab?</p>
        <label className="form-field">
          Tell us about yourself *
          <textarea
            name="coverLetter"
            rows={6}
            placeholder="What interests you about this role? Share a project you're proud of and what you'd bring to the team."
            required
          />
        </label>
      </div>

      <label className="checkbox-field consent-field">
        <input type="checkbox" name="consent" value="yes" />
        <span className="checkbox-box" />
        I agree that NexaLab may store my application and contact me about this and future roles.
      </label>

      {error && <p className="error-text" aria-live="polite">{error}</p>}
      <div className="form-submit-row">
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? (
            <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : 'Submit application'}
        </button>
        <p className="submit-note">We review every application personally.</p>
      </div>
    </form>
  );
}
