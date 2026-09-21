# Price Comparison PK — Frontend

Next.js (App Router) + TypeScript client.

## Run locally

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — the home page shows a system status panel fed by `GET /health`.

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (defaults to `http://localhost:8000`).
