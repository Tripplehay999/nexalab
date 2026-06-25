'use client';

import { useState } from 'react';

export default function Estimator() {
  const [traffic, setTraffic] = useState(20000);
  const [campaign, setCampaign] = useState(4);
  const [ecommerce, setEcommerce] = useState(false);

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

  return (
    <div className="tool-card" data-estimator>
      <p className="section-label">Interactive tool</p>
      <h2>Retainer estimator</h2>
      <p className="muted">Adjust inputs to get a recommendation based on your current operating pressure.</p>
      <div className="estimator-grid">
        <label className="form-field">
          Monthly traffic: <span>{traffic.toLocaleString()}</span>
          <input
            type="range"
            min={1000}
            max={120000}
            step={1000}
            value={traffic}
            onChange={(e) => setTraffic(Number(e.target.value))}
          />
        </label>
        <label className="form-field">
          Campaign intensity: <span>{campaign}</span>/10
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={campaign}
            onChange={(e) => setCampaign(Number(e.target.value))}
          />
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={ecommerce}
          onChange={(e) => setEcommerce(e.target.checked)}
        />
        We run active storefront operations (catalog, checkout, promos)
      </label>
      <div className="result-box" style={{ marginTop: '1rem' }}>
        <strong>Recommended:</strong> {plan}<br />
        <span className="muted">{note}</span>
      </div>
    </div>
  );
}
