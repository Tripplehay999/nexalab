'use client';

import { useState } from 'react';

const profiles: Record<string, string> = {
  startup: 'Launch: site + tracking, then Starter retainer as traffic grows.',
  outdated: 'Rebuild + analytics reset, followed by Growth retainer.',
  ecommerce: 'E-commerce retainer: storefront, checkout, and ops ownership.',
  service: 'Lead-gen focus: landing pages, tracking, and CRM handoff.',
};

export default function FitChecker() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="tool-card" data-fit-checker>
      <p className="section-label">Interactive tool</p>
      <h2>Fit checker</h2>
      <p className="muted">Choose the profile closest to your current situation.</p>
      <div className="segment-row" role="group" aria-label="Business profile selector">
        {Object.keys(profiles).map((key) => (
          <button
            key={key}
            type="button"
            className={`segment-btn${active === key ? ' is-active' : ''}`}
            data-profile={key}
            onClick={() => setActive(key)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1).replace('outdated', 'Outdated site').replace('ecommerce', 'E-commerce').replace('service', 'Service business')}
          </button>
        ))}
      </div>
      <div className="result-box" aria-live="polite">
        {active ? profiles[active] : 'Select a profile to see the recommended engagement path.'}
      </div>
    </div>
  );
}
