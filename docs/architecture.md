# Architecture (foundation)

High-level layout for the Pakistani price comparison platform.

```
┌─────────────┐     HTTP      ┌─────────────┐
│  frontend   │ ────────────► │   backend   │
│  Next.js    │               │   FastAPI   │
└─────────────┘               └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                                 ▼
             ┌────────────┐                    ┌────────────┐
             │ PostgreSQL │                    │   Redis    │
             │  (primary) │                    │ (jobs later)│
             └────────────┘                    └─────▲──────┘
                                                     │
                                               ┌─────┴──────┐
                                               │  workers   │
                                               │ (scaffold) │
                                               └────────────┘
```

## Responsibilities

| Package | Role |
| --- | --- |
| `frontend/` | User-facing UI; talks to backend via `NEXT_PUBLIC_API_BASE_URL` |
| `backend/` | Public HTTP API (`/api/v1/...`); config via pydantic-settings |
| `workers/` | Async jobs against Redis (not wired yet) |
| `docs/` | Human-facing design and ops notes |
| `scripts/` | Local DX helpers |

## API versioning

All routes under `/api/v1`. Breaking changes ship as `/api/v2`.

## Out of scope (this foundation)

- Scraping retailers
- ORM / migrations / models
- Authentication
- Product search UI and business rules

## Conventions

- Pakistan market focus (PKR, local retailers) when features arrive
- Keep secrets in `.env` (never commit); document keys in `.env.example`
- Prefer small, reviewable changes per package
