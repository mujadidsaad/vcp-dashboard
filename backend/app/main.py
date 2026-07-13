"""FastAPI application entry point."""
from __future__ import annotations

import asyncio
import csv
import json
import logging
import time
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .config import (
    DEFAULT_FILTERS,
    GRADES,
    PRESET_FILTERS,
    TIMEFRAME_TO_YF,
    alternate_exchange,
    to_yahoo_symbol,
)
from .data_source import fetch_bars
from .logging_config import scan_logger, setup_logging
from .rvol import analyze_rvol
from .schemas import (
    RvolScanRequest,
    ScanRequest,
    SingleScanRequest,
    TrendTemplateScanRequest,
)
from .trend_template import analyze_trend_template, compute_return_6m
from .universe import universe
from .vcp import analyze_vcp

# Initialise logging as early as possible.
setup_logging()
log = logging.getLogger("app")
slog = scan_logger()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_CSV = BASE_DIR.parent / "data" / "data.csv"

app = FastAPI(title="VCP Screener API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- HTTP request/response logging middleware ----------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    client = request.client.host if request.client else "-"
    log.info("→ %s %s from=%s", request.method, request.url.path, client)
    try:
        response = await call_next(request)
    except Exception as e:
        log.exception("✗ %s %s raised: %s", request.method, request.url.path, e)
        raise
    dur_ms = (time.perf_counter() - start) * 1000
    log.info("← %s %s status=%s dur=%.1fms", request.method, request.url.path, response.status_code, dur_ms)
    return response


# ---------- basic endpoints ----------

@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "vcp-screener"}


@app.get("/api/config")
def get_config() -> dict[str, Any]:
    return {
        "grades": GRADES,
        "timeframes": list(TIMEFRAME_TO_YF.keys()),
        "defaultFilters": DEFAULT_FILTERS,
        "presets": PRESET_FILTERS,
    }


@app.get("/api/stocks")
def get_stocks(universe_name: Optional[str] = None) -> dict[str, Any]:
    """Return the stock universe. Pass `?universe_name=Nifty 50` to slice it.

    Available universe names come from `/api/universes`.
    """
    if universe_name:
        rows = universe.get(universe_name)
    else:
        rows = universe.get("All Stocks")
    return {"count": len(rows), "stocks": rows, "universe": universe_name or "All Stocks"}


@app.get("/api/universes")
def get_universes() -> dict[str, Any]:
    """List every available universe with its stock count."""
    return {"universes": universe.list_universes()}


# ---------- single-stock scan (useful for debugging) ----------

@app.post("/api/scan/single")
def scan_single(req: SingleScanRequest) -> dict[str, Any]:
    filters = req.filters or DEFAULT_FILTERS
    yahoo_symbol = to_yahoo_symbol(req.symbol, req.exchange)
    bars = fetch_bars(yahoo_symbol, req.timeframe)
    if bars.empty:
        alt = alternate_exchange(req.exchange)
        alt_symbol = to_yahoo_symbol(req.symbol, alt)
        if alt_symbol != yahoo_symbol:
            bars = fetch_bars(alt_symbol, req.timeframe)
            if not bars.empty:
                yahoo_symbol = alt_symbol
    if bars.empty:
        return {"error": "Data unavailable", "symbol": req.symbol, "yahooSymbol": yahoo_symbol}
    result = analyze_vcp(req.symbol, yahoo_symbol, bars, filters)
    return result


# ---------- streaming scan (SSE) ----------

def _sse(event: str, payload: dict[str, Any]) -> dict[str, str]:
    return {"event": event, "data": json.dumps(payload)}


# Concurrency: process this many stocks in parallel per batch.
BATCH_SIZE = 5
# Pause between batches (seconds) to avoid Yahoo Finance rate limiting.
BATCH_PAUSE = 0.3
# Per-symbol retry (single retry with backoff on empty response — Yahoo often
# returns an empty payload transiently under mild load).
RETRY_DELAY = 1.0


async def _fetch_with_retry(yahoo_symbol: str, timeframe: str):
    """Fetch bars with one retry after a short delay if the first attempt is empty."""
    bars = await asyncio.to_thread(fetch_bars, yahoo_symbol, timeframe)
    if bars.empty:
        await asyncio.sleep(RETRY_DELAY)
        bars = await asyncio.to_thread(fetch_bars, yahoo_symbol, timeframe)
    return bars


async def _process_one(symbol: str, exchange: str, timeframe: str, filters: dict):
    """Fetch + analyze one stock. Returns (kind, payload). kind: 'result' or 'error'."""
    yahoo_symbol = to_yahoo_symbol(symbol, exchange)
    t0 = time.perf_counter()
    try:
        bars = await _fetch_with_retry(yahoo_symbol, timeframe)
        if bars.empty:
            alt = alternate_exchange(exchange)
            alt_symbol = to_yahoo_symbol(symbol, alt)
            if alt_symbol != yahoo_symbol:
                slog.info("fallback %s → %s (empty %s)", yahoo_symbol, alt_symbol, timeframe)
                bars = await _fetch_with_retry(alt_symbol, timeframe)
                if not bars.empty:
                    yahoo_symbol = alt_symbol
        dur_ms = (time.perf_counter() - t0) * 1000
        if bars.empty:
            slog.warning("✗ %-14s tf=%-3s dur=%6.1fms → data unavailable", yahoo_symbol, timeframe, dur_ms)
            return "error", {"symbol": symbol, "reason": "Data unavailable"}
        result = await asyncio.to_thread(analyze_vcp, symbol, yahoo_symbol, bars, filters)
        slog.info(
            "✓ %-14s tf=%-3s dur=%6.1fms score=%3d grade=%-14s bars=%d",
            yahoo_symbol, timeframe, dur_ms,
            result.get("vcpScore", 0),
            result.get("setupGrade", "-"),
            len(bars),
        )
        return "result", result
    except Exception as e:
        dur_ms = (time.perf_counter() - t0) * 1000
        slog.error("✗ %-14s tf=%-3s dur=%6.1fms → %s", yahoo_symbol, timeframe, dur_ms, e)
        return "error", {"symbol": symbol, "reason": f"Error: {e}"}


@app.post("/api/scan")
async def scan_stream(req: ScanRequest):
    """Server-Sent Events stream. Emits `progress`, `result`, `error`, `done`.

    Symbols are processed in batches of BATCH_SIZE concurrently to speed up
    scans while staying under Yahoo Finance rate limits.
    """
    symbols = req.symbols
    filters = req.filters or DEFAULT_FILTERS
    timeframe = req.timeframe or "1d"

    slog.info("=" * 60)
    slog.info("SCAN START · timeframe=%s · symbols=%d · batch=%d", timeframe, len(symbols), BATCH_SIZE)
    scan_started = time.perf_counter()
    ok_count = 0
    err_count = 0

    async def event_generator():
        nonlocal ok_count, err_count
        total = len(symbols)
        processed = 0

        for i in range(0, total, BATCH_SIZE):
            batch = symbols[i:i + BATCH_SIZE]

            # Emit a progress event for each symbol *before* processing the batch.
            for j, row in enumerate(batch):
                yield _sse("progress", {
                    "current": processed + j + 1,
                    "total": total,
                    "symbol": to_yahoo_symbol(row.symbol, row.exchange),
                })

            # Launch all N in the batch concurrently.
            tasks = [
                _process_one(row.symbol, row.exchange, timeframe, filters)
                for row in batch
            ]
            results = await asyncio.gather(*tasks, return_exceptions=False)

            # Emit each outcome.
            batch_ok = batch_err = 0
            for (kind, payload) in results:
                yield _sse(kind, payload)
                if kind == "result":
                    ok_count += 1; batch_ok += 1
                else:
                    err_count += 1; batch_err += 1

            processed += len(batch)
            slog.info("  batch %3d-%3d/%d · ok=%d err=%d",
                      processed - len(batch) + 1, processed, total, batch_ok, batch_err)

            # Yield control and pause slightly before the next batch.
            await asyncio.sleep(BATCH_PAUSE)

        elapsed = time.perf_counter() - scan_started
        slog.info("SCAN DONE · total=%d · ok=%d · err=%d · elapsed=%.1fs",
                  total, ok_count, err_count, elapsed)
        slog.info("=" * 60)
        yield _sse("done", {"total": total, "processed": processed, "ok": ok_count, "errors": err_count})

    return EventSourceResponse(event_generator())


# ---------- RVOL screener (SSE) ----------

async def _process_one_rvol(symbol: str, exchange: str, lookback: int):
    """Fetch daily bars + compute RVOL for one symbol."""
    yahoo_symbol = to_yahoo_symbol(symbol, exchange)
    t0 = time.perf_counter()
    try:
        bars = await _fetch_with_retry(yahoo_symbol, "1d")
        if bars.empty:
            alt = alternate_exchange(exchange)
            alt_symbol = to_yahoo_symbol(symbol, alt)
            if alt_symbol != yahoo_symbol:
                bars = await _fetch_with_retry(alt_symbol, "1d")
                if not bars.empty:
                    yahoo_symbol = alt_symbol
        dur_ms = (time.perf_counter() - t0) * 1000
        if bars.empty:
            slog.warning("RVOL ✗ %-14s dur=%6.1fms → data unavailable", yahoo_symbol, dur_ms)
            return "error", {"symbol": symbol, "reason": "Data unavailable"}
        result = await asyncio.to_thread(analyze_rvol, symbol, yahoo_symbol, bars, lookback)
        slog.info(
            "RVOL ✓ %-14s dur=%6.1fms rvol=%6.2fx chg=%+6.2f%% ss=%s bars=%d",
            yahoo_symbol, dur_ms,
            result.get("rvol", 0.0),
            result.get("chgPct", 0.0),
            "★" if result.get("strongStart") else " ",
            len(bars),
        )
        return "result", result
    except Exception as e:
        dur_ms = (time.perf_counter() - t0) * 1000
        slog.error("RVOL ✗ %-14s dur=%6.1fms → %s", yahoo_symbol, dur_ms, e)
        return "error", {"symbol": symbol, "reason": f"Error: {e}"}


@app.post("/api/scan/rvol")
async def scan_rvol_stream(req: RvolScanRequest):
    """Server-Sent Events stream for the RVOL screener.

    For each symbol, streams a `result` event with RVOL, Chg%, Strong Start,
    OHLCV of the latest daily bar, and the N-day average volume baseline.
    The frontend is responsible for sorting/ranking the collected results.
    """
    symbols = req.symbols
    lookback = max(1, min(100, int(req.lookback or 20)))

    slog.info("=" * 60)
    slog.info("RVOL SCAN START · lookback=%d · symbols=%d · batch=%d", lookback, len(symbols), BATCH_SIZE)
    scan_started = time.perf_counter()
    ok_count = 0
    err_count = 0

    async def event_generator():
        nonlocal ok_count, err_count
        total = len(symbols)
        processed = 0

        for i in range(0, total, BATCH_SIZE):
            batch = symbols[i:i + BATCH_SIZE]

            for j, row in enumerate(batch):
                yield _sse("progress", {
                    "current": processed + j + 1,
                    "total": total,
                    "symbol": to_yahoo_symbol(row.symbol, row.exchange),
                })

            tasks = [_process_one_rvol(row.symbol, row.exchange, lookback) for row in batch]
            results = await asyncio.gather(*tasks, return_exceptions=False)

            batch_ok = batch_err = 0
            for (kind, payload) in results:
                yield _sse(kind, payload)
                if kind == "result":
                    ok_count += 1; batch_ok += 1
                else:
                    err_count += 1; batch_err += 1

            processed += len(batch)
            slog.info("  RVOL batch %3d-%3d/%d · ok=%d err=%d",
                      processed - len(batch) + 1, processed, total, batch_ok, batch_err)

            await asyncio.sleep(BATCH_PAUSE)

        elapsed = time.perf_counter() - scan_started
        slog.info("RVOL SCAN DONE · total=%d · ok=%d · err=%d · elapsed=%.1fs",
                  total, ok_count, err_count, elapsed)
        slog.info("=" * 60)
        yield _sse("done", {"total": total, "processed": processed, "ok": ok_count, "errors": err_count})

    return EventSourceResponse(event_generator())


# ---------- Trend Template screener (SSE) ----------

async def _process_one_trend(symbol: str, exchange: str, bench_ret_6m: Optional[float]):
    """Fetch daily bars + evaluate the Minervini Trend Template for one symbol."""
    yahoo_symbol = to_yahoo_symbol(symbol, exchange)
    t0 = time.perf_counter()
    try:
        bars = await _fetch_with_retry(yahoo_symbol, "1d")
        if bars.empty:
            alt = alternate_exchange(exchange)
            alt_symbol = to_yahoo_symbol(symbol, alt)
            if alt_symbol != yahoo_symbol:
                bars = await _fetch_with_retry(alt_symbol, "1d")
                if not bars.empty:
                    yahoo_symbol = alt_symbol
        dur_ms = (time.perf_counter() - t0) * 1000
        if bars.empty:
            slog.warning("TT ✗ %-14s dur=%6.1fms → data unavailable", yahoo_symbol, dur_ms)
            return "error", {"symbol": symbol, "reason": "Data unavailable"}
        result = await asyncio.to_thread(
            analyze_trend_template, symbol, yahoo_symbol, bars, bench_ret_6m,
        )
        slog.info(
            "TT ✓ %-14s dur=%6.1fms stage=%d score=%d/8 rs=%+6.2f%% bars=%d",
            yahoo_symbol, dur_ms,
            result.get("stage", 0),
            result.get("score", 0),
            (result.get("rsVsBench", 0.0) or 0.0) * 100.0,
            len(bars),
        )
        return "result", result
    except Exception as e:
        dur_ms = (time.perf_counter() - t0) * 1000
        slog.error("TT ✗ %-14s dur=%6.1fms → %s", yahoo_symbol, dur_ms, e)
        return "error", {"symbol": symbol, "reason": f"Error: {e}"}


def _resolve_benchmark_yahoo(symbol: str, exchange: str) -> str:
    """The user may pass "^NSEI" (a full Yahoo ticker) or a plain symbol.
    to_yahoo_symbol already handles both, but we make the intent explicit."""
    sym = symbol.strip()
    if sym.startswith("^") or sym.endswith(".NS") or sym.endswith(".BO"):
        return sym
    return to_yahoo_symbol(sym, exchange)


@app.post("/api/scan/trend-template")
async def scan_trend_template_stream(req: TrendTemplateScanRequest):
    """Server-Sent Events stream for the Trend Template screener.

    Emits an initial `benchmark` event with the 6-month benchmark return, then
    one `progress` + `result`/`error` per symbol, and finally `done`.
    """
    symbols = req.symbols
    bench_yahoo = _resolve_benchmark_yahoo(req.benchmarkSymbol, req.benchmarkExchange)

    slog.info("=" * 60)
    slog.info(
        "TT SCAN START · benchmark=%s · symbols=%d · batch=%d",
        bench_yahoo, len(symbols), BATCH_SIZE,
    )
    scan_started = time.perf_counter()
    ok_count = 0
    err_count = 0
    stage2_count = 0

    # Fetch the benchmark once and compute its 6-month return. All symbols
    # in this scan share the same benchmark return (as per the Pine script).
    bench_bars = await _fetch_with_retry(bench_yahoo, "1d")
    if bench_bars.empty:
        slog.warning("TT benchmark %s returned no data — c8 will always be False", bench_yahoo)
        bench_ret_6m: Optional[float] = None
    else:
        bench_ret_6m = compute_return_6m(bench_bars)
        slog.info(
            "TT benchmark %s 6M return = %+6.2f%% (bars=%d)",
            bench_yahoo,
            (bench_ret_6m or 0.0) * 100.0,
            len(bench_bars),
        )

    async def event_generator():
        nonlocal ok_count, err_count, stage2_count
        total = len(symbols)
        processed = 0

        # First, tell the frontend the benchmark's return so it can display it.
        yield _sse("benchmark", {
            "benchmarkSymbol": bench_yahoo,
            "return6m": (bench_ret_6m if bench_ret_6m is not None else 0.0),
            "available": bench_ret_6m is not None,
        })

        for i in range(0, total, BATCH_SIZE):
            batch = symbols[i:i + BATCH_SIZE]

            for j, row in enumerate(batch):
                yield _sse("progress", {
                    "current": processed + j + 1,
                    "total": total,
                    "symbol": to_yahoo_symbol(row.symbol, row.exchange),
                })

            tasks = [
                _process_one_trend(row.symbol, row.exchange, bench_ret_6m)
                for row in batch
            ]
            results = await asyncio.gather(*tasks, return_exceptions=False)

            batch_ok = batch_err = 0
            for (kind, payload) in results:
                yield _sse(kind, payload)
                if kind == "result":
                    ok_count += 1
                    batch_ok += 1
                    if payload.get("stage") == 2:
                        stage2_count += 1
                else:
                    err_count += 1
                    batch_err += 1

            processed += len(batch)
            slog.info(
                "  TT batch %3d-%3d/%d · ok=%d err=%d · Stage2 so far=%d",
                processed - len(batch) + 1, processed, total,
                batch_ok, batch_err, stage2_count,
            )

            await asyncio.sleep(BATCH_PAUSE)

        elapsed = time.perf_counter() - scan_started
        slog.info(
            "TT SCAN DONE · total=%d · ok=%d · err=%d · Stage2=%d · elapsed=%.1fs",
            total, ok_count, err_count, stage2_count, elapsed,
        )
        slog.info("=" * 60)
        yield _sse("done", {
            "total": total,
            "processed": processed,
            "ok": ok_count,
            "errors": err_count,
            "stage2": stage2_count,
        })

    return EventSourceResponse(event_generator())
