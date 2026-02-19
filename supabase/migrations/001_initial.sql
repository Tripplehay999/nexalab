-- ─────────────────────────────────────────────────────────
-- NexaLab — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────

-- ── Client profiles (extends Supabase auth.users) ────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  company     TEXT,
  role        TEXT NOT NULL DEFAULT 'client', -- 'client' | 'admin'
  avatar_initials TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Contact form inquiries ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT NOT NULL,
  work_email  TEXT NOT NULL,
  company     TEXT,
  website     TEXT,
  platform    TEXT,
  revenue     TEXT NOT NULL,
  budget      TEXT NOT NULL,
  timeline    TEXT,
  services    TEXT[] DEFAULT '{}',
  goal        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new', -- 'new' | 'contacted' | 'converted' | 'closed'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'complete'
  plan        TEXT, -- e.g. 'Full-Stack Commerce Retainer'
  started_at  DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Milestones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'complete'
  due_date    DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Milestone sub-tasks ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.milestone_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'done'
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- ── Deliverables ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deliverables (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'doc', -- 'doc' | 'code' | 'link'
  url          TEXT,
  meta         TEXT, -- e.g. "PDF · 12 pages" or "GitHub PR"
  status       TEXT NOT NULL DEFAULT 'upcoming', -- 'ready' | 'upcoming'
  delivered_at DATE,
  due_date     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Support tickets ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT, -- e.g. 'Storefront' | 'Checkout' | 'General'
  status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'in-progress' | 'resolved'
  ticket_ref  TEXT, -- e.g. '#NX-041'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Activity log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT 'gray', -- 'green' | 'blue' | 'purple' | 'gray'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Account leads (NexaLab team members) ─────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'Commerce Engineer',
  initials     TEXT NOT NULL,
  time_zone    TEXT NOT NULL DEFAULT 'EST (UTC -5)',
  response_time TEXT NOT NULL DEFAULT 'Same day',
  next_checkin  TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads          ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Inquiries: anyone can insert (contact form, no auth required)
CREATE POLICY "Public can submit inquiry" ON public.inquiries FOR INSERT WITH CHECK (true);

-- Projects
CREATE POLICY "Clients view own projects" ON public.projects FOR SELECT
  USING (auth.uid() = client_id);

-- Milestones
CREATE POLICY "Clients view own milestones" ON public.milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = milestones.project_id
      AND projects.client_id = auth.uid()
  ));

-- Milestone tasks
CREATE POLICY "Clients view own tasks" ON public.milestone_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = milestone_tasks.milestone_id
      AND p.client_id = auth.uid()
  ));

-- Deliverables
CREATE POLICY "Clients view own deliverables" ON public.deliverables FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = deliverables.project_id
      AND projects.client_id = auth.uid()
  ));

-- Tickets: clients can view and create their own
CREATE POLICY "Clients view own tickets" ON public.tickets FOR SELECT
  USING (auth.uid() = client_id);
CREATE POLICY "Clients create tickets" ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Activity
CREATE POLICY "Clients view own activity" ON public.activity FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = activity.project_id
      AND projects.client_id = auth.uid()
  ));

-- Leads
CREATE POLICY "Clients view own leads" ON public.leads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = leads.project_id
      AND projects.client_id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────
-- Auto-create profile when a user signs up
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company, avatar_initials)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company',
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), 1) ||
          LEFT(COALESCE(SPLIT_PART(NEW.raw_user_meta_data ->> 'full_name', ' ', 2), ''), 1)
)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- Auto-update updated_at timestamps
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER set_profiles_updated_at  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_tickets_updated_at   BEFORE UPDATE ON public.tickets    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
