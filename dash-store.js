// NexaLab — Client Portal: Store page

(async function storePage() {
  const boot = await window.clientBoot;
  if (!boot) return;
  const { project } = boot;

  if (!project || project.status === 'pending' || project.status === 'rejected') {
    window.location.href = 'dashboard.html';
    return;
  }

  const clientId = project.client_id || boot.userId;
  await loadStoreSection(clientId);
  subscribeStoreRealtime(clientId);
})();

// ── Load: Store data ──────────────────────────────────────

async function loadStoreSection(clientId) {
  const { data: integration } = await nexaSupabase
    .from('store_integrations')
    .select('id, platform, store_url, last_synced_at')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!integration) {
    document.getElementById('store-empty-state').hidden  = false;
    document.getElementById('store-metrics-wrap').hidden = true;
    return;
  }

  document.getElementById('store-empty-state').hidden  = true;
  document.getElementById('store-metrics-wrap').hidden = false;

  const platformLabel = { wordpress: 'WordPress', woocommerce: 'WooCommerce', shopify: 'Shopify', bigcommerce: 'BigCommerce' };

  // Connection status bar
  const bar = document.getElementById('store-summary-bar');
  if (bar) {
    const synced = integration.last_synced_at
      ? new Date(integration.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Never';
    bar.innerHTML = `
      <span class="store-platform-badge">${platformLabel[integration.platform] || integration.platform}</span>
      <a href="${escAttr(integration.store_url)}" target="_blank" rel="noopener" class="store-url-link">${escHtml(integration.store_url)}</a>
      <span class="store-sync-label">Last synced: ${synced}</span>`;
  }

  const statusColor = {
    completed: '#22d3a8', processing: '#9aa8ff', shipped: '#22d3a8',
    pending: '#fbbf24', refunded: '#ff7070', cancelled: '#ff7070', canceled: '#ff7070', failed: '#ff7070',
  };

  const [metricsRes, statusRes, feedRes] = await Promise.all([
    nexaSupabase.from('store_metrics').select('date, revenue, orders, customers, currency')
      .eq('client_id', clientId).order('date', { ascending: false }).limit(2),
    nexaSupabase.from('store_orders').select('status, amount, currency')
      .eq('client_id', clientId).order('ordered_at', { ascending: false }).limit(500),
    nexaSupabase.from('store_orders').select('customer_name, customer_email, amount, currency, status, ordered_at')
      .eq('client_id', clientId).order('ordered_at', { ascending: false }).limit(15),
  ]);

  const metrics    = metricsRes.data ?? [];
  const allOrders  = statusRes.data  ?? [];
  const feedOrders = feedRes.data    ?? [];

  const latest   = metrics[0];
  const currency = latest?.currency || allOrders[0]?.currency || feedOrders[0]?.currency || 'USD';
  const fmt      = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const fmtFull  = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const latestDateLabel = latest?.date
    ? new Date(latest.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'last sync';

  document.getElementById('store-today-revenue').textContent     = latest ? fmt(latest.revenue) : '—';
  document.getElementById('store-today-revenue-sub').textContent = latest ? `on ${latestDateLabel}` : 'Sync your store to see data';
  document.getElementById('store-today-orders').textContent      = latest ? latest.orders : '—';
  document.getElementById('store-today-orders-sub').textContent  = latest ? `on ${latestDateLabel}` : '';

  const statusCounts = {};
  for (const o of allOrders) {
    const s = (o.status || 'unknown').toLowerCase();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  document.getElementById('store-pending-orders').textContent    = statusCounts['pending']    || 0;
  document.getElementById('store-pending-sub').textContent       = 'awaiting payment';
  document.getElementById('store-processing-orders').textContent = statusCounts['processing'] || 0;
  document.getElementById('store-processing-sub').textContent    = 'being fulfilled';

  // Status breakdown bars
  const breakdownEl = document.getElementById('store-status-breakdown');
  if (breakdownEl) {
    const total = allOrders.length;
    const rows  = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => {
        const pct   = total ? Math.round((count / total) * 100) : 0;
        const color = statusColor[status] || 'var(--muted)';
        return `
          <div class="store-status-row">
            <span class="store-status-name" style="color:${color};">${status}</span>
            <div class="store-status-bar-wrap">
              <div class="store-status-bar" style="width:${pct}%;background:${color};"></div>
            </div>
            <span class="store-status-count">${count}</span>
          </div>`;
      }).join('');
    breakdownEl.innerHTML = rows || '<p class="adm-empty">No orders synced yet.</p>';
  }

  // Live order feed
  const ordersEl = document.getElementById('store-orders-list');
  if (!ordersEl) return;
  if (!feedOrders.length) {
    ordersEl.innerHTML = '<p class="adm-empty" style="padding:1rem 0;">No orders synced yet.</p>';
    return;
  }
  ordersEl.innerHTML = `
    <div class="store-orders-table">
      ${feedOrders.map((o) => {
        const when  = o.ordered_at ? new Date(o.ordered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
        const color = statusColor[o.status?.toLowerCase()] || 'var(--muted)';
        const amt   = fmtFull(o.amount || 0);
        return `
          <div class="store-order-row">
            <div class="store-order-customer">
              <span class="store-order-name">${escHtml(o.customer_name || 'Anonymous')}</span>
              <span class="store-order-email">${escHtml(o.customer_email || '')}</span>
            </div>
            <span class="store-order-amount">${amt}</span>
            <span class="store-order-status" style="color:${color};">${escHtml(o.status || '—')}</span>
            <span class="store-order-date">${when}</span>
          </div>`;
      }).join('')}
    </div>`;
}

// ── Realtime subscription ─────────────────────────────────

let _storeChannel = null;

function subscribeStoreRealtime(clientId) {
  if (_storeChannel) nexaSupabase.removeChannel(_storeChannel);
  _storeChannel = nexaSupabase
    .channel(`store-live-${clientId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_metrics', filter: `client_id=eq.${clientId}` }, () => {
      loadStoreSection(clientId);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_orders', filter: `client_id=eq.${clientId}` }, () => {
      loadStoreSection(clientId);
    })
    .subscribe();
}
