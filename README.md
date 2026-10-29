# SastaScan

[![Tests](https://github.com/hammad-cloud/fan-in-and-fan-out-concept/actions/workflows/test.yml/badge.svg)](https://github.com/hammad-cloud/fan-in-and-fan-out-concept/actions/workflows/test.yml)

**Live site: https://sastascan-pk.vercel.app**

Price comparison for Pakistani online stores. One search is sent to 46 stores in parallel (fan-out), and the results are merged into one list sorted by price (fan-in).

## How it works

```
                ┌──► Store 1 ──┐
Search query ───┼──► Store 2 ──┼──► Relevance filter ──► Merge + sort by price ──► Results
  (fan-out)     └──► Store 46 ─┘          (fan-in)
```

Each store request runs in parallel with a 7-second timeout (`Promise.allSettled`), so one slow or failing store never blocks the rest.

## Tech stack

| Layer | Tools |
|-------|-------|
| Frontend | React 19, Vite |
| Backend | Node.js, Express (local), Vercel serverless functions (production) |
| Tests | Node test runner (backend), Vitest + React Testing Library (frontend), GitHub Actions |
| Hosting | Vercel |

## Folder structure

```
fan-in-and-fan-out-concept/
├── api/                    # Vercel serverless functions
│   ├── search.js           # GET /api/search — runs the shared search
│   └── stores.js           # GET /api/stores — list of supported stores
├── backend/
│   ├── stores.js           # Adapters for the 46 stores
│   ├── search.js           # Fan-out / fan-in logic, caching, rate limit
│   ├── relevance.js        # Drops results that don't match the query
│   ├── server.js           # Local Express server (port 5000)
│   └── *.test.js           # Unit, stress, performance, load and security tests
├── frontend/
│   ├── index.html
│   ├── vite.config.js      # Proxies /api to the backend in development
│   └── src/
│       ├── App.jsx
│       ├── *.test.js(x)    # Frontend tests (Vitest)
│       ├── components/     # Navbar, SearchBar, ProductCard, PriceSummary, StoreDirectory
│       └── format.js       # Price formatting
├── .github/workflows/      # Runs all tests on every push and pull request
├── vercel.json             # Vercel build and routing
└── package.json            # `npm run dev` runs backend + frontend together
```

## Run locally

```bash
git clone https://github.com/hammad-cloud/fan-in-and-fan-out-concept.git
cd fan-in-and-fan-out-concept
npm install                     # root (dev runner)
npm --prefix backend install
npm --prefix frontend install
npm run dev                     # backend on :5000, frontend on :5173 (proxies /api)
```

## Tests

```bash
npm --prefix backend test       # ~10s: unit, stress, performance, load and security tests
npm --prefix frontend test      # ~3s: format, component and App tests (Vitest)
```

| Suite | What it checks |
|-------|----------------|
| Stress | Failing and hanging stores, 50k-result payloads, malformed store data, cache bounds |
| Performance | Stores are searched in parallel, cached searches skip the stores, relevance filter speed |
| Load | Up to 2000 HTTP requests at 200 concurrent against the Express app |
| Security | Unsafe links stripped, hostile queries, query length cap, rate limit, security headers |
| Frontend | Search flow, lowest-price logic, sort and filters, error and empty states |

Tests use fake stores, so they never contact the real store websites. GitHub Actions runs both suites, the frontend lint and the build on every push to `main` and on pull requests.

## Deploy

Vercel is connected to this repo: every push to `main` deploys to production, and pull requests get a preview link. Build settings live in `vercel.json`; `vercel deploy --prod` still works for a manual deploy.

## Notes

- No API keys or secrets are needed. Never commit `.env*` files.
- Search is limited to 10 new searches per visitor per minute, and results are cached for 30 minutes.
- Store data comes from each store's public search pages, which can change or block requests at any time. Check each store's terms of use before running this publicly. Prices shown may be out of date; always confirm on the store's website.

## License

[MIT](LICENSE) © 2026 Muhammad Hammad
