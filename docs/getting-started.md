# Getting started

## 1. Clone and configure

```bash
cp .env.example .env
```

Edit secrets in `.env` before any non-local deployment. Defaults are for local Docker only.

## 2. Start PostgreSQL and Redis

```bash
docker compose up -d
docker compose ps
```

## 3. Backend API

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

macOS / Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify: http://localhost:8000/api/v1/health

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Verify: http://localhost:3000

## Optional helper

From the repo root (PowerShell):

```powershell
.\scripts\dev-up.ps1
```

Or Bash:

```bash
./scripts/dev-up.sh
```
