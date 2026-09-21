import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="nirphup home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6z" strokeLinejoin="round" />
          </svg>
        </span>
        nirphup
      </Link>

      <nav className="nav" aria-label="Primary">
        <Link href="/">Home</Link>
        <a href="#sales">Sales</a>
        <a href="#premium">Premium</a>
        <a href="#about">About Us</a>
      </nav>

      <button type="button" className="auth-btn">
        Login / Register
      </button>
    </header>
  );
}
