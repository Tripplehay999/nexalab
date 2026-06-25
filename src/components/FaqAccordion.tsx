'use client';

import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="faq-list" style={{ marginTop: '2rem' }}>
      {items.map((item, i) => (
        <div className="faq-item" key={i}>
          <button
            className={`faq-toggle${open === i ? ' is-open' : ''}`}
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.question}
          </button>
          <div
            className="faq-panel"
            style={{ maxHeight: open === i ? '400px' : '0px' }}
          >
            <p>{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
