// NexaLab — Admin Portal boot script
// 1. Immediately injects sidebar HTML (no flash)
// 2. Exposes window.adminBoot — async promise resolving to { userId, profile, session }
// Load order: supabase-config.js → portal-utils.js → admin-boot.js → page-specific.js

(function buildAdminSidebar() {
  const SVGs = {
    overview:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>',
    pending:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    inquiries:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="1.7"/><polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="1.7"/></svg>',
    clients:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    tickets:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const PAGES = [
    { href: 'admin.html',            key: 'overview',   label: 'Overview'   },
    { href: 'admin-pending.html',    key: 'pending',    label: 'Pending',   badge: 'adm-pending-badge' },
    { href: 'admin-inquiries.html',  key: 'inquiries',  label: 'Inquiries', badge: 'adm-inq-badge'     },
    { href: 'admin-clients.html',    key: 'clients',    label: 'Clients'    },
    { href: 'admin-tickets.html',    key: 'tickets',    label: 'Tickets',   badge: 'adm-ticket-badge'  },
  ];

  const currentFile = location.pathname.split('/').pop() || 'admin.html';

  const navHtml = PAGES.map((p) => {
    const active = p.href === currentFile ? ' is-active' : '';
    const badgeHtml = p.badge ? `<span class="dash-badge" id="${p.badge}" hidden></span>` : '';
    return `<a href="${p.href}" class="dash-nav-item${active}">${SVGs[p.key]} ${p.label}${badgeHtml}</a>`;
  }).join('');

  const sidebar = document.getElementById('dash-sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="dash-brand">
        <a href="index.html" class="brand">NexaLab</a>
        <span class="dash-portal-badge adm-portal-badge">Admin</span>
      </div>
      <div class="dash-client-card">
        <div class="dash-avatar" id="adm-avatar">NX</div>
        <div>
          <p class="dash-client-name" id="adm-name">Admin</p>
          <p class="dash-client-company" id="adm-email"></p>
        </div>
      </div>
      <nav class="dash-nav">${navHtml}</nav>
      <div class="dash-sidebar-footer">
        <a href="dashboard.html" class="dash-sidebar-link">Client portal</a>
        <a href="index.html" class="dash-sidebar-link">← Back to site</a>
        <button id="adm-logout" class="dash-sidebar-link dash-logout-btn">Sign out</button>
      </div>`;
  }
})();

// ── Shared async boot promise ──────────────────────────────
window.adminBoot = (async function () {
  const { data: { session } } = await nexaSupabase.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return null; }
  const userId = session.user.id;

  const { data: profile } = await nexaSupabase
    .from('profiles').select('*').eq('id', userId).single();

  if (!profile || profile.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return null;
  }

  // Identity
  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'NX';
  const avatarEl = document.getElementById('adm-avatar');
  const nameEl   = document.getElementById('adm-name');
  const emailEl  = document.getElementById('adm-email');
  const dateEl   = document.getElementById('adm-date');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = profile.full_name || 'Admin';
  if (emailEl)  emailEl.textContent  = profile.email || '';
  if (dateEl)   dateEl.textContent   = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  // Logout
  document.getElementById('adm-logout')?.addEventListener('click', async () => {
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

  // Background badge counts (runs on every admin page)
  (async function loadBadges() {
    const [pendRes, inqRes, tixRes] = await Promise.all([
      nexaSupabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      nexaSupabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      nexaSupabase.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
    ]);
    const pending = pendRes.count || 0;
    const newInq  = inqRes.count  || 0;
    const openTix = tixRes.count  || 0;

    const pb = document.getElementById('adm-pending-badge');
    const ib = document.getElementById('adm-inq-badge');
    const tb = document.getElementById('adm-ticket-badge');
    if (pb) { pb.textContent = pending; pb.hidden = pending === 0; }
    if (ib) { ib.textContent = newInq;  ib.hidden = newInq  === 0; }
    if (tb) { tb.textContent = openTix; tb.hidden = openTix === 0; }
  })();

  return { userId, profile, session };
})();
