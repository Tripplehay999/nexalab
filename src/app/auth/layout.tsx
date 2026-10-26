import '../(site)/site.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="site">{children}</div>;
}
