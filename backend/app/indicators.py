"""Technical indicators - Python port of lib/indicators.ts.

All functions accept and return numpy arrays; NaN represents undefined values.
Semantics match the TypeScript reference closely.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def sma(values: np.ndarray, period: int) -> np.ndarray:
    """Simple moving average with min_periods = max(2, period//2)."""
    s = pd.Series(values, dtype="float64")
    min_p = max(2, period // 2)
    return s.rolling(window=period, min_periods=min_p).mean().to_numpy()


def ema(values: np.ndarray, period: int) -> np.ndarray:
    """Exponential moving average.

    Mirrors the TS implementation: waits until min_periods observations
    then seeds with the running mean, and applies standard EMA smoothing.
    """
    v = np.asarray(values, dtype="float64")
    n = v.size
    out = np.full(n, np.nan)
    min_p = max(2, period // 2)
    k = 2.0 / (period + 1)

    prev = np.nan
    count = 0
    sum_init = 0.0
    for i in range(n):
        x = v[i]
        if not np.isnan(x):
            count += 1
            sum_init += x
            if count >= min_p:
                if np.isnan(prev):
                    prev = sum_init / count
                else:
                    prev = x * k + prev * (1 - k)
                out[i] = prev
    return out


def true_range(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> np.ndarray:
    h = np.asarray(highs, dtype="float64")
    l = np.asarray(lows, dtype="float64")
    c = np.asarray(closes, dtype="float64")
    n = h.size
    tr = np.full(n, np.nan)
    for i in range(1, n):
        hl = h[i] - l[i]
        hc = abs(h[i] - c[i - 1])
        lc = abs(l[i] - c[i - 1])
        tr[i] = max(hl, hc, lc)
    return tr


def atr(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int) -> np.ndarray:
    """Average True Range using SMA of TR (matches TS reference)."""
    tr = true_range(highs, lows, closes)
    return sma(tr, period)


def rsi(closes: np.ndarray, period: int) -> np.ndarray:
    c = np.asarray(closes, dtype="float64")
    n = c.size
    out = np.full(n, np.nan)
    min_p = max(2, period // 2)

    gains = np.full(n, np.nan)
    losses = np.full(n, np.nan)
    for i in range(1, n):
        d = c[i] - c[i - 1]
        gains[i] = d if d > 0 else 0.0
        losses[i] = -d if d < 0 else 0.0

    avg_gain = sma(gains, period)
    avg_loss = sma(losses, period)

    for i in range(n):
        if not np.isnan(avg_gain[i]) and not np.isnan(avg_loss[i]) and i >= min_p:
            if avg_loss[i] == 0:
                out[i] = 100.0
                continue
            rs = avg_gain[i] / avg_loss[i]
            out[i] = 100.0 - 100.0 / (1.0 + rs)
    return out


def kc_width(closes: np.ndarray, highs: np.ndarray, lows: np.ndarray, period: int = 20) -> np.ndarray:
    """Keltner Channel width normalised by the EMA basis."""
    atr_vals = atr(highs, lows, closes, period)
    ema_vals = ema(closes, period)
    n = closes.size
    out = np.full(n, np.nan)
    for i in range(n):
        if not np.isnan(ema_vals[i]) and not np.isnan(atr_vals[i]) and ema_vals[i] > 0:
            upper = ema_vals[i] + 2 * atr_vals[i]
            lower = ema_vals[i] - 2 * atr_vals[i]
            out[i] = (upper - lower) / ema_vals[i]
    return out


def rolling_mean(values: np.ndarray, start: int, end: int) -> float:
    """Mean over values[start:end], ignoring NaNs. Returns NaN if empty."""
    if end <= start:
        return float("nan")
    seg = np.asarray(values[start:end], dtype="float64")
    seg = seg[~np.isnan(seg)]
    if seg.size == 0:
        return float("nan")
    return float(seg.mean())


def nan_median(values: np.ndarray | list[float]) -> float:
    arr = np.asarray(list(values), dtype="float64")
    arr = arr[~np.isnan(arr)]
    if arr.size == 0:
        return float("nan")
    return float(np.median(arr))


def aggregate_4h(bars_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate consecutive rows into 4-bar groups (mirrors TS aggregate4hr)."""
    if bars_df.empty:
        return bars_df
    df = bars_df.reset_index(drop=True).copy()
    df["_grp"] = df.index // 4
    agg = df.groupby("_grp").agg(
        date=("date", "first"),
        open=("open", "first"),
        high=("high", "max"),
        low=("low", "min"),
        close=("close", "last"),
        volume=("volume", "sum"),
    ).reset_index(drop=True)
    return agg