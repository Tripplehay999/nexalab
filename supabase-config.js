// NexaLab — Supabase configuration
// ─────────────────────────────────────────────────────────
// Fill in your credentials below.
// Find them at: https://app.supabase.com → Project Settings → API
// ─────────────────────────────────────────────────────────

const NEXALAB_SUPABASE_URL  = 'https://qetqnytkuyevymbjzikj.supabase.co';
const NEXALAB_SUPABASE_KEY  = 'sb_publishable_K_weuSzHaduZbyiUUVnzgA_4bCav95J';

// Initialize the global Supabase client.
// This file must be loaded AFTER the Supabase CDN script.
const nexaSupabase = window.supabase.createClient(
  NEXALAB_SUPABASE_URL,
  NEXALAB_SUPABASE_KEY,
  {
    auth: {
      // Keep session in localStorage so users stay logged in across tabs
      persistSession: true,
      storageKey: 'nexalab-auth',
    },
  },
);
