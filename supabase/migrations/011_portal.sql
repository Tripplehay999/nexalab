-- ── Client portal v2: staff, assignments, insights, goals, resources ─────────
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- Website details shown on the client dashboard (also captured in onboarding).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform TEXT;

-- ── Staff (NexaLab team members) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT NOT NULL,
  title      TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  photo_url  TEXT,
  city       TEXT,
  bio        TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage staff" ON public.staff;
CREATE POLICY "Admins manage staff" ON public.staff FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Signed-in users view active staff" ON public.staff;
CREATE POLICY "Signed-in users view active staff" ON public.staff FOR SELECT USING (auth.uid() IS NOT NULL AND is_active);

-- ── Which staff work with which client ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id   UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'Team member',  -- e.g. 'Account lead', 'Developer', 'Designer'
  is_primary BOOLEAN NOT NULL DEFAULT false,       -- the client's main point of contact
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, staff_id)
);
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage assignments" ON public.client_assignments;
CREATE POLICY "Admins manage assignments" ON public.client_assignments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own assignments" ON public.client_assignments;
CREATE POLICY "Clients view own assignments" ON public.client_assignments FOR SELECT USING (auth.uid() = client_id);

-- ── Insights: numbers clients (or staff) add over time ───────────────────────
CREATE TABLE IF NOT EXISTS public.client_metrics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric     TEXT NOT NULL,                    -- 'revenue' | 'orders' | 'visitors' | 'conversion' | 'aov' | 'subscribers' | custom slug
  label      TEXT,                             -- display name for custom metrics
  value      NUMERIC NOT NULL,
  period     DATE NOT NULL DEFAULT CURRENT_DATE,
  note       TEXT,
  source     TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'nexalab' | integration name
  created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_metrics_client_metric_period ON public.client_metrics (client_id, metric, period);
ALTER TABLE public.client_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage metrics" ON public.client_metrics;
CREATE POLICY "Admins manage metrics" ON public.client_metrics FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own metrics" ON public.client_metrics;
CREATE POLICY "Clients view own metrics" ON public.client_metrics FOR SELECT USING (auth.uid() = client_id);
DROP POLICY IF EXISTS "Clients add own metrics" ON public.client_metrics;
CREATE POLICY "Clients add own metrics" ON public.client_metrics FOR INSERT WITH CHECK (auth.uid() = client_id AND source = 'manual');
DROP POLICY IF EXISTS "Clients delete metrics they added" ON public.client_metrics;
CREATE POLICY "Clients delete metrics they added" ON public.client_metrics FOR DELETE USING (auth.uid() = client_id AND created_by = auth.uid());

-- ── Goals: targets for a metric ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_goals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric     TEXT NOT NULL,
  label      TEXT,
  target     NUMERIC NOT NULL,
  due_date   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage goals" ON public.client_goals;
CREATE POLICY "Admins manage goals" ON public.client_goals FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients manage own goals" ON public.client_goals;
CREATE POLICY "Clients manage own goals" ON public.client_goals FOR ALL USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

-- ── Resources: shared links (brand assets, Drive, Figma, logins…) ────────────
CREATE TABLE IF NOT EXISTS public.client_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  url        TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'General',  -- 'Brand' | 'Files' | 'Design' | 'Store' | 'General'
  added_by   UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage links" ON public.client_links;
CREATE POLICY "Admins manage links" ON public.client_links FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own links" ON public.client_links;
CREATE POLICY "Clients view own links" ON public.client_links FOR SELECT USING (auth.uid() = client_id);
DROP POLICY IF EXISTS "Clients add own links" ON public.client_links;
CREATE POLICY "Clients add own links" ON public.client_links FOR INSERT WITH CHECK (auth.uid() = client_id);
DROP POLICY IF EXISTS "Clients delete links they added" ON public.client_links;
CREATE POLICY "Clients delete links they added" ON public.client_links FOR DELETE USING (auth.uid() = client_id AND added_by = auth.uid());

-- ── Starter team (only if the staff table is empty) ──────────────────────────
-- PLACEHOLDER people from the marketing site — edit or replace them in Admin → Team.
INSERT INTO public.staff (full_name, title, email, photo_url, city)
SELECT * FROM (VALUES
  ('Sofia Marchetti', 'Head of Client Success', 'hello@nexalab.studio', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces&w=240&h=240&q=80', 'Brooklyn'),
  ('Al-Hamid (AJ)',   'Lead On-Call Developer', 'hello@nexalab.studio', 'https://nexalab.studio/team/aj.png', 'Toronto'),
  ('Marcus Tan',      'Co-founder & CEO',       'hello@nexalab.studio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&crop=faces&w=240&h=240&q=80', 'Brooklyn'),
  ('Amara Okafor',    'Design Director',        'hello@nexalab.studio', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&crop=faces&w=240&h=240&q=80', 'Brooklyn'),
  ('Hannah Brooks',   'Account Manager',        'hello@nexalab.studio', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&crop=faces&w=240&h=240&q=80', 'Toronto'),
  ('Jade McMiller',   'Head of Recruiting & HR', 'careers@nexalab.studio', 'https://images.unsplash.com/photo-1507152832244-10d45c7eda57?auto=format&fit=crop&crop=faces&w=240&h=240&q=80', 'Atlanta')
) AS seed(full_name, title, email, photo_url, city)
WHERE NOT EXISTS (SELECT 1 FROM public.staff);
