// NexaLab — Nav auth state
// Runs on public pages to swap "Sign in" for "Dashboard" when user is logged in.
// Requires Supabase CDN + supabase-config.js to be loaded first.

(async function navAuth() {
  const btn = document.getElementById('nav-auth-btn');
  if (!btn) return;

  try {
    const { data: { session } } = await nexaSupabase.auth.getSession();
    if (!session) return; // Not signed in — keep Sign in button as-is

    // Fetch role to decide which dashboard to link to
    const { data: profile } = await nexaSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    btn.href        = profile?.role === 'admin' ? 'admin.html' : 'dashboard.html';
    btn.textContent = 'Dashboard';
    btn.classList.remove('btn-outline');
    btn.classList.add('btn-primary');
  } catch (_) {
    // Silently fail — public page, auth is optional
  }
})();
