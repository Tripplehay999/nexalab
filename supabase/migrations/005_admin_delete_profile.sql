-- Migration 005: Allow admins to delete client profiles
-- Run in Supabase Dashboard → SQL Editor

CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());
