// UI behavior for menu, year, accordions, tabs, calculators, and intake form.

const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('primary-nav');
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    })
  );
}

// FAQ toggles (buttons with data-faq-toggle)
document.querySelectorAll('[data-faq-toggle]').forEach((toggle) => {
  const panel = toggle.nextElementSibling;
  if (!panel) return;
  panel.style.maxHeight = '0px';
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.classList.toggle('is-open', !expanded);
    panel.style.maxHeight = expanded ? '0px' : `${panel.scrollHeight}px`;
  });
});

// Intersection reveal
(function revealObserver() {
  const targets = document.querySelectorAll('.card, .stat-card, .faq-item, .tool-card, .highlight-card, .terminal-mock, .module-card, .pricing-card, .step');
  if (!targets.length) return;
  const observer = new IntersectionObserver((entries, o) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        o.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(i * 40, 240)}ms`;
    observer.observe(el);
  });
})();

// Feature tabs
(function featureTabs() {
  const shell = document.querySelector('[data-feature-tabs]');
  if (!shell) return;
  const tabs = shell.querySelectorAll('[data-tab]');
  const panels = shell.querySelectorAll('[data-panel]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      const key = tab.dataset.tab;
      const panel = shell.querySelector(`[data-panel="${key}"]`);
      if (panel) panel.classList.add('is-active');
    });
  });
})();

// Pricing toggle
(function pricingToggle() {
  const shell = document.querySelector('[data-pricing]');
  if (!shell) return;
  const modeButtons = shell.querySelectorAll('[data-price-mode]');
  const priceEls = shell.querySelectorAll('.price');
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const mode = btn.dataset.priceMode;
      priceEls.forEach((price) => {
        price.textContent = mode === 'annual' ? price.dataset.annual : price.dataset.monthly;
      });
    });
  });
})();

// ROI calculator (MRR + uplift)
(function roiCalculator() {
  const mrrInput = document.getElementById('mrr-input');
  const upliftInput = document.getElementById('uplift-input');
  const upliftValue = document.getElementById('uplift-value');
  const roiResult = document.getElementById('roi-result');
  if (!mrrInput || !upliftInput || !upliftValue || !roiResult) return;
  const update = () => {
    const mrr = Number(mrrInput.value || 0);
    const uplift = Number(upliftInput.value || 0);
    const incremental = Math.round((mrr * uplift) / 100);
    upliftValue.textContent = `${uplift}%`;
    roiResult.textContent = `Projected incremental MRR: $${incremental.toLocaleString()}`;
  };
  mrrInput.addEventListener('input', update);
  upliftInput.addEventListener('input', update);
  update();
})();

// Estimator (traffic/campaign/ecom)
(function estimator() {
  const trafficInput = document.getElementById('traffic-volume');
  const campaignInput = document.getElementById('campaign-intensity');
  const ecommerceToggle = document.getElementById('ecommerce-toggle');
  const trafficValue = document.getElementById('traffic-value');
  const campaignValue = document.getElementById('campaign-value');
  const estimatorResult = document.getElementById('estimator-result');
  if (!trafficInput || !campaignInput || !trafficValue || !campaignValue || !estimatorResult) return;

  const update = () => {
    const traffic = Number(trafficInput.value);
    const campaign = Number(campaignInput.value);
    const ecommerce = ecommerceToggle ? ecommerceToggle.checked : false;

    trafficValue.textContent = traffic.toLocaleString();
    campaignValue.textContent = String(campaign);

    let score = 0;
    if (traffic >= 50000) score += 2;
    else if (traffic >= 15000) score += 1;
    if (campaign >= 7) score += 2;
    else if (campaign >= 4) score += 1;
    if (ecommerce) score += 2;

    let plan = 'Starter Retainer';
    let note = 'Best for maintenance, security, and steady support.';
    if (score >= 4) {
      plan = 'E-Commerce / Advanced Retainer';
      note = 'High-volume stores or complex storefronts requiring squad-level support.';
    } else if (score >= 2) {
      plan = 'Growth Retainer';
      note = 'Regular experiments and funnel optimization to support active demand.';
    }

    estimatorResult.innerHTML = `<strong>Recommended:</strong> ${plan}<br /><span class="muted">${note}</span>`;
  };

  ['input', 'change'].forEach((ev) => {
    trafficInput.addEventListener(ev, update);
    campaignInput.addEventListener(ev, update);
    if (ecommerceToggle) ecommerceToggle.addEventListener(ev, update);
  });
  update();
})();

// Fit checker buttons
(function fitChecker() {
  const buttons = document.querySelectorAll('.segment-btn[data-profile]');
  const result = document.getElementById('fit-result');
  if (!buttons.length || !result) return;
  const map = {
    startup: 'Launch: site + tracking, then Starter retainer as traffic grows.',
    outdated: 'Rebuild + analytics reset, followed by Growth retainer.',
    ecommerce: 'E-commerce retainer: storefront, checkout, and ops ownership.',
    service: 'Lead-gen focus: landing pages, tracking, and CRM handoff.'
  };
  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      result.textContent = map[b.dataset.profile] || 'Let’s map a custom plan.';
    });
  });
})();

// Animated stat counters
(function statCounters() {
  const stats = document.querySelectorAll('[data-count]');
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries, o) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
      const duration = 1600;
      let start = null;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = eased * target;
        const display = decimals ? value.toFixed(decimals) : Math.floor(value).toLocaleString();
        el.textContent = prefix + display + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          const final = decimals ? target.toFixed(decimals) : target.toLocaleString();
          el.textContent = prefix + final + suffix;
        }
      };

      requestAnimationFrame(step);
      o.unobserve(el);
    });
  }, { threshold: 0.5 });

  stats.forEach((el) => observer.observe(el));
})();

// Intake form: POST to backend API, fall back to mailto if API not yet configured
(function intakeFormHandler() {
  const form = document.getElementById('intake-form');
  const err = document.getElementById('intake-error');
  const submitBtn = document.getElementById('intake-submit');
  const submitLabel = document.getElementById('submit-label');
  const submitSpinner = document.getElementById('submit-spinner');
  const successPanel = document.getElementById('intake-success');
  const fieldsPanel = document.getElementById('intake-fields');
  if (!form) return;

  // Collect checked checkboxes for a named field
  function getCheckedValues(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (submitLabel) submitLabel.style.display = loading ? 'none' : '';
    if (submitSpinner) submitSpinner.hidden = !loading;
  }

  function showSuccess() {
    if (fieldsPanel) fieldsPanel.hidden = true;
    if (successPanel) successPanel.hidden = false;
  }

  function showError(msg) {
    if (err) err.textContent = msg;
    setLoading(false);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const fullName = (data.get('fullName') || '').toString().trim();
    const workEmail = (data.get('workEmail') || '').toString().trim();
    const company = (data.get('company') || '').toString().trim();
    const website = (data.get('website') || '').toString().trim();
    const platform = (data.get('platform') || '').toString().trim();
    const revenue = (data.get('revenue') || '').toString().trim();
    const budget = (data.get('budget') || '').toString().trim();
    const timeline = (data.get('timeline') || '').toString().trim();
    const services = getCheckedValues('services');
    const goal = (data.get('goal') || '').toString().trim();

    if (!fullName || !workEmail || !revenue || !budget || !goal) {
      showError('Please complete all required fields.');
      return;
    }
    if (err) err.textContent = '';
    setLoading(true);

    const payload = {
      fullName,
      workEmail,
      company: company || null,
      website: website || null,
      platform: platform || null,
      revenue,
      budget,
      timeline: timeline || null,
      services,
      goal,
    };

    // ── Call Supabase Edge Function ───────────────────────
    // Endpoint is automatically derived from your Supabase project URL.
    const API_ENDPOINT = typeof NEXALAB_SUPABASE_URL !== 'undefined'
      ? `${NEXALAB_SUPABASE_URL}/functions/v1/contact-submit`
      : '/api/contact'; // fallback if config not loaded

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (typeof NEXALAB_SUPABASE_KEY !== 'undefined') {
        headers['Authorization'] = `Bearer ${NEXALAB_SUPABASE_KEY}`;
        headers['apikey'] = NEXALAB_SUPABASE_KEY;
      }
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess();
        return;
      }
      // Non-2xx from server — fall through to mailto fallback
      console.warn('API returned', res.status, '— using mailto fallback');
    } catch {
      // Network error or API not yet deployed — fall through to mailto fallback
      console.warn('API not reachable — using mailto fallback');
    }

    // ── mailto fallback (until backend is live) ──────────
    const subject = encodeURIComponent(`NexaLab inquiry — ${fullName}`);
    const bodyLines = [
      `Name: ${fullName}`,
      `Email: ${workEmail}`,
      `Company: ${company || 'Not provided'}`,
      `Website: ${website || 'Not provided'}`,
      `Current platform: ${platform || 'Not specified'}`,
      `Monthly revenue: ${revenue}`,
      `Budget: ${budget}`,
      `Timeline: ${timeline || 'Not specified'}`,
      `Services: ${services.length ? services.join(', ') : 'Not specified'}`,
      '',
      'Primary goal:',
      goal,
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    window.location.href = `mailto:hello@nexalab.io?subject=${subject}&body=${body}`;
    setLoading(false);
  });
})();