'use client';

import { useState } from 'react';

export default function RoiCalculator() {
  const [mrr, setMrr] = useState(50000);
  const [uplift, setUplift] = useState(15);
  const incremental = Math.round((mrr * uplift) / 100);

  return (
    <div className="tool-card" style={{ marginTop: '2rem' }}>
      <p className="section-label">ROI Calculator</p>
      <h2>Estimate your upside.</h2>
      <p className="subtitle" style={{ marginTop: '0.25rem' }}>
        Plug in your current MRR and expected uplift to see projected incremental revenue.
      </p>
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', maxWidth: '480px' }}>
        <label className="form-field">
          Current MRR ($)
          <input
            type="number"
            value={mrr}
            min={0}
            step={1000}
            onChange={(e) => setMrr(Number(e.target.value))}
            style={{ marginTop: '0.4rem' }}
          />
        </label>
        <label className="form-field">
          Expected uplift: <strong>{uplift}%</strong>
          <input
            id="uplift-input"
            type="range"
            min={1}
            max={50}
            step={1}
            value={uplift}
            onChange={(e) => setUplift(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="result-box" style={{ marginTop: '1.5rem' }}>
        <strong>Projected incremental MRR: ${incremental.toLocaleString()}</strong>
      </div>
    </div>
  );
}
