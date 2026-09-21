"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import { getApiBaseUrl } from "@/lib/config";

type SearchHit = {
  product: {
    id: string;
    name: string;
  };
  lowest_price: string | null;
  currency: string | null;
  offer_count: number;
};

type SearchResponse = {
  items: SearchHit[];
  total: number;
};

type ViewMode = "grid" | "list";

type CardResult = {
  id: string;
  name: string;
  store: string;
  price: string;
};

const DEMO_RESULTS: CardResult[] = [
  {
    id: "1",
    name: "Vaseline Intensive Care Cocoa Glow Lotion 400ml",
    store: "Daraz",
    price: "Rs 1,149",
  },
  {
    id: "2",
    name: "Vaseline Lip Therapy Rosy Lips 20g",
    store: "PriceOye",
    price: "Rs 690",
  },
  {
    id: "3",
    name: "Vaseline Men Cooling Body Lotion 400ml",
    store: "Mega.pk",
    price: "Rs 999",
  },
  {
    id: "4",
    name: "Vaseline Healthy Bright Gluta-Hya Serum Burst",
    store: "iShopping",
    price: "Rs 1,799",
  },
];

function formatPrice(amount: string | null, currency: string | null): string {
  if (amount == null) return "Price TBA";
  const value = Number(amount);
  if (Number.isNaN(value)) return `${currency ?? "PKR"} ${amount}`;
  return `Rs ${value.toLocaleString("en-PK")}`;
}

function demoMatches(query: string): CardResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DEMO_RESULTS.filter((item) => item.name.toLowerCase().includes(q));
}

export function SearchExperience() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [store, setStore] = useState("all");
  const [sort, setSort] = useState("price-asc");
  const [results, setResults] = useState<CardResult[]>([]);
  const [usingDemo, setUsingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedResults = useMemo(() => {
    const copy = [...results];
    copy.sort((a, b) => {
      const pa = Number(a.price.replace(/[^\d.]/g, "")) || 0;
      const pb = Number(b.price.replace(/[^\d.]/g, "")) || 0;
      return sort === "price-desc" ? pb - pa : pa - pb;
    });
    return copy;
  }, [results, sort]);

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    setError(null);
    setHasSearched(true);
    setActiveQuery(trimmed);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/search?q=${encodeURIComponent(trimmed)}&limit=24`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        setResults(demoMatches(trimmed));
        setUsingDemo(true);
        setError("API search unavailable — showing sample listings.");
        return;
      }

      const data = (await response.json()) as SearchResponse;
      const live = (data.items ?? []).map((item) => ({
        id: item.product.id,
        name: item.product.name,
        store: item.offer_count > 0 ? `${item.offer_count} offers` : "nirphup",
        price: formatPrice(item.lowest_price, item.currency),
      }));

      if (live.length > 0) {
        setResults(live);
        setUsingDemo(false);
        return;
      }

      setResults(demoMatches(trimmed));
      setUsingDemo(true);
      setError("No catalog matches yet — showing sample listings.");
    } catch {
      setResults(demoMatches(trimmed));
      setUsingDemo(true);
      setError("Live search unavailable — showing sample listings.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    startTransition(() => {
      void runSearch(next);
    });
  }

  return (
    <>
      <section className="hero">
        <p className="hero-kicker">Precise price comparison for Pakistan</p>
        <h1>Premium Now — Only Rs 250/month</h1>
        <p className="hero-copy">
          Compare prices from Daraz, PriceOye, Mega.pk &amp; more instantly.
        </p>

        <form className="search-form" onSubmit={onSubmit} role="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            autoComplete="off"
          />
          <button type="submit" disabled={pending}>
            {pending ? "…" : "SEARCH"}
          </button>
        </form>
      </section>

      {hasSearched ? (
        <section className="results" aria-live="polite">
          <div className="results-bar">
            <div className="results-meta">
              <h2>Results for &lsquo;{activeQuery}&rsquo;</h2>
              <p>
                {sortedResults.length} results
                {pending ? " · searching…" : ""}
                {usingDemo ? " · sample data" : ""}
                {error ? ` · ${error}` : ""}
              </p>
            </div>

            <div className="results-controls">
              <label className="control">
                Store
                <select value={store} onChange={(event) => setStore(event.target.value)}>
                  <option value="all">All Popular Stores</option>
                  <option value="daraz">Daraz</option>
                  <option value="priceoye">PriceOye</option>
                  <option value="mega">Mega.pk</option>
                </select>
              </label>

              <label className="control">
                Sort
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="price-asc">Price Low — High</option>
                  <option value="price-desc">Price High — Low</option>
                </select>
              </label>

              <div className="view-toggle" role="group" aria-label="Result layout">
                <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                  Grid
                </button>
                <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
                  List
                </button>
              </div>
            </div>
          </div>

          {sortedResults.length === 0 ? (
            <div className="empty-state">No products matched that search yet.</div>
          ) : (
            <div className={`product-grid ${view}`}>
              {sortedResults.map((item) => (
                <article key={item.id} className={`product-card ${view}`}>
                  <div className="product-thumb" aria-hidden="true">
                    {item.name.slice(0, 1)}
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    <p className="store">{item.store}</p>
                  </div>
                  <p className="price">{item.price}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
