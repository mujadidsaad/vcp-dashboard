"""Minervini Trend Template + Weinstein Stage Analyzer.

Python port of the Pine v6 script "Minervini Trend Template — Stage Analyzer".

8 rules (all evaluated on daily bars):
    c1  close > SMA150 AND close > SMA200
    c2  SMA150 > SMA200
    c3  SMA200 rising (SMA200 today > SMA200 21 bars ago)
    c4  SMA50 > SMA150 AND SMA50 > SMA200        (full MA stack)
    c5  close > SMA50
    c6  close >= 52w_low * 1.30                  (>=30% above 52w low)
    c7  close >= 52w_high * 0.75                 (within 25% of 52w high)
    c8  stock's 126-bar return > benchmark's 126-bar return

Score = number of passing rules (0..8).

Stage classification:
    score >= 7 AND c1 AND c2 AND c3              -> Stage 2 (advance)
    close < SMA200 AND SMA200 < SMA200[21]*0.998 -> Stage 4 (decline)
    close > SMA200 AND SMA200 not rising         -> Stage 3 (topping)
    otherwise                                    -> Stage 1 (base / transitional)

The `benchmark_return_126d` parameter is the 6-month return of the benchmark
index (e.g. Nifty 50); it's computed once per scan by the endpoint and reused
for every symbol so we don't refetch the benchmark for each stock.
"""
from __future__ import annotations

from typing import Any, Optional

import numpy as np
import pandas as pd

from .indicators import sma

LOOKBACK_6M_BARS = 126     # ~6 months of trading days
MA200_LAG_BARS = 21        # SMA200 must be rising vs 21 bars ago
YEAR_BARS = 252            # 52-week window
MA200_FLAT_BUFFER = 0.998  # tolerance for "truly falling" MA200


def _f(v: float) -> float:
    """Round-trip a scalar into a JSON-safe float (NaN/Inf -> 0.0)."""
    if v is None:
        return 0.0
    if isinstance(v, float) and (np.isnan(v) or not np.isfinite(v)):
        return 0.0
    return float(v)


def _empty(symbol: str, yahoo_symbol: str, reason: str = "Insufficient data") -> dict[str, Any]:
    return {
        "symbol": symbol,
        "yahooSymbol": yahoo_symbol,
        "analysisDate": "",
        "stage": 0,       # 0 = no data
        "score": 0,
        "close": 0.0,
        "sma50": 0.0,
        "sma150": 0.0,
        "sma200": 0.0,
        "sma200_21ago": 0.0,
        "high52w": 0.0,
        "low52w": 0.0,
        "return6m": 0.0,
        "benchmarkReturn6m": 0.0,
        "rsVsBench": 0.0,
        "c1_aboveMa150_200": False,
        "c2_ma150AboveMa200": False,
        "c3_ma200Rising": False,
        "c4_ma50AboveMa150_200": False,
        "c5_aboveMa50": False,
        "c6_above30PctFromLow": False,
        "c7_within25PctOfHigh": False,
        "c8_beatsBenchmark": False,
        "reason": reason,
    }


def compute_return_6m(bars: pd.DataFrame) -> float:
    """6-month return of a symbol given its daily bars. NaN if not enough data."""
    if bars is None or bars.empty:
        return float("nan")
    closes = bars["close"].to_numpy(dtype="float64")
    n = closes.size
    if n <= LOOKBACK_6M_BARS or closes[-1 - LOOKBACK_6M_BARS] <= 0:
        return float("nan")
    return float((closes[-1] - closes[-1 - LOOKBACK_6M_BARS]) / closes[-1 - LOOKBACK_6M_BARS])


def analyze_trend_template(
    symbol: str,
    yahoo_symbol: str,
    bars: pd.DataFrame,
    benchmark_return_126d: Optional[float] = None,
) -> dict[str, Any]:
    """Run the 8-rule Minervini Trend Template + Stage classification.

    Args:
        symbol: display symbol (e.g. "RELIANCE")
        yahoo_symbol: Yahoo Finance ticker (e.g. "RELIANCE.NS")
        bars: daily OHLCV DataFrame, chronological, with columns:
              date, open, high, low, close, volume.
        benchmark_return_126d: 6-month return of the benchmark, decimal
              (e.g. 0.10 == +10%). If None, rule c8 is False.
    """
    if bars is None or bars.empty:
        return _empty(symbol, yahoo_symbol, "No data")

    df = bars.reset_index(drop=True)
    n = len(df)
    if n < 30:
        return _empty(symbol, yahoo_symbol, "Need >= 30 bars")

    closes = df["close"].to_numpy(dtype="float64")
    highs = df["high"].to_numpy(dtype="float64")
    lows = df["low"].to_numpy(dtype="float64")

    sma50 = sma(closes, 50)
    sma150 = sma(closes, 150)
    sma200 = sma(closes, 200)

    close = float(closes[-1])
    ma50 = float(sma50[-1]) if not np.isnan(sma50[-1]) else float("nan")
    ma150 = float(sma150[-1]) if not np.isnan(sma150[-1]) else float("nan")
    ma200 = float(sma200[-1]) if not np.isnan(sma200[-1]) else float("nan")

    if n > MA200_LAG_BARS and not np.isnan(sma200[-1 - MA200_LAG_BARS]):
        ma200_old = float(sma200[-1 - MA200_LAG_BARS])
    else:
        ma200_old = float("nan")

    window = min(n, YEAR_BARS)
    high52w = float(np.nanmax(highs[-window:]))
    low52w = float(np.nanmin(lows[-window:]))

    if n > LOOKBACK_6M_BARS and closes[-1 - LOOKBACK_6M_BARS] > 0:
        stock_ret_6m = (close - float(closes[-1 - LOOKBACK_6M_BARS])) / float(closes[-1 - LOOKBACK_6M_BARS])
    else:
        stock_ret_6m = float("nan")

    bench_ret_6m = (
        float(benchmark_return_126d)
        if benchmark_return_126d is not None and not np.isnan(benchmark_return_126d)
        else float("nan")
    )

    # ---- 8 rules -----------------------------------------------------------
    c1 = bool(not np.isnan(ma150) and not np.isnan(ma200) and close > ma150 and close > ma200)
    c2 = bool(not np.isnan(ma150) and not np.isnan(ma200) and ma150 > ma200)
    c3 = bool(not np.isnan(ma200) and not np.isnan(ma200_old) and ma200 > ma200_old)
    c4 = bool(
        not np.isnan(ma50) and not np.isnan(ma150) and not np.isnan(ma200)
        and ma50 > ma150 and ma50 > ma200
    )
    c5 = bool(not np.isnan(ma50) and close > ma50)
    c6 = bool(low52w > 0 and close >= low52w * 1.30)
    c7 = bool(high52w > 0 and close >= high52w * 0.75)
    c8 = bool(
        not np.isnan(stock_ret_6m)
        and not np.isnan(bench_ret_6m)
        and stock_ret_6m > bench_ret_6m
    )

    score = int(c1) + int(c2) + int(c3) + int(c4) + int(c5) + int(c6) + int(c7) + int(c8)

    # ---- Stage classification --------------------------------------------
    ma200_rising = (not np.isnan(ma200) and not np.isnan(ma200_old) and ma200 > ma200_old)
    ma200_falling = (
        not np.isnan(ma200)
        and not np.isnan(ma200_old)
        and ma200 < ma200_old * MA200_FLAT_BUFFER
    )

    if score >= 7 and c1 and c2 and c3:
        stage = 2
    elif not np.isnan(ma200) and close < ma200 and ma200_falling:
        stage = 4
    elif not np.isnan(ma200) and close > ma200 and not ma200_rising:
        stage = 3
    else:
        stage = 1

    analysis_date = pd.Timestamp(df.iloc[-1]["date"]).strftime("%Y-%m-%d")

    rs_vs_bench = (
        stock_ret_6m - bench_ret_6m
        if not np.isnan(stock_ret_6m) and not np.isnan(bench_ret_6m)
        else float("nan")
    )

    return {
        "symbol": symbol,
        "yahooSymbol": yahoo_symbol,
        "analysisDate": analysis_date,
        "stage": int(stage),
        "score": int(score),
        "close": _f(close),
        "sma50": _f(ma50),
        "sma150": _f(ma150),
        "sma200": _f(ma200),
        "sma200_21ago": _f(ma200_old),
        "high52w": _f(high52w),
        "low52w": _f(low52w),
        "return6m": _f(stock_ret_6m),
        "benchmarkReturn6m": _f(bench_ret_6m),
        "rsVsBench": _f(rs_vs_bench),
        "c1_aboveMa150_200": c1,
        "c2_ma150AboveMa200": c2,
        "c3_ma200Rising": c3,
        "c4_ma50AboveMa150_200": c4,
        "c5_aboveMa50": c5,
        "c6_above30PctFromLow": c6,
        "c7_within25PctOfHigh": c7,
        "c8_beatsBenchmark": c8,
        "reason": "",
    }