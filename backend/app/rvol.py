"""RVOL (Relative Volume) screener - port of the 'Strong Start RVOL Dashboard' Pine v6 script.

Per-symbol daily metrics:
    avg_vol   = SMA(volume[-lookback-1 : -1], lookback)   # prior N days, excludes today
    rvol      = today_volume / avg_vol
    rvol_pct  = rvol * 100
    chg_pct   = (close - prev_close) / prev_close * 100
    strong_start = today.open > prev_close AND today.low >= prev_close * 0.995

The Pine script always runs on daily data ("1D"), so this module does too.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

SS_LOWMULT = 0.995  # day low must hold >= prev_close * this


def _empty(symbol: str, yahoo_symbol: str, reason: str = "Insufficient data") -> dict[str, Any]:
    return {
        "symbol": symbol,
        "yahooSymbol": yahoo_symbol,
        "analysisDate": "",
        "close": 0.0,
        "prevClose": 0.0,
        "open": 0.0,
        "low": 0.0,
        "high": 0.0,
        "volume": 0.0,
        "avgVolume": 0.0,
        "rvol": 0.0,
        "rvolPct": 0.0,
        "chgPct": 0.0,
        "strongStart": False,
        "reason": reason,
    }


def analyze_rvol(
    symbol: str,
    yahoo_symbol: str,
    bars: pd.DataFrame,
    lookback: int = 20,
) -> dict[str, Any]:
    """Compute RVOL, Chg%, StrongStart for the latest daily bar of `bars`.

    `bars` is expected to be daily OHLCV (chronological), columns:
    date, open, high, low, close, volume.
    """
    if bars is None or bars.empty:
        return _empty(symbol, yahoo_symbol, "No data")

    df = bars.reset_index(drop=True)
    n = len(df)
    if n < 2:
        return _empty(symbol, yahoo_symbol, "Need >= 2 bars")

    volumes = df["volume"].to_numpy(dtype="float64")
    closes = df["close"].to_numpy(dtype="float64")
    opens = df["open"].to_numpy(dtype="float64")
    lows = df["low"].to_numpy(dtype="float64")
    highs = df["high"].to_numpy(dtype="float64")

    today_vol = float(volumes[-1])
    today_close = float(closes[-1])
    today_open = float(opens[-1])
    today_low = float(lows[-1])
    today_high = float(highs[-1])
    prev_close = float(closes[-2])

    # Average of prior N completed days (exclude today)
    if n >= lookback + 1:
        prior = volumes[-lookback - 1 : -1]
    else:
        prior = volumes[:-1]
    prior = prior[~np.isnan(prior)]
    avg_vol = float(prior.mean()) if prior.size else float("nan")

    rvol = today_vol / avg_vol if avg_vol and avg_vol > 0 and not np.isnan(avg_vol) else float("nan")
    chg_pct = (
        (today_close - prev_close) / prev_close * 100
        if prev_close and prev_close > 0
        else float("nan")
    )
    strong_start = bool(
        prev_close > 0
        and today_open > prev_close
        and today_low >= prev_close * SS_LOWMULT
    )

    analysis_date = pd.Timestamp(df.iloc[-1]["date"]).strftime("%Y-%m-%d")

    def _f(v: float) -> float:
        return 0.0 if v is None or (isinstance(v, float) and (np.isnan(v) or not np.isfinite(v))) else float(v)

    return {
        "symbol": symbol,
        "yahooSymbol": yahoo_symbol,
        "analysisDate": analysis_date,
        "close": _f(today_close),
        "prevClose": _f(prev_close),
        "open": _f(today_open),
        "low": _f(today_low),
        "high": _f(today_high),
        "volume": _f(today_vol),
        "avgVolume": _f(avg_vol),
        "rvol": round(_f(rvol), 4),
        "rvolPct": round(_f(rvol) * 100, 2),
        "chgPct": round(_f(chg_pct), 2),
        "strongStart": strong_start,
        "reason": "",
    }