import Link from 'next/link';
import { CONTACT } from '@/lib/site-data';

export default function BigCta({
  title = 'Let’s build something people love buying from.',
  sub = 'Create your account in two minutes, tell us about your brand, and a real strategist will reach out within one business day.',
  primary = { href: '/auth?mode=signup', label: 'Start a project →' },
}: {
  title?: string;
  sub?: string;
  primary?: { href: string; label: string };
}) {
  return (
    <section className="sec sec-tight">
      <div className="wrap">
        <div className="big-cta rv">
          <h2>{title}</h2>
          <p>{sub}</p>
          <div className="btn-row">
            <Link href={primary.href} className="s-btn s-btn-ink s-btn-lg">{primary.label}</Link>
            <a href={`mailto:${CONTACT.email}`} className="s-btn s-btn-line s-btn-lg">{CONTACT.email}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
