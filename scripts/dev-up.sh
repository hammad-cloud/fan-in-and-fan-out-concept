# Starts local infrastructure (Postgres + Redis).
# Usage: from repo root — ./scripts/dev-up.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

docker compose up -d
docker compose ps

echo ""
echo "Infrastructure is up."
echo "Backend:  cd backend && uvicorn app.main:app --reload --port 8000"
echo "Frontend: cd frontend && npm run dev"
