"""VCP screener configuration - constants, defaults, timeframe mapping."""
from __future__ import annotations

from typing import Any

GRADES = [
    "A+ Confirmed",
    "A Watchlist",
    "B Watchlist",
    "B Setup",
    "C Early Setup",
    "Rejected",
]

# Map UI timeframe -> yfinance (interval, period)
TIMEFRAME_TO_YF: dict[str, dict[str, str]] = {
    "5m":  {"interval": "5m",  "period": "5d"},
    "15m": {"interval": "15m", "period": "5d"},
    "30m": {"interval": "30m", "period": "1mo"},
    "1h":  {"interval": "60m", "period": "3mo"},
    "4h":  {"interval": "60m", "period": "6mo"},
    "1d":  {"interval": "1d",  "period": "5y"},
    "1wk": {"interval": "1wk", "period": "5y"},
    "1mo": {"interval": "1mo", "period": "5y"},
}

DEFAULT_FILTERS: dict[str, Any] = {
    "minScore": 0,
    "gradeFilter": ["A+ Confirmed", "A Watchlist", "B Watchlist", "B Setup", "C Early Setup", "Rejected"],
    "nearBreakoutPct": 0.05,
    "volumeSpikeMultiplier": 1.5,
    "volumeDryUpMultiplier": 0.85,
    "minBaseDuration": 30,
    # RVOL filter: one of "any" | "lt1" | "lt2" | "lt3" | "gt3"
    "rvolFilter": "any",
    # Strong Start filter: only include stocks with strongStart=true
    "strongStartOnly": False,
    "checks": {
        "priorUptrend":          {"enabled": True, "points": 12, "threshold": 0.15},
        "aboveMa50":             {"enabled": True, "points": 10},
        "aboveMa200":            {"enabled": True, "points": 8},
        "ema20AboveEma50":       {"enabled": True, "points": 6},
        "ema50AboveEma200":      {"enabled": True, "points": 4},
        "nearHigh":              {"enabled": True, "points": 10, "threshold": 0.25},
        "contractionCount":      {"enabled": True, "points": 12, "min": 2},
        "contractionsImproving": {"enabled": True, "points": 10},
        "kcContraction":         {"enabled": True, "points": 8},
        "kcWidthLower":          {"enabled": True, "points": 6, "threshold": 0.10},
        "volumeDryUp":           {"enabled": True, "points": 8, "threshold": 0.10},
        "rsiHealthy":            {"enabled": True, "points": 5, "min": 50, "max": 75},
        "nearBreakout":          {"enabled": True, "points": 5},
        "breakoutConfirmed":     {"enabled": True, "points": 8},
        "anomalyFree":           {"enabled": True, "points": 4},
    },
}

PRESET_FILTERS: dict[str, dict[str, Any]] = {
    "Conservative": {"minScore": 70, "gradeFilter": ["A+ Confirmed", "A Watchlist"]},
    "Aggressive":   {"minScore": 40, "gradeFilter": GRADES[:-1]},
    "Breakout Only":{"minScore": 50, "gradeFilter": ["A+ Confirmed"]},
}


def to_yahoo_symbol(symbol: str, exchange: str) -> str:
    """Convert (symbol, exchange) to Yahoo Finance ticker."""
    raw = symbol.strip().upper().replace(" ", "")
    index_map = {
        "NIFTY": "^NSEI", "NIFTY50": "^NSEI",
        "BANKNIFTY": "^NSEBANK", "NIFTYBANK": "^NSEBANK",
        "SENSEX": "^BSESN",
    }
    if raw in index_map:
        return index_map[raw]
    if raw.startswith("^") or raw.endswith(".NS") or raw.endswith(".BO"):
        return raw
    ex = exchange.strip().upper()
    # NSE -> .NS, BSE -> .BO ; also accept NS/BO directly
    if ex in ("NSE", "NS"):
        suffix = "NS"
    elif ex in ("BSE", "BO"):
        suffix = "BO"
    else:
        suffix = ex
    return f"{raw}.{suffix}"


def alternate_exchange(exchange: str) -> str:
    ex = exchange.strip().upper()
    if ex in ("NSE", "NS"):
        return "BSE"
    return "NSE"