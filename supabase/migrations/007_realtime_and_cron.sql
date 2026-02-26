-- NexaLab — Migration 007: Realtime + pg_cron auto-sync
--
-- BEFORE running this migration, set the cron secret in your DB:
--   ALTER DATABASE postgres SET app.settings.cron_secret = '<your-cron-secret>';
-- (Use the same value you set as the CRON_SECRET edge function secret)
--
-- Run this in: Supabase Dashboard → SQL Editor

-- ── 1. Enable required extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. Enable Realtime on store tables ────────────────────────────────────────
-- REPLICA IDENTITY FULL is required so Realtime can filter by client_id on updates/deletes
ALTER TABLE public.store_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.store_orders  REPLICA IDENTITY FULL;

-- Add tables to the Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_orders;

-- ── 3. Schedule auto-sync every 15 minutes via pg_cron ────────────────────────
-- Calls sync-store with x-cron-secret header; no integration_id = sync all active
SELECT cron.schedule(
  'sync-stores-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qetqnytkuyevymbjzikj.supabase.co/functions/v1/sync-store',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);
