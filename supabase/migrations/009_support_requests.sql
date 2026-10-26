-- ── Support requests (public /support page) ─────────────
-- Lets anyone — including people without a client account — open a support
-- request. Signed-in clients with a project file regular tickets instead.
CREATE TABLE IF NOT EXISTS public.support_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref         TEXT NOT NULL,                     -- e.g. 'SR-4F2A9C', shown to the requester
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  company     TEXT,
  store_url   TEXT,
  topic       TEXT NOT NULL,                     -- 'Orders & shipping' | 'Payments & checkout' | ...
  priority    TEXT NOT NULL DEFAULT 'normal',    -- 'urgent' | 'high' | 'normal' | 'planning'
  subject     TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',      -- 'open' | 'in-progress' | 'resolved'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit support request" ON public.support_requests;
CREATE POLICY "Public can submit support request" ON public.support_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins view support requests" ON public.support_requests;
CREATE POLICY "Admins view support requests"      ON public.support_requests FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins update support requests" ON public.support_requests;
CREATE POLICY "Admins update support requests"    ON public.support_requests FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "Admins delete support requests" ON public.support_requests;
CREATE POLICY "Admins delete support requests"    ON public.support_requests FOR DELETE USING (public.is_admin());

-- ── Inquiries: internal admin note (used by /admin/inquiries) ──
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS admin_note TEXT;
