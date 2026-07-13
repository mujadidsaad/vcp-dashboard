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


def slice_to_date(bars: pd.DataFrame, as_of: str | None) -> pd.DataFrame:
    """Return a copy of `bars` keeping only rows where `date <= as_of`.

    Used by the "backtest" feature — it lets us re-run any screener as if the
    scan were happening on `as_of` (a YYYY-MM-DD date). If `as_of` is None,
    empty, or invalid, the original DataFrame is returned unchanged.
    """
    if bars is None or bars.empty or not as_of:
        return bars
    try:
        cutoff = pd.Timestamp(as_of)
    except Exception:
        return bars
    if "date" not in bars.columns:
        return bars

    # Normalise both sides to timezone-naive dates for a robust comparison,
    # since yfinance returns tz-aware timestamps for some intervals.
    dates = pd.to_datetime(bars["date"], errors="coerce")
    try:
        dates = dates.dt.tz_localize(None)
    except (AttributeError, TypeError):
        pass
    try:
        cutoff = cutoff.tz_localize(None)
    except (AttributeError, TypeError):
        pass

    mask = dates <= cutoff
    return bars.loc[mask].reset_index(drop=True)
