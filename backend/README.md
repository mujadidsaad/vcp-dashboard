# VCP Screener - Python Backend

FastAPI service exposing the VCP screener engine.

## Setup

```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```
uvicorn app.main:app --reload --port 8000
```

Endpoints:
- GET  /api/health
- GET  /api/config
- GET  /api/stocks
- POST /api/scan/single
- POST /api/scan   (SSE stream)

## Tests

```
cd backend && pytest -q