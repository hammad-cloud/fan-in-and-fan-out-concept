# Starts local infrastructure (Postgres + Redis).
# Usage: from repo root — .\scripts\dev-up.ps1

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

docker compose up -d
docker compose ps

Write-Host ""
Write-Host "Infrastructure is up."
Write-Host "Backend:  cd backend; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
Write-Host "Frontend: cd frontend; npm run dev"
