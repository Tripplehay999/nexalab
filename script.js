const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('primary-nav');
const year = document.getElementById('year');

if (year) year.textContent = String(new Date().getFullYear());

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const faqToggles = document.querySelectorAll('[data-faq-toggle]');
faqToggles.forEach((toggle) => {
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

const revealTargets = document.querySelectorAll('.card, .stat-card, .faq-item, .tool-card, .highlight-card, .terminal-mock');
if (revealTargets.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(i * 38, 240)}ms`;
    io.observe(el);
  });
}

const featureShell = document.querySelector('[data-feature-tabs]');
if (featureShell) {
  const tabs = featureShell.querySelectorAll('[data-tab]');
  const panels = featureShell.querySelectorAll('[data-panel]');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => p.classList.remove('is-active'));

      tab.classList.add('is-active');
      const key = tab.dataset.tab;
      const panel = featureShell.querySelector(`[data-panel="${key}"]`);
      if (panel) panel.classList.add('is-active');
    });
  });
}

const pricingShell = document.querySelector('[data-pricing]');
if (pricingShell) {
  const modeButtons = pricingShell.querySelectorAll('[data-price-mode]');
  const priceEls = pricingShell.querySelectorAll('.price');

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      modeButtons.forEach((b) => b.classList.remove('is-active'));
      button.classList.add('is-active');
      const mode = button.dataset.priceMode;

      priceEls.forEach((price) => {
        price.textContent = mode === 'annual' ? price.dataset.annual : price.dataset.monthly;
      });
    });
  });
}

const mrrInput = document.getElementById('mrr-input');
const upliftInput = document.getElementById('uplift-input');
const upliftValue = document.getElementById('uplift-value');
const roiResult = document.getElementById('roi-result');

if (mrrInput && upliftInput && upliftValue && roiResult) {
  const updateRoi = () => {
    const mrr = Number(mrrInput.value || 0);
    const uplift = Number(upliftInput.value || 0);
    const incremental = Math.round((mrr * uplift) / 100);

    upliftValue.textContent = `${uplift}%`;
    roiResult.textContent = `Projected incremental MRR: $${incremental.toLocaleString()}`;
  };

  mrrInput.addEventListener('input', updateRoi);
  upliftInput.addEventListener('input', updateRoi);
  updateRoi();
}

const trafficInput = document.getElementById('traffic-volume');
const campaignInput = document.getElementById('campaign-intensity');
const ecommerceToggle = document.getElementById('ecommerce-toggle');
const trafficValue = document.getElementById('traffic-value');
const campaignValue = document.getElementById('campaign-value');
const estimatorResult = document.getElementById('estimator-result');

if (trafficInput && campaignInput && ecommerceToggle && trafficValue && campaignValue && estimatorResult) {
  const updateEstimator = () => {
    const traffic = Number(trafficInput.value);
    const campaign = Number(campaignInput.value);
    const ecommerce = ecommerceToggle.checked;

    trafficValue.textContent = traffic.toLocaleString();
    campaignValue.textContent = String(campaign);

    let score = 0;
    if (traffic >= 50000) score += 2;
    else if (traffic >= 15000) score += 1;
    if (campaign >= 7) score += 2;
    else if (campaign >= 4) score += 1;
    if (ecommerce) score += 2;

    let plan = 'Starter Retainer';
    let note = 'Best if you need reliability, maintenance, and structured monthly updates.';

    if (score >= 4) {
      plan = 'E-commerce Retainer';
      note = 'Best if you operate high-velocity campaigns, product updates, and checkout optimization.';
    } else if (score >= 2) {
      plan = 'Growth Retainer';
      note = 'Best if you need ongoing landing page, funnel, and conversion improvements.';
    }

    estimatorResult.innerHTML = `<strong>Recommended:</strong> ${plan}<br /><span class="muted">${note}</span>`;
  };

  ['input', 'change'].forEach((eventName) => {
    trafficInput.addEventListener(eventName, updateEstimator);
    campaignInput.addEventListener(eventName, updateEstimator);
    ecommerceToggle.addEventListener(eventName, updateEstimator);
  });

  updateEstimator();
}

const fitButtons = document.querySelectorAll('.segment-btn[data-profile]');
const fitResult = document.getElementById('fit-result');
if (fitButtons.length && fitResult) {
  const profiles = {
    startup: 'Recommended path: Website Rebuild first, then Starter/Growth Retainer once traffic starts compounding.',
    outdated: 'Recommended path: Rebuild with conversion and tracking reset, then Growth Retainer for ongoing wins.',
    ecommerce: 'Recommended path: E-commerce Retainer with storefront, checkout, and campaign-page ownership.',
    service: 'Recommended path: Growth Retainer focused on lead quality, page clarity, and CRM handoff points.',
  };

  fitButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      fitButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      fitResult.textContent = profiles[btn.dataset.profile] ?? 'Let’s map a custom plan for your setup.';
    });
  });
}

const intakeForm = document.getElementById('intake-form');
const intakeError = document.getElementById('intake-error');
if (intakeForm && intakeError) {
  intakeForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(intakeForm);
    const fullName = String(data.get('fullName') ?? '').trim();
    const workEmail = String(data.get('workEmail') ?? '').trim();
    const company = String(data.get('company') ?? '').trim();
    const budget = String(data.get('budget') ?? '').trim();
    const goal = String(data.get('goal') ?? '').trim();

    if (!fullName || !workEmail || !budget || !goal) {
      intakeError.textContent = 'Please complete all required fields before submitting.';
      return;
    }

    intakeError.textContent = '';
    const subject = encodeURIComponent(`NexaLab inquiry — ${fullName}`);
    const body = encodeURIComponent([
      `Name: ${fullName}`,
      `Email: ${workEmail}`,
      `Company: ${company || 'Not provided'}`,
      `Budget: ${budget}`,
      '',
      'Primary goal:',
      goal,
    ].join('\n'));

    window.location.href = `mailto:hello@nexalab.io?subject=${subject}&body=${body}`;
  });
}
