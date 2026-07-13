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


class SingleScanRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    timeframe: str = "1d"
    filters: Optional[Dict[str, Any]] = None


class RvolScanRequest(BaseModel):
    symbols: List[StockRow]
    lookback: int = 20


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
