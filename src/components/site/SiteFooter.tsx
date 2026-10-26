import Link from 'next/link';
import { CONTACT, SUPPORT_HOURS } from '@/lib/site-data';
import { LiveClock, LiveStatus } from './live';

const COLUMNS = [
  { title: 'What we do', links: [['Store design & build', '/services#design-build'], ['Operations', '/services#operations'], ['Growth', '/services#growth'], ['Ongoing support', '/services#support'], ['Pricing', '/services#pricing']] },
  { title: 'Company', links: [['About us', '/about'], ['Our work', '/work'], ['Careers', '/careers'], ['Contact', '/contact']] },
  { title: 'Help', links: [['Customer support', '/support'], ['Client login', '/auth'], ['Open a ticket', '/dashboard/support'], ['Email support', `mailto:${CONTACT.support}`]] },
];

export default function SiteFooter() {
  return (
    <footer className="s-footer">
      <div className="wrap">
        <div className="s-footer-top">
          <div className="s-footer-intro">
            <p className="s-footer-pitch">We build and run online stores for brands that are ready to grow.</p>
            <LiveStatus className="on-dark" />
            <p className="s-footer-hours">{SUPPORT_HOURS.label}</p>
            <p className="s-footer-clock">It’s <LiveClock timeZone="America/New_York" /> at our Brooklyn studio.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="s-footer-col">
              <p className="s-footer-title">{col.title}</p>
              <ul>
                {col.links.map(([label, href]) => (
                  <li key={label}>{href.startsWith('mailto:') ? <a href={href}>{label}</a> : <Link href={href}>{label}</Link>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="s-footer-word" aria-hidden="true">NexaLab</p>
        <div className="s-footer-bottom">
          <span>© {new Date().getFullYear()} NexaLab Studio, Inc.</span>
          <span><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a href={CONTACT.phoneHref}>{CONTACT.phone}</a></span>
        </div>
      </div>
    </footer>
  );
}
