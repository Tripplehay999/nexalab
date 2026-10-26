-- ── Client onboarding ────────────────────────────────────
-- New clients complete /onboarding on first login. Answers are saved as they go
-- (so a refresh resumes where they left off); onboarded_at marks completion.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone           TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title       TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding      JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at    TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_sent_at TIMESTAMPTZ;

-- Existing clients and admins shouldn't be pushed through onboarding.
UPDATE public.profiles SET onboarded_at = now() WHERE onboarded_at IS NULL;

-- ── Lock down self-service profile edits ─────────────────
-- "Users update own profile" lets a user update their own row, which previously
-- included `role` — i.e. any client could promote themselves to admin.
-- Only admins (or the service role / SQL editor, where auth.uid() is null) may
-- change role or the server-managed welcome_sent_at.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to change role';
  END IF;
  IF NEW.welcome_sent_at IS DISTINCT FROM OLD.welcome_sent_at THEN
    RAISE EXCEPTION 'Not allowed to change welcome_sent_at';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns ON public.profiles;
CREATE TRIGGER protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();
