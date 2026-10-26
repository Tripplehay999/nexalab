import type { Metadata } from 'next';
import '../(site)/site.css';

export const metadata: Metadata = { title: 'Welcome to NexaLab — Onboarding' };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="site">{children}</div>;
}
