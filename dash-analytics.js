// NexaLab — Client Portal: Analytics page

(async function analyticsPage() {
  const boot = await window.clientBoot;
  if (!boot) return;
  const { project } = boot;

  if (!project || project.status === 'pending' || project.status === 'rejected') {
    window.location.href = 'dashboard.html';
    return;
  }

  const milestoneIds = (await nexaSupabase.from('milestones').select('id').eq('project_id', project.id)).data?.map((m) => m.id) ?? [];

  const [milestonesRes, deliverablesRes] = await Promise.all([
    nexaSupabase.from('milestones').select('*').eq('project_id', project.id).order('sort_order'),
    nexaSupabase.from('deliverables').select('*').eq('project_id', project.id),
  ]);

  const milestones   = milestonesRes.data   ?? [];
  const deliverables = deliverablesRes.data ?? [];

  renderAnalytics(project, milestones, deliverables);
  await loadAnalyticsStore(project.client_id || boot.userId);
})();

// ── Render: Project progress stats ───────────────────────

function renderAnalytics(project, milestones, deliverables) {
  const wrap = document.getElementById('analytics-stats-wrap');
  const note = document.getElementById('analytics-note');

  const complete    = milestones.filter((m) => m.status === 'complete').length;
  const total       = milestones.length;
  const dlvReady    = deliverables.filter((d) => d.status === 'ready').length;
  const dlvTotal    = deliverables.length;
  const pct         = total ? Math.round((complete / total) * 100) : 0;
  const startDate   = project.started_at ? new Date(project.started_at) : null;
  const daysActive  = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86400000) : '—';

  if (wrap) {
    wrap.innerHTML = `
      <div class="dash-stats">
        <div class="dash-stat-card">
          <p class="dash-stat-label">Overall progress</p>
          <p class="dash-stat-val">${pct}<span class="dash-stat-of">%</span></p>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="dash-stat-card">
          <p class="dash-stat-label">Milestones done</p>
          <p class="dash-stat-val">${complete} <span class="dash-stat-of">/ ${total}</span></p>
          <p class="dash-stat-sub ${complete === total && total > 0 ? 'dash-stat-green' : ''}">
            ${complete === total && total > 0 ? 'All complete' : `${total - complete} remaining`}
          </p>
        </div>
        <div class="dash-stat-card">
          <p class="dash-stat-label">Deliverables ready</p>
          <p class="dash-stat-val">${dlvReady} <span class="dash-stat-of">/ ${dlvTotal}</span></p>
          <div class="progress-bar"><div class="progress-fill" style="width:${dlvTotal ? Math.round((dlvReady / dlvTotal) * 100) : 0}%"></div></div>
        </div>
        <div class="dash-stat-card">
          <p class="dash-stat-label">Days active</p>
          <p class="dash-stat-val">${daysActive}</p>
          <p class="dash-stat-sub">${startDate ? 'since ' + startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start date TBD'}</p>
        </div>
      </div>`;
  }

  if (note) {
    note.textContent = project.status === 'complete'
      ? `Project "${project.name}" is complete. Store analytics will appear here once your store is connected.`
      : 'Store analytics (revenue, orders, customers) will appear here once your store is connected by the NexaLab team.';
  }
}

// ── Load: Store analytics ────────────────────────────────

async function loadAnalyticsStore(clientId) {
  const { data: integration } = await nexaSupabase
    .from('store_integrations')
    .select('id, platform')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!integration) return;

  document.getElementById('analytics-store-wrap').hidden = false;
  document.getElementById('analytics-no-store').hidden   = true;

  const platformLabel = { wordpress: 'WordPress', woocommerce: 'WooCommerce', shopify: 'Shopify', bigcommerce: 'BigCommerce' };
  const badge = document.getElementById('analytics-platform-badge');
  if (badge) badge.textContent = platformLabel[integration.platform] || integration.platform;

  // Date boundaries
  const now    = new Date();
  const d30    = new Date(); d30.setDate(now.getDate() - 30);
  const d60    = new Date(); d60.setDate(now.getDate() - 60);
  const d30str = d30.toISOString().split('T')[0];
  const d60str = d60.toISOString().split('T')[0];

  // Period label
  const periodEl = document.getElementById('analytics-period-label');
  if (periodEl) {
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    periodEl.textContent = `${fmt(d30)} – ${fmt(now)} vs prior 30 days`;
  }

  const [currRes, prevRes, ordersRes] = await Promise.all([
    nexaSupabase.from('store_metrics').select('*')
      .eq('client_id', clientId).gte('date', d30str).order('date', { ascending: true }),
    nexaSupabase.from('store_metrics').select('revenue, orders, customers')
      .eq('client_id', clientId).gte('date', d60str).lt('date', d30str),
    nexaSupabase.from('store_orders').select('customer_name, customer_email, amount, currency')
      .eq('client_id', clientId)
      .not('status', 'in', '(refunded,cancelled,canceled,failed)'),
  ]);

  const curr   = currRes.data   ?? [];
  const prev   = prevRes.data   ?? [];
  const orders = ordersRes.data ?? [];

  const sum      = (arr, f) => arr.reduce((s, m) => s + (m[f] || 0), 0);
  const currency = curr[0]?.currency || 'USD';
  const fmt      = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const fmtFull  = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const cRev = sum(curr, 'revenue');
  const cOrd = sum(curr, 'orders');
  const cCus = sum(curr, 'customers');
  const cAov = cOrd > 0 ? cRev / cOrd : 0;
  const pRev = sum(prev, 'revenue');
  const pOrd = sum(prev, 'orders');
  const pCus = sum(prev, 'customers');
  const pAov = pOrd > 0 ? pRev / pOrd : 0;

  // Hero summary
  const heroEl = document.getElementById('analytics-hero');
  const heroRev = document.getElementById('analytics-hero-revenue');
  const heroPeriod = document.getElementById('analytics-hero-period');
  if (heroEl)   heroEl.hidden = false;
  if (heroRev)  heroRev.textContent = fmt(cRev);
  if (heroPeriod) {
    const fmtShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    heroPeriod.textContent = `${fmtShort(d30)} – ${fmtShort(now)}`;
  }

  function trendBadge(cur, prv) {
    if (!prv) return '<span style="color:var(--muted);font-size:0.72rem;">No prev data</span>';
    const pct = ((cur - prv) / prv * 100).toFixed(1);
    return Number(pct) >= 0
      ? `<span style="color:#22d3a8;font-size:0.72rem;">↑ ${pct}% vs prev 30d</span>`
      : `<span style="color:#ff7070;font-size:0.72rem;">↓ ${Math.abs(Number(pct))}% vs prev 30d</span>`;
  }

  // KPI grid
  const kpiEl = document.getElementById('analytics-kpi-grid');
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="dash-stat-card">
        <p class="dash-stat-label">Revenue</p>
        <p class="dash-stat-val">${fmt(cRev)}</p>
        <p class="dash-stat-sub">${trendBadge(cRev, pRev)}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Orders</p>
        <p class="dash-stat-val">${cOrd.toLocaleString()}</p>
        <p class="dash-stat-sub">${trendBadge(cOrd, pOrd)}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Avg Order Value</p>
        <p class="dash-stat-val">${fmt(cAov)}</p>
        <p class="dash-stat-sub">${trendBadge(cAov, pAov)}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">New Customers</p>
        <p class="dash-stat-val">${cCus.toLocaleString()}</p>
        <p class="dash-stat-sub">${trendBadge(cCus, pCus)}</p>
      </div>`;
  }

  // 30-day bar chart
  const dayMap = {};
  curr.forEach((m) => { dayMap[m.date] = m; });
  const maxRev = Math.max(...curr.map((m) => m.revenue || 0), 1);
  const bars = [], labels = [];
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const m   = dayMap[key];
    const pct = m ? Math.max(Math.round((m.revenue / maxRev) * 100), 2) : 0;
    const lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    bars.push(`<div class="analytics-bar${pct === 0 ? ' analytics-bar--empty' : ''}" style="height:${pct}%" title="${lbl}: ${m ? fmtFull(m.revenue) : '$0'}"></div>`);
    labels.push(i % 7 === 0
      ? `<span>${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`
      : '<span></span>');
  }
  const chartEl = document.getElementById('analytics-chart');
  const labelEl = document.getElementById('analytics-chart-labels');
  if (chartEl) chartEl.innerHTML = bars.join('');
  if (labelEl) labelEl.innerHTML = labels.join('');

  // Highlights
  const bestDay = curr.reduce((best, m) => (!best || m.revenue > best.revenue) ? m : best, null);
  const hlEl    = document.getElementById('analytics-highlights');
  if (hlEl) {
    if (!bestDay) {
      hlEl.innerHTML = '<p class="adm-empty">No data yet.</p>';
    } else {
      const bestDate = new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      hlEl.innerHTML = `
        <div class="analytics-hl-row">
          <p class="analytics-hl-label">Best day revenue</p>
          <div><p class="analytics-hl-val">${fmt(bestDay.revenue)}</p><p class="analytics-hl-sub">${bestDate}</p></div>
        </div>
        <div class="analytics-hl-row">
          <p class="analytics-hl-label">Best day orders</p>
          <div><p class="analytics-hl-val">${bestDay.orders}</p><p class="analytics-hl-sub">${bestDate}</p></div>
        </div>
        <div class="analytics-hl-row">
          <p class="analytics-hl-label">Daily avg revenue</p>
          <div><p class="analytics-hl-val">${fmt(cRev / 30)}</p><p class="analytics-hl-sub">over last 30 days</p></div>
        </div>`;
    }
  }

  // Top customers
  const spend = {};
  for (const o of orders) {
    const key = o.customer_email || o.customer_name;
    if (!key) continue;
    if (!spend[key]) spend[key] = { name: o.customer_name || o.customer_email, total: 0, count: 0 };
    spend[key].total += o.amount || 0;
    spend[key].count += 1;
  }
  const top  = Object.values(spend).sort((a, b) => b.total - a.total).slice(0, 5);
  const tcEl = document.getElementById('analytics-top-customers');
  if (tcEl) {
    tcEl.innerHTML = top.length
      ? top.map((c) => `
          <div class="analytics-customer-row">
            <div>
              <p class="analytics-customer-name">${escHtml(c.name)}</p>
              <p class="analytics-customer-meta">${c.count} order${c.count !== 1 ? 's' : ''}</p>
            </div>
            <p class="analytics-customer-total">${fmtFull(c.total)}</p>
          </div>`).join('')
      : '<p class="adm-empty">No customer data yet.</p>';
  }
}
