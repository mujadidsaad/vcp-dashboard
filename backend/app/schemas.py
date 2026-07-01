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
