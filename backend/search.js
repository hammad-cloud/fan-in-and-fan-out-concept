// Shared by the local Express server (server.js) and the Vercel functions (api/*.js).
const { stores } = require('./stores');
const { matchesQuery } = require('./relevance');

const STORE_TIMEOUT_MS = 7000; // keeps a search well under serverless time limits
const CACHE_MS = 30 * 60 * 1000; // long, because every uncached search sends ~40 store requests
const cache = new Map(); // query -> { at, body }; keeps us from hammering the stores (Al-Fatah rate-limits)

// Links and images come from 41 outside sites; only pass on real web URLs (blocks javascript:, data:, etc.).
function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

// Each uncached search sends ~40 outbound requests, so cap how many one visitor can start per minute.
// shortcut: in-memory, so each server instance counts separately; use a shared store (e.g. Redis/Vercel KV) if abused.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;
const rate = new Map(); // ip -> { start, count }

function allowSearch(ip) {
  const now = Date.now();
  if (rate.size > 10000) rate.clear(); // bound memory
  const entry = rate.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rate.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_MAX;
}

const listStores = () =>
  stores.map(({ id, name, site, category }) => ({ id, name, site, category: category ?? 'Other' }));

// Returns { status, body } so each host can send it its own way.
async function searchAll(rawQuery, ip = 'unknown') {
  const q = String(rawQuery ?? '').trim().slice(0, 100);
  if (q.length < 2) return { status: 400, body: { error: 'Search term must be at least 2 characters' } };

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { status: 200, body: { ...hit.body, cached: true } };

  if (!allowSearch(ip)) {
    return { status: 429, body: { error: 'Too many searches. Please wait a minute and try again.' } };
  }

  const started = Date.now();

  // Fan-out: query every store at the same time, each with its own timeout.
  const settled = await Promise.allSettled(
    stores.map(async (store) => {
      const t0 = Date.now();
      const items = await store.search(q, AbortSignal.timeout(STORE_TIMEOUT_MS));
      return { store, items, ms: Date.now() - t0 };
    })
  );

  // Fan-in: merge whatever came back; a failed store never sinks the whole search.
  const sources = [];
  const results = [];
  settled.forEach((r, i) => {
    const store = stores[i];
    if (r.status === 'fulfilled') {
      const items = r.value.items
        .map((it) => ({ ...it, url: safeUrl(it.url), image: safeUrl(it.image) }))
        .filter((it) => it.title && it.price && it.url && matchesQuery(`${it.title} ${it.keywords ?? ''}`, q));
      sources.push({ id: store.id, name: store.name, ok: true, count: items.length, ms: r.value.ms });
      items.forEach(({ keywords, ...it }) => results.push({ ...it, store: store.id, storeName: store.name }));
    } else {
      const msg = r.reason?.message || 'failed';
      // Shopify rate-limits busy server IPs for about a minute (HTTP 429)
      const reason = r.reason?.name === 'TimeoutError' ? 'timed out' : msg === 'HTTP 429' ? 'busy, try again in a minute' : msg;
      sources.push({ id: store.id, name: store.name, ok: false, count: 0, error: reason });
    }
  });
  results.sort((a, b) => a.price - b.price);

  const body = { query: q, totalMs: Date.now() - started, sources, results };
  // Don't cache a result where stores were rate-limited, or later visitors keep getting the incomplete list.
  const rateLimited = sources.some((s) => s.error === 'busy, try again in a minute');
  if (sources.some((s) => s.ok) && !rateLimited) {
    if (cache.size >= 500) cache.delete(cache.keys().next().value); // drop oldest entry
    cache.set(key, { at: Date.now(), body });
  }
  return { status: 200, body };
}

module.exports = { listStores, searchAll, safeUrl };
