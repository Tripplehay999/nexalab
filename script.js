const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('primary-nav');
const year = document.getElementById('year');

if (year) {
  year.textContent = String(new Date().getFullYear());
}

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
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
  if (panel) {
    panel.style.maxHeight = '0px';
  }

  toggle.addEventListener('click', () => {
    if (!panel) return;

    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isExpanded));
    toggle.classList.toggle('is-open', !isExpanded);
    panel.style.maxHeight = isExpanded ? '0px' : `${panel.scrollHeight}px`;
  });
});

const revealTargets = document.querySelectorAll('.card, .stat-card, .faq-item, .tool-card, .cta-box, .highlight-card');
if (revealTargets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((target, index) => {
    target.classList.add('reveal');
    target.style.transitionDelay = `${Math.min(index * 40, 240)}ms`;
    observer.observe(target);
  });
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
    let note = 'Best when you need stability, maintenance, and reliable baseline improvements.';

    if (score >= 4) {
      plan = 'E-Commerce / Advanced Retainer';
      note = 'Best when your team is managing high volume, multiple campaigns, or complex storefront operations.';
    } else if (score >= 2) {
      plan = 'Growth Retainer';
      note = 'Best when your site and funnel need regular optimization to support active demand generation.';
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
  const profileMap = {
    startup: 'Recommended path: Brand + website build, then Starter Retainer to establish execution rhythm.',
    outdated: 'Recommended path: Site rebuild + analytics reset, followed by Growth Retainer for conversion gains.',
    ecommerce: 'Recommended path: Storefront optimization + Advanced Retainer with checkout and funnel iteration.',
    service: 'Recommended path: Lead generation pages + Growth Retainer with tracking and CRM integration.',
  };

  fitButtons.forEach((button) => {
    button.addEventListener('click', () => {
      fitButtons.forEach((b) => b.classList.remove('is-active'));
      button.classList.add('is-active');

      const key = button.dataset.profile;
      fitResult.textContent = profileMap[key] ?? 'Let’s discuss your case and map a custom path.';
    });
  });
}

const intakeForm = document.getElementById('intake-form');
const intakeError = document.getElementById('intake-error');

if (intakeForm && intakeError) {
  intakeForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(intakeForm);
    const fullName = String(formData.get('fullName') ?? '').trim();
    const workEmail = String(formData.get('workEmail') ?? '').trim();
    const company = String(formData.get('company') ?? '').trim();
    const budget = String(formData.get('budget') ?? '').trim();
    const goal = String(formData.get('goal') ?? '').trim();

    if (!fullName || !workEmail || !budget || !goal) {
      intakeError.textContent = 'Please complete all required fields before submitting.';
      return;
    }

    intakeError.textContent = '';

    const subject = encodeURIComponent(`NexaLab Inquiry - ${fullName}`);
    const body = encodeURIComponent(
      [
        `Name: ${fullName}`,
        `Email: ${workEmail}`,
        `Company: ${company || 'Not provided'}`,
        `Budget: ${budget}`,
        '',
        'Primary goal:',
        goal,
      ].join('\n')
    );

    window.location.href = `mailto:hello@nexalab.io?subject=${subject}&body=${body}`;
  });
}
