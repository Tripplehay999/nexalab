-- ── Rate limiting for public endpoints + NexaLab site tracker ────────────────
-- Safe to re-run.

-- ── 1. Rate limits (used by the app's server routes via the service role) ────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT NOT NULL,          -- e.g. 'support:<hashed ip>'
  window_start TIMESTAMPTZ NOT NULL,
  hits         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;  -- no policies: service role only

-- Atomically count a hit; returns true while the caller is within the limit.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w TIMESTAMPTZ := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  n INTEGER;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, hits) VALUES (p_key, w, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO n;
  -- opportunistic cleanup of old windows
  IF random() < 0.01 THEN DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days'; END IF;
  RETURN n <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;

-- ── 2. Close direct anonymous writes (forms now go through rate-limited server routes) ─
DROP POLICY IF EXISTS "Public can submit support request" ON public.support_requests;
DROP POLICY IF EXISTS "Public can submit application" ON public.job_applications;
DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
-- Inquiries are created during onboarding by signed-in clients only.
DROP POLICY IF EXISTS "Public can submit inquiry" ON public.inquiries;
DROP POLICY IF EXISTS "Signed-in users submit inquiry" ON public.inquiries;
CREATE POLICY "Signed-in users submit inquiry" ON public.inquiries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── 3. NexaLab tracker: privacy-friendly analytics for custom-built sites ────
CREATE TABLE IF NOT EXISTS public.site_trackers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_key        TEXT NOT NULL UNIQUE,            -- public, embedded in the snippet
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',    -- events from other domains are ignored
  last_event_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_trackers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage trackers" ON public.site_trackers;
CREATE POLICY "Admins manage trackers" ON public.site_trackers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own tracker" ON public.site_trackers;
CREATE POLICY "Clients view own tracker" ON public.site_trackers FOR SELECT USING (auth.uid() = client_id);

-- Daily totals (no cookies, no personal data — visitors are counted with a daily-rotating hash)
CREATE TABLE IF NOT EXISTS public.tracker_daily (
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day       DATE NOT NULL,
  pageviews INTEGER NOT NULL DEFAULT 0,
  visitors  INTEGER NOT NULL DEFAULT 0,
  orders    INTEGER NOT NULL DEFAULT 0,
  revenue   NUMERIC(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, day)
);
CREATE TABLE IF NOT EXISTS public.tracker_visitors (
  client_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day          DATE NOT NULL,
  visitor_hash TEXT NOT NULL,
  PRIMARY KEY (client_id, day, visitor_hash)
);
CREATE TABLE IF NOT EXISTS public.tracker_pages (
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day       DATE NOT NULL,
  path      TEXT NOT NULL,
  views     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, day, path)
);
CREATE TABLE IF NOT EXISTS public.tracker_referrers (
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day       DATE NOT NULL,
  source    TEXT NOT NULL,
  visits    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, day, source)
);
ALTER TABLE public.tracker_daily     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_visitors  ENABLE ROW LEVEL SECURITY;  -- service role only
ALTER TABLE public.tracker_pages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_referrers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own tracker daily" ON public.tracker_daily;
CREATE POLICY "View own tracker daily" ON public.tracker_daily FOR SELECT USING (auth.uid() = client_id OR public.is_admin());
DROP POLICY IF EXISTS "View own tracker pages" ON public.tracker_pages;
CREATE POLICY "View own tracker pages" ON public.tracker_pages FOR SELECT USING (auth.uid() = client_id OR public.is_admin());
DROP POLICY IF EXISTS "View own tracker referrers" ON public.tracker_referrers;
CREATE POLICY "View own tracker referrers" ON public.tracker_referrers FOR SELECT USING (auth.uid() = client_id OR public.is_admin());

-- Record one event atomically (called by /api/t with the service role).
CREATE OR REPLACE FUNCTION public.tracker_record(p_client UUID, p_day DATE, p_kind TEXT, p_visitor TEXT, p_path TEXT, p_source TEXT, p_value NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted INTEGER := 0;
  is_new BOOLEAN := false;
BEGIN
  IF p_kind = 'pageview' THEN
    INSERT INTO public.tracker_visitors (client_id, day, visitor_hash) VALUES (p_client, p_day, p_visitor) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    is_new := inserted > 0;
    INSERT INTO public.tracker_daily (client_id, day, pageviews, visitors) VALUES (p_client, p_day, 1, CASE WHEN is_new THEN 1 ELSE 0 END)
    ON CONFLICT (client_id, day) DO UPDATE SET pageviews = tracker_daily.pageviews + 1, visitors = tracker_daily.visitors + CASE WHEN is_new THEN 1 ELSE 0 END;
    IF p_path IS NOT NULL THEN
      INSERT INTO public.tracker_pages (client_id, day, path, views) VALUES (p_client, p_day, left(p_path, 200), 1)
      ON CONFLICT (client_id, day, path) DO UPDATE SET views = tracker_pages.views + 1;
    END IF;
    IF is_new AND p_source IS NOT NULL THEN
      INSERT INTO public.tracker_referrers (client_id, day, source, visits) VALUES (p_client, p_day, left(p_source, 120), 1)
      ON CONFLICT (client_id, day, source) DO UPDATE SET visits = tracker_referrers.visits + 1;
    END IF;
  ELSIF p_kind = 'order' THEN
    -- p_visitor carries 'order:<id>' so a reloaded thank-you page isn't counted twice
    IF p_visitor IS NOT NULL THEN
      INSERT INTO public.tracker_visitors (client_id, day, visitor_hash) VALUES (p_client, p_day, p_visitor) ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS inserted = ROW_COUNT;
      IF inserted = 0 THEN RETURN; END IF;
    END IF;
    INSERT INTO public.tracker_daily (client_id, day, orders, revenue) VALUES (p_client, p_day, 1, COALESCE(p_value, 0))
    ON CONFLICT (client_id, day) DO UPDATE SET orders = tracker_daily.orders + 1, revenue = tracker_daily.revenue + COALESCE(p_value, 0);
  END IF;
  UPDATE public.site_trackers SET last_event_at = now() WHERE client_id = p_client;
END;
$$;
REVOKE ALL ON FUNCTION public.tracker_record(UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tracker_record(UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO service_role;
