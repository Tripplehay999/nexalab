import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

let warned = false;

export function createClient() {
  if (!supabaseConfigured && !warned) {
    warned = true;
    console.error(
      'NexaLab: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Add them to your hosting environment variables and redeploy. Auth and forms are disabled until then.',
    );
  }
  // Without config, fall back to a placeholder project so public pages keep rendering:
  // requests simply fail and each form shows its own "email us instead" error.
  return createBrowserClient(url || 'https://not-configured.supabase.co', key || 'not-configured');
}
