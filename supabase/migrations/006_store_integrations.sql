-- Migration 006: Store integrations — connect external stores to NexaLab
-- Run in Supabase Dashboard → SQL Editor

-- ── 1. Integration credentials (one per client, admin-only access) ──────────
CREATE TABLE IF NOT EXISTS public.store_integrations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform         TEXT        NOT NULL, -- 'woocommerce' | 'shopify' | 'bigcommerce'
  store_url        TEXT        NOT NULL,
  api_key          TEXT,                 -- WooCommerce consumer key / BigCommerce client id
  api_secret       TEXT,                 -- WooCommerce consumer secret
  access_token     TEXT,                 -- Shopify access token / BigCommerce access token
  store_hash       TEXT,                 -- BigCommerce store hash
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Daily aggregated metrics (written by Edge Function) ───────────────────
CREATE TABLE IF NOT EXISTS public.store_metrics (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  integration_id   UUID        NOT NULL REFERENCES public.store_integrations(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  revenue          NUMERIC     NOT NULL DEFAULT 0,
  orders           INTEGER     NOT NULL DEFAULT 0,
  customers        INTEGER     NOT NULL DEFAULT 0,
  avg_order_value  NUMERIC     NOT NULL DEFAULT 0,
  currency         TEXT        NOT NULL DEFAULT 'USD',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, date)
);

-- ── 3. Individual orders feed ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  integration_id   UUID        NOT NULL REFERENCES public.store_integrations(id) ON DELETE CASCADE,
  external_id      TEXT        NOT NULL,
  amount           NUMERIC     NOT NULL DEFAULT 0,
  currency         TEXT        NOT NULL DEFAULT 'USD',
  customer_name    TEXT,
  customer_email   TEXT,
  status           TEXT,
  platform         TEXT,
  ordered_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders       ENABLE ROW LEVEL SECURITY;

-- store_integrations: admins full access, clients see their own (no credentials exposed — handled in JS)
CREATE POLICY "Admins manage store_integrations"
  ON public.store_integrations FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Clients view own store_integrations"
  ON public.store_integrations FOR SELECT USING (auth.uid() = client_id);

-- store_metrics: clients see their own, admins see all
CREATE POLICY "Clients view own store_metrics"
  ON public.store_metrics FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Admins manage store_metrics"
  ON public.store_metrics FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- store_orders: clients see their own, admins see all
CREATE POLICY "Clients view own store_orders"
  ON public.store_orders FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Admins manage store_orders"
  ON public.store_orders FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Auto-update updated_at on store_metrics
CREATE TRIGGER set_store_metrics_updated_at
  BEFORE UPDATE ON public.store_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
