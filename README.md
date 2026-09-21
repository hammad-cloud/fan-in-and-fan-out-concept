# Price Comparison PK

Pakistani price comparison platform — monorepo foundation.

| Layer | Stack |
| --- | --- |
| Frontend | Next.js + TypeScript |
| Backend API | Python + FastAPI |
| Database | PostgreSQL |
| Jobs / cache | Redis (workers later) |

## Repository layout

```
frontend/     Next.js app (App Router)
backend/      FastAPI application
workers/      Background job workers (scaffold only)
docs/         Architecture and setup notes
scripts/      Local developer utilities
.cursor/      Cursor project rules
```

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker Desktop (PostgreSQL + Redis)

## Quick start

1. **Environment**

   ```bash
   cp .env.example .env
   ```

2. **Infrastructure**

   ```bash
   docker compose up -d
   ```

3. **Backend**

   ```bash
   cd backend
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/api/v1/health |

## Current scope

This commit is **structure and configuration only**. Scraping, models, auth, product UI, and business logic are intentionally out of scope.

## Further reading

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
