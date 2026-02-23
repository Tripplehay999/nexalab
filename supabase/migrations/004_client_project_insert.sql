-- Migration 004: Allow authenticated clients to create their own pending projects
-- Run in Supabase Dashboard → SQL Editor

-- Clients can insert a project for themselves, but only with status = 'pending'
-- (admin approval changes it to 'active')
CREATE POLICY "Clients create own pending project" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND status = 'pending'
  );
