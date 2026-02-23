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

// Intake form: save to Supabase, email admin, redirect to signup
(function intakeFormHandler() {
  const form = document.getElementById('intake-form');
  if (!form) return;

  const err           = document.getElementById('intake-error');
  const submitBtn     = document.getElementById('intake-submit');
  const submitLabel   = document.getElementById('submit-label');
  const submitSpinner = document.getElementById('submit-spinner');
  const successPanel  = document.getElementById('intake-success');
  const fieldsPanel   = document.getElementById('intake-fields');

  // ── Read ?plan= from URL and populate banner + hidden input ──────────────
  const urlPlan = new URLSearchParams(location.search).get('plan');
  if (urlPlan) {
    const planInput  = document.getElementById('intake-plan-input');
    const planBanner = document.getElementById('intake-plan-banner');
    const planLabel  = document.getElementById('intake-plan-label');
    if (planInput)  planInput.value    = urlPlan;
    if (planBanner) planBanner.hidden  = false;
    if (planLabel)  planLabel.textContent = `Selected plan: ${urlPlan}`;
  }

  // ── Pre-fill from logged-in session ──────────────────────────────────────
  (async () => {
    try {
      const { data: { session } } = await nexaSupabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await nexaSupabase
        .from('profiles').select('full_name, email, company').eq('id', session.user.id).single();
      const nameField    = document.getElementById('full-name');
      const emailField   = document.getElementById('work-email');
      const companyField = document.getElementById('company-name');
      if (nameField    && !nameField.value    && profile?.full_name) nameField.value    = profile.full_name;
      if (emailField   && !emailField.value   && (profile?.email || session.user.email)) emailField.value = profile?.email || session.user.email;
      if (companyField && !companyField.value && profile?.company)   companyField.value = profile.company;
    } catch (_) {}
  })();

  // Collect checked checkboxes
  function getCheckedValues(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (submitLabel)   submitLabel.style.display = loading ? 'none' : '';
    if (submitSpinner) submitSpinner.hidden = !loading;
  }

  function showError(msg) {
    if (err) err.textContent = msg;
    setLoading(false);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    const fullName  = (fd.get('fullName')  || '').toString().trim();
    const workEmail = (fd.get('workEmail') || '').toString().trim();
    const company   = (fd.get('company')   || '').toString().trim();
    const website   = (fd.get('website')   || '').toString().trim();
    const platform  = (fd.get('platform')  || '').toString().trim();
    const revenue   = (fd.get('revenue')   || '').toString().trim();
    const budget    = (fd.get('budget')    || '').toString().trim();
    const timeline  = (fd.get('timeline')  || '').toString().trim();
    const services  = getCheckedValues('services');
    const goal      = (fd.get('goal')      || '').toString().trim();
    const plan      = (fd.get('plan')      || '').toString().trim() || urlPlan || null;

    if (!fullName || !workEmail || !revenue || !budget || !goal) {
      showError('Please complete all required fields.');
      return;
    }
    if (err) err.textContent = '';
    setLoading(true);

    try {
      // ── 1. Save inquiry directly to Supabase ──────────────────────────────
      if (typeof nexaSupabase === 'undefined') {
        showError('Configuration error. Please email hello@nexalab.io');
        return;
      }

      // Generate UUID client-side — avoids needing a SELECT after insert (RLS blocks anon reads)
      const inquiryId = crypto.randomUUID();

      const insertPayload = {
        id:         inquiryId,
        full_name:  fullName,
        work_email: workEmail,
        company:    company   || null,
        website:    website   || null,
        platform:   platform  || null,
        revenue,
        budget,
        timeline:   timeline  || null,
        services,
        goal,
      };
      // Only include plan if set — avoids errors if migration 003 hasn't run yet
      if (plan) insertPayload.plan = plan;

      const { error: insertErr } = await nexaSupabase
        .from('inquiries')
        .insert(insertPayload);

      if (insertErr) {
        showError('Something went wrong. Please email hello@nexalab.io');
        console.error(insertErr);
        return;
      }

      // ── 2. Fire admin alert email (best-effort) ────────────────────────────
      try {
        await fetch(`${NEXALAB_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${NEXALAB_SUPABASE_KEY}`,
            'apikey':         NEXALAB_SUPABASE_KEY,
          },
          body: JSON.stringify({
            type: 'intake_admin_alert',
            data: { name: fullName, email: workEmail, company, plan, revenue, budget, timeline, services, goal },
          }),
        });
      } catch (_) { /* ignore — do not block user flow on email failure */ }

      // ── 3. Create pending project if user is already logged in ───────────────
      try {
        const { data: { session: userSession } } = await nexaSupabase.auth.getSession();
        if (userSession) {
          await nexaSupabase.from('projects').insert({
            client_id:   userSession.user.id,
            inquiry_id:  inquiryId,
            name:        plan ? `${plan} Project` : 'New Project',
            plan:        plan || null,
            status:      'pending',
            description: 'Awaiting review by the NexaLab team.',
          });
        }
      } catch (_) { /* non-blocking */ }

      // ── 4. Show success, then redirect to dashboard ───────────────────────
      if (fieldsPanel)  fieldsPanel.hidden  = true;
      if (successPanel) successPanel.hidden = false;

      localStorage.removeItem('nexalab_plan');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2200);

    } catch {
      showError('Could not reach our servers. Please email us directly at hello@nexalab.io');
    }
  });
})();