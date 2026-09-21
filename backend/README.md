# Price Comparison PK — Backend

FastAPI service for the price comparison platform.

## Run locally

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# or: python -m app
```

| Check | URL |
| --- | --- |
| Health | http://localhost:8000/health |
| Stores | http://localhost:8000/api/v1/stores |
| Products | http://localhost:8000/api/v1/products |
| Offers | http://localhost:8000/api/v1/offers |
| Search | http://localhost:8000/api/v1/search?q=samsung |
| OpenAPI | http://localhost:8000/docs |

Optional demo data:

```bash
python -m scripts.seed_demo
```

## Database

PostgreSQL via SQLAlchemy (async) + Alembic. `DATABASE_URL` comes from the root `.env`.

Host port defaults to **5433** (avoids clashing with other local Postgres on 5432).

```bash
# From repo root — start Postgres
docker compose up -d postgres

# From backend/
python -m scripts.check_db
alembic upgrade head
```

Sync URL for Alembic is derived automatically (`postgresql+asyncpg` → `postgresql+psycopg`).
