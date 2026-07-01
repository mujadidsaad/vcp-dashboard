# VCP Screener

A Volatility-Contraction-Pattern (VCP) stock screener for Indian equities (NSE / BSE) — rewritten as a **Python (FastAPI) backend** + **React (Vite + TypeScript) frontend**.

Data is sourced live from **Yahoo Finance** via the `yfinance` Python package.

## Repo layout

```
vcp-dashboard/
├── backend/            # FastAPI service (Python)
│   ├── app/
│   │   ├── main.py          # HTTP + SSE endpoints
│   │   ├── config.py        # constants, defaults, symbol mapping
│   │   ├── indicators.py    # SMA / EMA / ATR / RSI / KC width
│   │   ├── vcp.py           # contraction detection + weighted scoring
│   │   ├── data_source.py   # yfinance wrapper
│   │   └── schemas.py       # Pydantic request models
│   ├── tests/               # pytest unit tests
│   └── requirements.txt
├── frontend/           # Vite + React + TS + Tailwind
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts           # backend client (SSE parser)
│   │   ├── types.ts
│   │   └── components/
│   └── package.json
├── data/data.csv       # 4400+ symbol universe (Symbol, Exchange)
└── _legacy_nextjs/     # archived original Next.js implementation
```

## Run locally

Two terminals:

**Terminal 1 – backend**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Swagger docs: http://localhost:8000/docs

**Terminal 2 – frontend**
```bash
cd frontend
npm install
npm run dev
```
UI: http://localhost:5173 (Vite dev-proxies `/api/*` to `http://localhost:8000`)

## API endpoints

| Method | Path                | Description                                 |
| ------ | ------------------- | ------------------------------------------- |
| GET    | `/api/health`       | Liveness check                              |
| GET    | `/api/config`       | Grades, timeframes, default filters, presets|
| GET    | `/api/stocks`       | Full stock universe from `data/data.csv`    |
| POST   | `/api/scan/single`  | Analyze one symbol (returns full result)    |
| POST   | `/api/scan`         | SSE stream: `progress`, `result`, `error`, `done` |

### `POST /api/scan/single`
```bash
curl -s http://localhost:8000/api/scan/single \
  -H "Content-Type: application/json" \
  -d '{"symbol":"RELIANCE","exchange":"NSE","timeframe":"1d"}' | jq .
```

### `POST /api/scan` (SSE)
```bash
curl -N http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"timeframe":"1d","symbols":[{"symbol":"RELIANCE","exchange":"NSE"},{"symbol":"TCS","exchange":"NSE"}]}'
```

## Backend tests

```bash
cd backend
source .venv/bin/activate
pytest -q
```

## What the VCP engine checks

Weighted scoring across:

- Prior uptrend (≥15% price rise)
- Above MA50 / MA200
- EMA20 > EMA50 > EMA200 alignment
- Near 52-week high (≤25%)
- ≥ 2 contractions, each tighter than the last
- Keltner-Channel width contracting (>10% reduction)
- Volume dry-up (≥10% below prior average)
- RSI 50-75
- Near breakout (≤5% below 20-day resistance)
- Confirmed breakout (close > resistance & volume spike)
- Anomaly-free (ATR & volume within 3σ)

Grades: **A+ Confirmed · A Watchlist · B Watchlist · B Setup · C Early Setup · Rejected**.

## Timeframes supported

`5m · 15m · 30m · 1H · 4H · 1D · 1W · 1M` (4H is aggregated locally from 1H bars).

## Notes

- The original Next.js implementation is preserved under `_legacy_nextjs/` for reference.
- Yahoo Finance rate-limits fairly aggressively on intraday intervals; daily/weekly are the most reliable for large scans.
- The scan endpoint runs symbols sequentially and streams progress via SSE.