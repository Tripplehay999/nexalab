-- ── Resources: uploaded files + analytics connections ───────────────────────
-- Safe to re-run.

-- Files live in the private "client-files" bucket under <client_id>/…; a row in
-- client_links points at them (file_path set, url null).
ALTER TABLE public.client_links ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.client_links ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.client_links ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.client_links ALTER COLUMN url DROP NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-files', 'client-files', false, 52428800)  -- 50 MB per file
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Clients upload own files" ON storage.objects;
CREATE POLICY "Clients upload own files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
DROP POLICY IF EXISTS "Clients read own files" ON storage.objects;
CREATE POLICY "Clients read own files" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
DROP POLICY IF EXISTS "Clients delete own files" ON storage.objects;
CREATE POLICY "Clients delete own files" ON storage.objects FOR DELETE
  USING (bucket_id = 'client-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- ── Analytics connections (Google Analytics 4, Plausible…) ──────────────────
CREATE TABLE IF NOT EXISTS public.analytics_connections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL,                -- 'google_analytics' | 'plausible'
  account_label  TEXT,                         -- e.g. Google account email or Plausible site
  property_id    TEXT,                         -- GA4 property ("properties/123") or Plausible site_id
  property_label TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',  -- 'pending' (pick a property) | 'active' | 'error'
  last_synced_at TIMESTAMPTZ,
  last_error     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider)
);
ALTER TABLE public.analytics_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage analytics connections" ON public.analytics_connections;
CREATE POLICY "Admins manage analytics connections" ON public.analytics_connections FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own analytics connections" ON public.analytics_connections;
CREATE POLICY "Clients view own analytics connections" ON public.analytics_connections FOR SELECT USING (auth.uid() = client_id);
-- Inserts/updates/deletes happen through the app's server routes (service role).

-- Tokens/keys: RLS on with NO policies, so only the service role can read or write them.
CREATE TABLE IF NOT EXISTS public.analytics_secrets (
  connection_id UUID PRIMARY KEY REFERENCES public.analytics_connections(id) ON DELETE CASCADE,
  refresh_token TEXT,
  api_key       TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_secrets ENABLE ROW LEVEL SECURITY;

-- ── Store connections: hide credentials from the browser ────────────────────
-- "Clients view own store_integrations" let a client's browser read the stored
-- API keys/tokens. Keep row access, but only expose non-secret columns; the
-- app's server routes and the sync-store function use the service role.
REVOKE SELECT ON public.store_integrations FROM anon, authenticated;
GRANT SELECT (id, client_id, platform, store_url, store_hash, is_active, last_synced_at, created_at)
  ON public.store_integrations TO authenticated;

-- ── GitHub repos (custom-built sites): recent code updates on the Project page ─
CREATE TABLE IF NOT EXISTS public.client_repos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,              -- "owner/repo"
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_repos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage repos" ON public.client_repos;
CREATE POLICY "Admins manage repos" ON public.client_repos FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own repo" ON public.client_repos;
CREATE POLICY "Clients view own repo" ON public.client_repos FOR SELECT USING (auth.uid() = client_id);

-- Read-only GitHub tokens for private repos — service role only (no policies).
CREATE TABLE IF NOT EXISTS public.repo_secrets (
  repo_id UUID PRIMARY KEY REFERENCES public.client_repos(id) ON DELETE CASCADE,
  token   TEXT NOT NULL
);
ALTER TABLE public.repo_secrets ENABLE ROW LEVEL SECURITY;
