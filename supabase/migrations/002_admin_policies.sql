-- ─────────────────────────────────────────────────────────
-- NexaLab — Admin policies & email column
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────

-- ── Add email column to profiles ──────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email for any existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Update new-user trigger to also save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company, avatar_initials, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company',
    UPPER(
      LEFT(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), 1) ||
      LEFT(COALESCE(SPLIT_PART(NEW.raw_user_meta_data ->> 'full_name', ' ', 2), ''), 1)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- ── Admin role helper ─────────────────────────────────────
-- Returns true if the calling Supabase user has role = 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── Profiles ──────────────────────────────────────────────
CREATE POLICY "Admins view all profiles"   ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

-- ── Inquiries ─────────────────────────────────────────────
CREATE POLICY "Admins view all inquiries" ON public.inquiries FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update inquiries"   ON public.inquiries FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete inquiries"   ON public.inquiries FOR DELETE USING (public.is_admin());

-- ── Projects ──────────────────────────────────────────────
CREATE POLICY "Admins manage projects"
  ON public.projects FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Milestones ────────────────────────────────────────────
CREATE POLICY "Admins manage milestones"
  ON public.milestones FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Milestone tasks ───────────────────────────────────────
CREATE POLICY "Admins manage milestone_tasks"
  ON public.milestone_tasks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Deliverables ──────────────────────────────────────────
CREATE POLICY "Admins manage deliverables"
  ON public.deliverables FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Tickets ───────────────────────────────────────────────
CREATE POLICY "Admins manage tickets"
  ON public.tickets FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Activity ──────────────────────────────────────────────
CREATE POLICY "Admins manage activity"
  ON public.activity FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Leads ─────────────────────────────────────────────────
CREATE POLICY "Admins manage leads"
  ON public.leads FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
