import type { Metadata } from 'next';
import '../portal.css';

export const metadata: Metadata = { title: 'Invoice — NexaLab' };

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
