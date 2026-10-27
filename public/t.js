/*! NexaLab site tracker — privacy-friendly, no cookies. https://nexalab.studio
 *  <script defer src="https://nexalab.studio/t.js" data-site="nxs_…"></script>
 *  Purchases: nexalab('order', { id: '1001', value: 129.5, currency: 'USD' })
 */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var key = s.getAttribute('data-site');
  if (!key) return;
  var api = (s.getAttribute('data-api') || new URL(s.src).origin) + '/api/t';

  function send(t, extra) {
    var payload = { k: key, t: t, u: location.href, r: document.referrer || '' };
    for (var x in extra || {}) payload[x] = extra[x];
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(api, body)) return;
    } catch { /* fall through */ }
    try { fetch(api, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }); } catch { /* ignore */ }
  }

  var last = '';
  function pageview() {
    if (location.href === last) return;
    last = location.href;
    send('pageview');
  }

  // Single-page apps: count client-side navigations too.
  var push = history.pushState;
  history.pushState = function () { push.apply(this, arguments); setTimeout(pageview, 0); };
  window.addEventListener('popstate', pageview);

  var api_ = function (event, data) {
    data = data || {};
    if (event === 'order') send('order', { v: Number(data.value) || 0, c: data.currency || '', o: data.id != null ? String(data.id) : '' });
  };
  var queued = window.nexalab && window.nexalab.q;
  window.nexalab = api_;
  if (queued) for (var i = 0; i < queued.length; i++) api_.apply(null, queued[i]);

  if (document.visibilityState === 'prerender') document.addEventListener('visibilitychange', pageview, { once: true });
  else pageview();
})();
