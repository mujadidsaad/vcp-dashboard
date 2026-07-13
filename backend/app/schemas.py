"""Pydantic schemas for API requests/responses."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StockRow(BaseModel):
    symbol: str
    exchange: str


class ScanRequest(BaseModel):
    symbols: List[StockRow]
    filters: Dict[str, Any] = Field(default_factory=dict)
    timeframe: str = "1d"
    # Optional YYYY-MM-DD backtest cutoff — see docs at slice_to_date().
    asOf: Optional[str] = None


class SingleScanRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    timeframe: str = "1d"
    filters: Optional[Dict[str, Any]] = None
    asOf: Optional[str] = None


class RvolScanRequest(BaseModel):
    symbols: List[StockRow]
    lookback: int = 20
    asOf: Optional[str] = None


class TrendTemplateScanRequest(BaseModel):
    """Request body for POST /api/scan/trend-template.

    The benchmark is fetched once server-side and its 6-month return is reused
    for every symbol in this scan (matching the Pine reference).
    """
    symbols: List[StockRow]
    # Benchmark ticker to compare relative strength against.
    # Accepts either a Yahoo ticker (e.g. "^NSEI") or a plain symbol+exchange.
    benchmarkSymbol: str = "^NSEI"
    benchmarkExchange: str = "NSE"
    asOf: Optional[str] = None


class MasterScanRequest(BaseModel):
    """Request body for POST /api/scan/master.

    Runs Trend Template + VCP + RVOL against the SAME daily bars per symbol
    so we don't triple-hit Yahoo. Returns one combined result with a
    computed `verdict` label.
    """
    symbols: List[StockRow]
    benchmarkSymbol: str = "^NSEI"
    benchmarkExchange: str = "NSE"
    # RVOL lookback window (days). Matches RvolScanRequest default.
    rvolLookback: int = 20
    # Verdict thresholds — see backend/app/master.py for what they mean.
    readyRvol: float = 1.5
    watchlistRvol: float = 1.0
    requireStrongStart: bool = False
    # Optional VCP filter overrides. If None the backend DEFAULT_FILTERS is used.
    vcpFilters: Optional[Dict[str, Any]] = None
    # Optional YYYY-MM-DD backtest cutoff. When set, all analyzers see only
    # bars up to and including this date.
    asOf: Optional[str] = None
