// NexaLab — Client Portal boot script
// 1. Immediately injects sidebar HTML (no flash)
// 2. Exposes window.clientBoot — an async promise resolving to { userId, profile, project, session }
// Load order: supabase-config.js → portal-utils.js → client-boot.js → page-specific.js

(function buildClientSidebar() {
  const SVGs = {
    overview:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>',
    project:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.7"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    deliverables: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    analytics:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    store:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    support:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const PAGES = [
    { href: 'dashboard.html',        key: 'overview',     label: 'Overview'     },
    { href: 'dash-project.html',     key: 'project',      label: 'Project'      },
    { href: 'dash-deliverables.html',key: 'deliverables', label: 'Deliverables' },
    { href: 'dash-analytics.html',   key: 'analytics',    label: 'Analytics'    },
    { href: 'dash-store.html',       key: 'store',        label: 'Store'        },
    { href: 'dash-support.html',     key: 'support',      label: 'Support'      },
  ];

  const currentFile = location.pathname.split('/').pop() || 'dashboard.html';

  const navHtml = PAGES.map((p) => {
    const active = p.href === currentFile ? ' is-active' : '';
    const extra  = p.key === 'support'
      ? '<span class="dash-badge" id="dash-support-badge" hidden></span>'
      : '';
    return `<a href="${p.href}" class="dash-nav-item${active}">${SVGs[p.key]} ${p.label}${extra}</a>`;
  }).join('');

  const sidebar = document.getElementById('dash-sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="dash-brand">
        <a href="index.html" class="brand">NexaLab</a>
        <span class="dash-portal-badge">Client Portal</span>
      </div>
      <div class="dash-client-card">
        <div class="dash-avatar" id="dash-avatar">—</div>
        <div>
          <p class="dash-client-name" id="dash-client-name">Loading…</p>
          <p class="dash-client-company" id="dash-client-company"></p>
        </div>
      </div>
      <nav class="dash-nav">${navHtml}</nav>
      <div class="dash-sidebar-footer">
        <a href="contact.html" class="dash-sidebar-link">Book a call</a>
        <a href="index.html" class="dash-sidebar-link">← Back to site</a>
        <button id="dash-logout" class="dash-sidebar-link dash-logout-btn">Sign out</button>
      </div>`;
  }
})();

// ── Shared async boot promise ──────────────────────────────
window.clientBoot = (async function () {
  const { data: { session } } = await nexaSupabase.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return null; }
  const userId = session.user.id;

  // Date
  const dateEl = document.getElementById('dash-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  // Logout
  document.getElementById('dash-logout')?.addEventListener('click', async () => {
    await nexaSupabase.auth.signOut();
    window.location.href = 'auth.html';
  });

  // Mobile sidebar
  const menuBtn = document.getElementById('dash-menu-btn');
  const sidebar  = document.getElementById('dash-sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('is-open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && e.target !== menuBtn)
        sidebar.classList.remove('is-open');
    });
  }

  // Profile
  const { data: profile } = await nexaSupabase
    .from('profiles').select('*').eq('id', userId).single();

  if (profile) {
    const initials = profile.full_name
      ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : session.user.email[0].toUpperCase();
    const firstName = (profile.full_name || session.user.email).split(' ')[0];

    const nameEl    = document.getElementById('dash-client-name');
    const companyEl = document.getElementById('dash-client-company');
    const firstEl   = document.getElementById('dash-first-name');
    if (nameEl)    nameEl.textContent    = profile.full_name || session.user.email;
    if (companyEl) companyEl.textContent = profile.company   || 'NexaLab Client';
    if (firstEl)   firstEl.textContent   = firstName;
    document.querySelectorAll('.dash-avatar, .dash-avatar-sm')
      .forEach((el) => { el.textContent = initials; });
  }

  // Project
  const { data: project } = await nexaSupabase
    .from('projects').select('*').eq('client_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  // Support badge (background, non-blocking)
  if (project?.id) {
    nexaSupabase.from('tickets').select('id', { count: 'exact', head: true })
      .eq('project_id', project.id).neq('status', 'resolved')
      .then(({ count }) => {
        const b = document.getElementById('dash-support-badge');
        if (b) { b.textContent = count || 0; b.hidden = (count || 0) === 0; }
      });
  }

  return { userId, profile, project, session };
})();
