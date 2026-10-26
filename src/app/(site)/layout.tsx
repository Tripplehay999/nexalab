import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import SupportBubble from '@/components/site/SupportBubble';
import RevealObserver from '@/components/site/RevealObserver';
import { fontVars } from '../fonts';
import './site.css';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${fontVars}`}>
      <SiteHeader />
      {children}
      <SiteFooter />
      <SupportBubble />
      <RevealObserver />
    </div>
  );
}
