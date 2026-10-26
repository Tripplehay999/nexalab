import type { Metadata } from 'next';
import { fontVars } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'NexaLab — We build and run online stores',
  description:
    'NexaLab is a commerce agency. We design, build, and run online stores for growing brands — storefront, checkout, inventory, shipping, growth, and support.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
