# SastaScan

**Live site: https://sastascan-pk.vercel.app**

Price comparison for Pakistani online stores. One search is sent to 46 stores in parallel (fan-out), and the results are merged into one list sorted by price (fan-in).

## Project layout

- `frontend/` – React + Vite site
- `backend/` – store adapters (`stores.js`), shared search logic (`search.js`), relevance filter, and a local Express server
- `api/` – Vercel serverless functions that reuse `backend/search.js`

## Run locally

```bash
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
