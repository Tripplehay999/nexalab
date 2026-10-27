-- ── Security hardening ───────────────────────────────────────────────────────
-- Safe to re-run. Constraints are added NOT VALID so existing rows don't block the
-- migration; they're enforced for every new insert/update.

-- 1. Only http(s) links can be stored where users supply URLs. A "javascript:" URL
--    inserted through the API would otherwise run when an admin clicks it.
ALTER TABLE public.client_links DROP CONSTRAINT IF EXISTS client_links_url_http;
ALTER TABLE public.client_links ADD CONSTRAINT client_links_url_http CHECK (url IS NULL OR url ~* '^https?://') NOT VALID;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_website_http;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_website_http CHECK (website IS NULL OR website ~* '^https?://') NOT VALID;
ALTER TABLE public.deliverables DROP CONSTRAINT IF EXISTS deliverables_url_http;
ALTER TABLE public.deliverables ADD CONSTRAINT deliverables_url_http CHECK (url IS NULL OR url ~* '^https?://') NOT VALID;
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_photo_http;
ALTER TABLE public.staff ADD CONSTRAINT staff_photo_http CHECK (photo_url IS NULL OR photo_url ~* '^https?://') NOT VALID;

-- 2. Clients may only open tickets on their OWN project.
DROP POLICY IF EXISTS "Clients create tickets" ON public.tickets;
CREATE POLICY "Clients create tickets" ON public.tickets FOR INSERT WITH CHECK (
  auth.uid() = client_id
  AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid())
);

-- 3. Rows clients add are always attributed to themselves.
DROP POLICY IF EXISTS "Clients add own metrics" ON public.client_metrics;
CREATE POLICY "Clients add own metrics" ON public.client_metrics FOR INSERT
  WITH CHECK (auth.uid() = client_id AND source = 'manual' AND created_by = auth.uid());
DROP POLICY IF EXISTS "Clients add own links" ON public.client_links;
CREATE POLICY "Clients add own links" ON public.client_links FOR INSERT
  WITH CHECK (auth.uid() = client_id AND added_by = auth.uid()
              AND (file_path IS NULL OR file_path LIKE auth.uid()::text || '/%'));

-- 4. Clients can't change the email notifications go to (or their role / welcome flag).
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
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Not allowed to change email here';
  END IF;
  RETURN NEW;
END;
$$;
