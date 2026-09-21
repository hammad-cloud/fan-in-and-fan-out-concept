# Price Comparison PK — Workers

Background job processors (Redis). **Scaffold only** — no queue consumer yet.

## Intended later use

- Product price sync / scrape orchestration
- Retryable jobs via Redis
- Separate process from the FastAPI API

## Run (when implemented)

```bash
cd workers
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.worker
```
