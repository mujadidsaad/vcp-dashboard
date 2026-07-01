"""Yahoo Finance data source using yfinance with a curl_cffi session
for TLS fingerprinting - avoids Yahoo's aggressive edge rate limiting."""
from __future__ import annotations

import time
import pandas as pd
import yfinance as yf

from .config import TIMEFRAME_TO_YF
from .indicators import aggregate_4h

# Shared curl_cffi session with a real-Chrome TLS fingerprint. yfinance detects
# and uses it automatically. Reusing one session keeps cookies + crumb warm.
try:
    from curl_cffi import requests as _cf_requests   # type: ignore
    _SESSION = _cf_requests.Session(impersonate="chrome")
except Exception:
    _SESSION = None  # fallback to yfinance's default


def _empty() -> pd.DataFrame:
    return pd.DataFrame(columns=["date", "open", "high", "low", "close", "volume"])


def fetch_bars(yahoo_symbol: str, timeframe: str, retries: int = 2) -> pd.DataFrame:
    """Fetch OHLCV bars for a Yahoo symbol at the requested timeframe.

    Returns a DataFrame with columns: date, open, high, low, close, volume
    in chronological order. Returns empty DataFrame on failure.
    Retries once with a short backoff if the first response is empty.
    """
    params = TIMEFRAME_TO_YF.get(timeframe) or TIMEFRAME_TO_YF["1d"]
    interval = params["interval"]
    period = params["period"]

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            ticker = yf.Ticker(yahoo_symbol, session=_SESSION) if _SESSION else yf.Ticker(yahoo_symbol)
            raw = ticker.history(
                interval=interval,
                period=period,
                auto_adjust=False,
                actions=False,
                raise_errors=False,
            )
            if raw is not None and not raw.empty:
                break
        except Exception as e:
            last_error = e
        # Backoff before retry
        if attempt < retries:
            time.sleep(0.8 * (attempt + 1))
    else:
        raw = None

    if raw is None or raw.empty:
        return _empty()

    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)

    df = raw.reset_index().rename(columns={
        "Date": "date", "Datetime": "date",
        "Open": "open", "High": "high", "Low": "low",
        "Close": "close", "Adj Close": "adj_close",
        "Volume": "volume",
    })
    if "date" not in df.columns and "index" in df.columns:
        df = df.rename(columns={"index": "date"})

    keep = ["date", "open", "high", "low", "close", "volume"]
    df = df[[c for c in keep if c in df.columns]].copy()
    df = df.dropna(subset=["open", "high", "low", "close", "volume"])
    df = df[df["volume"] > 0].reset_index(drop=True)

    if timeframe == "4h" and not df.empty:
        df = aggregate_4h(df)

    return df