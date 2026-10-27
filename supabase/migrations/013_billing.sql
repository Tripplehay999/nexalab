-- ── Billing: plans, invoices, payments ──────────────────────────────────────
-- Safe to re-run. Clients can only READ their own billing data (and never drafts);
-- all writes happen as an admin or through the app's server routes (Stripe webhook).

-- Per-client plan + recurring billing settings
CREATE TABLE IF NOT EXISTS public.client_billing (
  client_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan              TEXT,                              -- 'Launch' | 'Operate' | 'Scale' | custom
  monthly_rate      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- recurring amount (0 = no retainer)
  currency          TEXT NOT NULL DEFAULT 'USD',
  status            TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'paused' | 'cancelled'
  auto_invoice      BOOLEAN NOT NULL DEFAULT false,    -- create + email an invoice every month
  next_invoice_date DATE,
  billing_name      TEXT,
  billing_email     TEXT,
  tax_rate          NUMERIC(5,2) NOT NULL DEFAULT 0,   -- % applied to auto invoices
  notes             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_billing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage billing" ON public.client_billing;
CREATE POLICY "Admins manage billing" ON public.client_billing FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own billing" ON public.client_billing;
CREATE POLICY "Clients view own billing" ON public.client_billing FOR SELECT USING (auth.uid() = client_id);

-- Invoices
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  number            TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL DEFAULT 'Services',
  status            TEXT NOT NULL DEFAULT 'draft',     -- 'draft' | 'open' | 'paid' | 'void'
  currency          TEXT NOT NULL DEFAULT 'USD',
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate          NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax               NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date          DATE,
  issued_at         TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  paid_method       TEXT,                              -- 'card' | 'bank' | 'cash' | 'other'
  stripe_session_id TEXT,
  notes             TEXT,
  is_recurring      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_client_status ON public.invoices (client_id, status);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invoices" ON public.invoices;
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own invoices" ON public.invoices;
CREATE POLICY "Clients view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = client_id AND status <> 'draft');

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invoice items" ON public.invoice_items;
CREATE POLICY "Admins manage invoice items" ON public.invoice_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own invoice items" ON public.invoice_items;
CREATE POLICY "Clients view own invoice items" ON public.invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.client_id = auth.uid() AND i.status <> 'draft'));

CREATE TABLE IF NOT EXISTS public.payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  method      TEXT NOT NULL DEFAULT 'card',
  reference   TEXT,                                   -- Stripe payment intent, bank ref…
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_unique ON public.payments (reference) WHERE reference IS NOT NULL;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Clients view own payments" ON public.payments;
CREATE POLICY "Clients view own payments" ON public.payments FOR SELECT USING (auth.uid() = client_id);

-- Sequential invoice numbers like NX-2026-0001 (admins / service role only)
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN 'NX-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated, service_role;
