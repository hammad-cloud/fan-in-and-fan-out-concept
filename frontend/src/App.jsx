import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import Navbar from './components/Navbar'
import SearchBar from './components/SearchBar'
import StoreDirectory from './components/StoreDirectory'
import PriceSummary from './components/PriceSummary'
import ProductCard from './components/ProductCard'
import { pctOff } from './format'
import './App.css'

const BRAND = 'SastaScan'

const CATEGORIES = [
  { icon: '🧴', label: 'Deodorant', q: 'deodorant' },
  { icon: '🧼', label: 'Shampoo', q: 'shampoo' },
  { icon: '🍚', label: 'Basmati rice', q: 'basmati rice' },
  { icon: '🫒', label: 'Cooking oil', q: 'cooking oil' },
  { icon: '☕', label: 'Coffee', q: 'nescafe' },
  { icon: '🫖', label: 'Tea', q: 'tea' },
  { icon: '🧽', label: 'Detergent', q: 'detergent' },
  { icon: '✨', label: 'Face wash', q: 'face wash' },
  { icon: '☀️', label: 'Sunblock', q: 'sunblock' },
  { icon: '💊', label: 'Medicine', q: 'panadol' },
  { icon: '📱', label: 'Mobile phones', q: 'mobile' },
  { icon: '🎧', label: 'Earbuds', q: 'earbuds' },
  { icon: '⌚', label: 'Smart watches', q: 'smart watch' },
  { icon: '👗', label: 'Lawn suits', q: 'lawn' },
  { icon: '🌸', label: 'Perfume', q: 'perfume' },
  { icon: '👟', label: 'Shoes', q: 'shoes' },
]

const POPULAR = ['deodorant', 'earbuds', 'lawn suit', 'shoes', 'perfume']

const SORTS = {
  relevance: (a, b) => a.accessory - b.accessory || a.price - b.price, // products before accessories
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  discount: (a, b) => pctOff(b) - pctOff(a) || a.price - b.price,
}

function App() {
  const [stores, setStores] = useState([])
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hidden, setHidden] = useState([]) // store ids switched off in the filter
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState('relevance')

  // Light by default; dark only if the user picked it. Storage can throw (private mode), so guard it.
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // not persisted; theme still applies for this visit
    }
  }, [theme])

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then(setStores)
      .catch(() => setError('Backend is not reachable. Start it with "npm run dev" in the project root.'))
  }, [])

  async function search(term) {
    const q = term.trim()
    if (q.length < 2) return
    setInput(q)
    setLoading(true)
    setError('')
    setNotice('')
    setData(null)
    setHidden([])
    window.scrollTo({ top: 0 })
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setData(body)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Nav links point at homepage sections; leave the results view first so the section exists.
  function goToSection(id) {
    flushSync(() => {
      setData(null)
      setError('')
      if (id === 'top') setInput('')
    })
    if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' })
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const results = useMemo(() => {
    if (!data) return []
    return data.results
      .filter((r) => !hidden.includes(r.store) && (!inStockOnly || r.available !== false))
      .sort(SORTS[sort])
  }, [data, hidden, inStockOnly, sort])

  // Cheapest offer per store, for the comparison table. Out-of-stock offers can't be bought, so skip them.
  const bestPerStore = useMemo(() => {
    const best = {}
    for (const r of data?.results ?? [])
      if (r.available !== false && (!best[r.store] || SORTS.relevance(r, best[r.store]) < 0)) best[r.store] = r
    return Object.values(best).sort(SORTS.relevance)
  }, [data])

  const home = !data && !loading
  const inStock = results.filter((r) => r.available !== false)
  const products = inStock.filter((r) => !r.accessory)
  const buyable = products.length ? products : inStock // a cable isn't the "lowest price" for an iPhone
  const lowest = buyable.length ? Math.min(...buyable.map((r) => r.price)) : null
  const sequentialMs = data?.sources.reduce((s, x) => s + (x.ms ?? 0), 0) ?? 0
  const failed = data?.sources.filter((s) => !s.ok) ?? []
  const withResults = data?.sources.filter((s) => s.ok && s.count) ?? []
  const toggleStore = (id) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))

  const searchBar = (compact) => (
    <SearchBar value={input} onChange={setInput} onSearch={search} loading={loading} compact={compact} />
  )

  return (
    <div className="page" id="top">
      <Navbar
        brand={BRAND}
        onSection={goToSection}
        onSoon={(feature) => setNotice(`${feature} is coming soon.`)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setNotice('')}>
            ✕
          </button>
        </div>
      )}

      {home ? (
        <section className="hero">
          <div className="hero-inner">
            <p className="eyebrow">🇵🇰 Price comparison for Pakistan</p>
            <h1>Find the Best Price, Every Time.</h1>
            <p className="hero-sub">
              Compare live prices and availability across {stores.length || 'top'} Pakistani online stores in one
              search, and buy from the store that costs you least.
            </p>
            {searchBar(false)}
            <div className="popular">
              <span>Popular:</span>
              {POPULAR.map((q) => (
                <button key={q} type="button" className="chip chip-link" onClick={() => search(q)}>
                  {q}
                </button>
              ))}
            </div>
            <ul className="trust">
              <li>
                <strong>{stores.length || '—'}</strong> stores compared
              </li>
              <li>
                <strong>Live</strong> prices on every search
              </li>
              <li>
                <strong>Free</strong> to use
              </li>
            </ul>
          </div>
        </section>
      ) : (
        <section className="results-head">
          <div className="container">{searchBar(true)}</div>
        </section>
      )}

      <main className="container">
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {home && (
          <>
            <section className="section">
              <div className="section-head">
                <h2>Shop by category</h2>
                <p>Popular products, compared across every store.</p>
              </div>
              <div className="categories">
                {CATEGORIES.map((c) => (
                  <button key={c.q} type="button" className="category" onClick={() => search(c.q)}>
                    <span className="cat-icon" aria-hidden="true">
                      {c.icon}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
            </section>

            {stores.length > 0 && <StoreDirectory stores={stores} />}

            <section id="about" className="section">
              <div className="section-head">
                <h2>About {BRAND}</h2>
                <p>
                  {BRAND} checks Pakistani online stores for you, so you can see who sells a product for less before
                  you buy.
                </p>
              </div>
              <ol className="steps">
                <li>
                  <span className="step-n">1</span>
                  <h3>Search once</h3>
                  <p>Type a product name, like “deodorant” or “iPhone”.</p>
                </li>
                <li>
                  <span className="step-n">2</span>
                  <h3>We check every store at once</h3>
                  <p>All stores are searched in parallel, so results arrive in seconds.</p>
                </li>
                <li>
                  <span className="step-n">3</span>
                  <h3>Compare and buy</h3>
                  <p>See prices side by side, then buy directly from the store you choose.</p>
                </li>
              </ol>
            </section>
          </>
        )}

        {!home && (
          <section className="status" aria-live="polite">
            {loading ? (
              <p className="status-line">
                <span className="spinner" aria-hidden="true" />
                Searching {stores.length} stores…
              </p>
            ) : (
              <>
                <div className="status-top">
                  <h1 className="results-title">
                    {data.results.length} offers for “{data.query}”
                  </h1>
                  <p className="muted">
                    {withResults.length} of {data.sources.length} stores had matches
                    {data.cached ? ' · cached' : ` · ${(data.totalMs / 1000).toFixed(1)}s`}
                    {failed.length > 0 && ` · ${failed.length} unavailable`}
                  </p>
                </div>
                <details className="sources-details">
                  <summary>Store-by-store details</summary>
                  <p className="muted small">
                    All stores were searched in parallel in {data.totalMs} ms; one by one would take about{' '}
                    {sequentialMs} ms.
                  </p>
                  <ul className="sources">
                    {data.sources.map((s) => (
                      <li key={s.id} className={`source ${s.ok ? 'ok' : 'fail'}`}>
                        <span className="dot" aria-hidden="true" />
                        <strong>{s.name}</strong>
                        <span>{s.ok ? `${s.count} · ${s.ms} ms` : `unavailable (${s.error})`}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </section>
        )}

        {bestPerStore.length > 0 && <PriceSummary offers={bestPerStore} />}

        {data && data.results.length > 0 && (
          <section className="toolbar" aria-label="Filters">
            <div className="filters">
              {withResults.map((s) => (
                <label key={s.id} className="toggle">
                  <input type="checkbox" checked={!hidden.includes(s.id)} onChange={() => toggleStore(s.id)} />
                  {s.name} <span className="count">{s.count}</span>
                </label>
              ))}
              <label className="toggle">
                <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                Hide out of stock
              </label>
            </div>
            <label className="sort">
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Best match</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="discount">Biggest discount</option>
              </select>
            </label>
          </section>
        )}

        {loading && (
          <div className="grid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="card skeleton" />
            ))}
          </div>
        )}

        {data && results.length === 0 && (
          <p className="empty">
            {data.results.length ? 'No offers match these filters.' : `No stores had “${data.query}”. Try a simpler term.`}
          </p>
        )}

        {results.length > 0 && (
          <div className="grid">
            {results.map((r) => (
              <ProductCard key={r.store + r.url} offer={r} lowest={lowest} />
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <a href="#top" className="brand" onClick={(e) => (e.preventDefault(), goToSection('top'))}>
              <span className="logo" aria-hidden="true">
                {BRAND[0]}
              </span>
              {BRAND}
            </a>
            <p className="muted small">
              Prices are fetched live from each store and may change. Always confirm on the store’s website.
            </p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <a href="#stores" onClick={(e) => (e.preventDefault(), goToSection('stores'))}>
              Stores
            </a>
            <a href="#about" onClick={(e) => (e.preventDefault(), goToSection('about'))}>
              About Us
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default App
