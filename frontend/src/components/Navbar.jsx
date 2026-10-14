import { useState } from 'react'

// `section` scrolls to a homepage section; `soon` marks features that don't exist yet.
const LINKS = [
  { label: 'Home', section: 'top' },
  { label: 'Stores', section: 'stores' },
  { label: 'Sales', soon: true },
  { label: 'Premium', soon: true },
  { label: 'About Us', section: 'about' },
]

export default function Navbar({ brand, onSection, onSoon, theme, onToggleTheme }) {
  const [open, setOpen] = useState(false)

  function go(e, link) {
    e.preventDefault()
    setOpen(false)
    if (link.soon) onSoon(link.label)
    else onSection(link.section)
  }

  return (
    <header className="navbar">
      <nav className="nav-inner" aria-label="Main">
        <a href="#top" className="brand" onClick={(e) => go(e, LINKS[0])}>
          <span className="logo" aria-hidden="true">
            {brand[0]}
          </span>
          {brand}
        </a>

        <ul id="nav-menu" className={`nav-links ${open ? 'open' : ''}`}>
          {LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.section ? `#${link.section}` : '#'} onClick={(e) => go(e, link)}>
                {link.label}
                {link.soon && <span className="soon">Soon</span>}
              </a>
            </li>
          ))}
          <li className="nav-login-mobile">
            <button type="button" className="btn btn-primary" onClick={(e) => go(e, { label: 'Login / Register', soon: true })}>
              Login / Register
            </button>
          </li>
        </ul>

        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            className="btn btn-primary nav-login"
            onClick={(e) => go(e, { label: 'Login / Register', soon: true })}
          >
            Login / Register
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>
    </header>
  )
}
