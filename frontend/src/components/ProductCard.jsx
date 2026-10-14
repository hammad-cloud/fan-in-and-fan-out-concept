import { pctOff, rs } from '../format'

const STOCK = {
  true: { cls: 'in', label: 'In stock' },
  false: { cls: 'out', label: 'Out of stock' },
  null: { cls: 'unknown', label: 'Check availability' },
}

export default function ProductCard({ offer: r, lowest }) {
  const off = pctOff(r)
  const isLowest = r.available !== false && r.price === lowest
  const stock = STOCK[r.available] ?? STOCK.null

  return (
    <a href={r.url} target="_blank" rel="noreferrer" className={`card ${isLowest ? 'is-lowest' : ''}`}>
      <div className="thumb">
        {r.image && <img src={r.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
        {isLowest && <span className="chip chip-save flag">Lowest price</span>}
      </div>
      <div className="body">
        <span className="store-badge" data-store={r.store}>
          {r.storeName}
        </span>
        <h3 title={r.title}>{r.title}</h3>
        <div className="price-row">
          <strong className="price">{rs(r.price)}</strong>
          {r.originalPrice > r.price && <s>{rs(r.originalPrice)}</s>}
          {off > 0 && <span className="chip chip-save">{off}% off</span>}
        </div>
        {lowest !== null && (
          <p className="diff-line">
            {isLowest
              ? 'Lowest available price'
              : r.price > lowest
                ? `${rs(r.price - lowest)} more than the lowest`
                : r.price < lowest
                  ? 'Cheaper, but out of stock'
                  : 'Same as the lowest price'}
          </p>
        )}
        <div className="meta">
          <span className={`stock ${stock.cls}`}>{stock.label}</span>
          {r.rating ? <span>★ {r.rating.toFixed(1)}</span> : null}
        </div>
        <span className="cta">View on {r.storeName} ↗</span>
      </div>
    </a>
  )
}
