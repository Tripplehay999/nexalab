-- Migration 003: Full client journey — pending projects + ticket replies
-- Run in Supabase Dashboard → SQL Editor

-- ── 1. Capture selected plan on contact form ─────────────────────────────────
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS plan TEXT;

-- ── 2. Link a project back to the inquiry that created it ────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id);

-- ── 3. Ticket replies (threaded conversation between client and admin) ────────
CREATE TABLE IF NOT EXISTS ticket_replies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   UUID        REFERENCES profiles(id),
  author_name TEXT,
  content     TEXT        NOT NULL,
  is_admin    BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

-- Clients: view replies on their own tickets
CREATE POLICY "clients_view_own_ticket_replies" ON ticket_replies
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM tickets WHERE client_id = auth.uid()
    )
  );

-- Clients: insert replies on their own tickets
CREATE POLICY "clients_insert_own_ticket_replies" ON ticket_replies
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND ticket_id IN (
      SELECT id FROM tickets WHERE client_id = auth.uid()
    )
  );

-- Admins: full access to all replies
CREATE POLICY "admins_manage_ticket_replies" ON ticket_replies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
