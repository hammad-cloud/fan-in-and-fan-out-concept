import { initials } from '../format'

export default function StoreDirectory({ stores }) {
  // Group by category, keeping the order categories first appear in the API response.
  const groups = new Map()
  for (const s of stores) {
    if (!groups.has(s.category)) groups.set(s.category, [])
    groups.get(s.category).push(s)
  }

  return (
    <section id="stores" className="section">
      <div className="section-head">
        <h2>Supported stores</h2>
        <p>We compare live prices from {stores.length} Pakistani online stores.</p>
      </div>
      <div className="store-groups">
        {[...groups].map(([category, list]) => (
          <div key={category} className="store-group">
            <h3>
              {category} <span className="count">{list.length}</span>
            </h3>
            <ul className="store-grid">
              {list.map((s) => (
                <li key={s.id}>
                  <a href={s.site} target="_blank" rel="noreferrer" className="store-tile">
                    <span className="store-logo" data-store={s.id} aria-hidden="true">
                      {initials(s.name)}
                    </span>
                    <span className="store-name">{s.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
