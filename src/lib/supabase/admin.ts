import { createClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS. SERVER ONLY — import this only from route
// handlers, never from components. Requires SUPABASE_SERVICE_ROLE_KEY in the
// hosting environment (Vercel → Settings → Environment Variables).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
