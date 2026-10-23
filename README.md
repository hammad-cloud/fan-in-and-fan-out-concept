# SastaScan

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
| Tests | Node test runner (`backend/*.test.js`) |
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
│   └── *.test.js           # Backend tests
├── frontend/
│   ├── index.html
│   ├── vite.config.js      # Proxies /api to the backend in development
│   └── src/
│       ├── App.jsx
│       ├── components/     # Navbar, SearchBar, ProductCard, PriceSummary, StoreDirectory
│       └── format.js       # Price formatting
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

Run the backend tests with `npm --prefix backend test`.

## Deploy

The project deploys to Vercel as-is (`vercel.json`): `vercel deploy --prod`.

## Notes

- No API keys or secrets are needed. Never commit `.env*` files.
- Search is limited to 10 new searches per visitor per minute, and results are cached for 30 minutes.
- Store data comes from each store's public search pages, which can change or block requests at any time. Check each store's terms of use before running this publicly. Prices shown may be out of date; always confirm on the store's website.

## License

[MIT](LICENSE) © 2026 Muhammad Hammad
