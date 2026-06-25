'use client';

import { useEffect, useRef } from 'react';

export default function RevealWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const targets = container.querySelectorAll<HTMLElement>(
      '.card, .stat-card, .faq-item, .tool-card, .highlight-card, .module-card, .pricing-card, .step, .testimonial-card',
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries, o) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            o.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    targets.forEach((el, i) => {
      el.classList.add('reveal');
      (el as HTMLElement).style.transitionDelay = `${Math.min(i * 40, 240)}ms`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
