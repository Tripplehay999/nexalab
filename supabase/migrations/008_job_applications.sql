-- ── Job applications (careers page) ──────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_slug           TEXT NOT NULL,
  job_title          TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT,
  location           TEXT,
  linkedin_url       TEXT,
  portfolio_url      TEXT,
  resume_path        TEXT,
  years_experience   TEXT,
  work_authorization TEXT,
  start_date         TEXT,
  cover_letter       TEXT NOT NULL,
  referral_source    TEXT,
  status             TEXT NOT NULL DEFAULT 'new', -- 'new' | 'reviewing' | 'interview' | 'offer' | 'hired' | 'rejected'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit application" ON public.job_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view applications"      ON public.job_applications FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update applications"    ON public.job_applications FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete applications"    ON public.job_applications FOR DELETE USING (public.is_admin());

-- ── Private resume bucket ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes', 'resumes', false, 5242880,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can upload resumes" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Admins read resumes" ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND public.is_admin());
CREATE POLICY "Admins delete resumes" ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND public.is_admin());
