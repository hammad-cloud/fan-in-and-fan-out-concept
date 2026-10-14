import { useState } from 'react'
import { rs } from '../format'

const COLLAPSED_ROWS = 6

// One row per store: its cheapest matching offer, and how much more it costs than the overall lowest.
export default function PriceSummary({ offers }) {
  const [showAll, setShowAll] = useState(false)
  const lowest = offers[0].price
  const rows = showAll ? offers : offers.slice(0, COLLAPSED_ROWS)

  return (
    <section className="panel summary" aria-labelledby="summary-title">
      <div className="panel-head">
        <h2 id="summary-title">Cheapest match at each store</h2>
        <span className="muted">{offers.length} stores</span>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col" className="col-thumb">
              <span className="sr-only">Picture</span>
            </th>
            <th scope="col">Store</th>
            <th scope="col" className="col-product">
              Product
            </th>
            <th scope="col" className="num">
              Price
            </th>
            <th scope="col" className="num">
              Difference
            </th>
            <th scope="col" className="col-link">
              <span className="sr-only">Link</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.store} className={i === 0 ? 'is-lowest' : ''}>
              <td className="col-thumb">
                {r.image && <img src={r.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
              </td>
              <td>
                <span className="store-badge" data-store={r.store}>
                  {r.storeName}
                </span>
                <a href={r.url} target="_blank" rel="noreferrer" className="product-mobile">
                  {r.title} ↗
                </a>
              </td>
              <td className="col-product" title={r.title}>
                {r.title}
              </td>
              <td className="num price">{rs(r.price)}</td>
              <td className="num">
                {r.price === lowest ? (
                  <span className="chip chip-save">Lowest</span>
                ) : (
                  <span className="diff">
                    +{rs(r.price - lowest)}
                    <small> ({Math.round(((r.price - lowest) / lowest) * 100)}%)</small>
                  </span>
                )}
              </td>
              <td className="num col-link">
                <a href={r.url} target="_blank" rel="noreferrer" className="link" aria-label={`View on ${r.storeName}`}>
                  View ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {offers.length > COLLAPSED_ROWS && (
        <button type="button" className="btn btn-ghost show-all" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer stores' : `Show all ${offers.length} stores`}
        </button>
      )}
    </section>
  )
}
