'use client';

import { useEffect, useRef, useState } from 'react';

interface StatItem {
  count: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}

function Counter({ count, prefix = '', suffix = '', decimals = 0 }: Omit<StatItem, 'label'>) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || animated.current) return;
        animated.current = true;
        const duration = 1600;
        let start: number | null = null;
        const step = (ts: number) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(eased * count);
          if (progress < 1) requestAnimationFrame(step);
          else setValue(count);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  const display = decimals
    ? value.toFixed(decimals)
    : Math.floor(value).toLocaleString();

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}

export default function StatCounter({ items }: { items: StatItem[] }) {
  return (
    <div className="stats-section">
      <div className="container">
        <div className="stats-grid">
          {items.map((item, i) => (
            <div className="stat-item" key={i}>
              <span className="stat-val">
                <Counter
                  count={item.count}
                  prefix={item.prefix}
                  suffix={item.suffix}
                  decimals={item.decimals}
                />
              </span>
              <span className="stat-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
