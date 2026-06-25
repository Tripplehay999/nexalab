import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-wrap">
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          © {new Date().getFullYear()} NexaLab. Systems that compound.
        </p>
        <nav className="footer-links">
          <Link href="/#features">Platform</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
          <a href="mailto:hello@nexalab.io">hello@nexalab.io</a>
        </nav>
      </div>
    </footer>
  );
}
