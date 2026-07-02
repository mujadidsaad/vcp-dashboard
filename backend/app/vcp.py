"""VCP contraction detection and scoring - Python port of lib/vcp.ts."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any

import numpy as np
import pandas as pd

from .indicators import sma, ema, atr, rsi, kc_width, rolling_mean, nan_median


@dataclass
class Contraction:
    retracement: float
    kcWidth: float
    volume: float
    startDate: str
    endDate: str


def _pct(value: float) -> str:
    if value is None or (isinstance(value, float) and (np.isnan(value) or not np.isfinite(value))):
        return ""
    return f"{value * 100:.1f}%"


def detect_contractions(bars: pd.DataFrame, max_contractions: int = 6, window: int = 120) -> list[Contraction]:
    """Detect pivot-based contractions in the last `window` bars."""
    recent = bars.tail(window).reset_index(drop=True)
    n = len(recent)
    if n < 5:
        return []

    highs = recent["high"].to_numpy(dtype="float64")
    lows = recent["low"].to_numpy(dtype="float64")
    closes = recent["close"].to_numpy(dtype="float64")
    volumes = recent["volume"].to_numpy(dtype="float64")

    atr_vals = atr(highs, lows, closes, 14)
    ema20 = ema(closes, 20)
    kc_vals = np.full(n, np.nan)
    for i in range(n):
        if not np.isnan(ema20[i]) and not np.isnan(atr_vals[i]) and ema20[i] > 0:
            kc_vals[i] = ((ema20[i] + 2 * atr_vals[i]) - (ema20[i] - 2 * atr_vals[i])) / ema20[i]

    # collect pivots (5-bar swing highs/lows)
    pivots: list[tuple[str, int, float]] = []
    for i in range(2, n - 2):
        if highs[i] == highs[i - 2:i + 3].max():
            pivots.append(("H", i, float(highs[i])))
        if lows[i] == lows[i - 2:i + 3].min():
            pivots.append(("L", i, float(lows[i])))

    contractions: list[Contraction] = []
    last_high: tuple[int, float] | None = None
    for kind, idx, value in pivots:
        if kind == "H":
            last_high = (idx, value)
        elif kind == "L" and last_high is not None and idx > last_high[0]:
            hi_idx, hi_val = last_high
            retracement = (hi_val - value) / hi_val if hi_val > 0 else float("nan")
            if 0.02 <= retracement <= 0.45:
                seg_kc = kc_vals[hi_idx:idx + 1]
                seg_kc = seg_kc[~np.isnan(seg_kc)]
                avg_kc = float(seg_kc.mean()) if seg_kc.size else float("nan")
                seg_vol = volumes[hi_idx:idx + 1]
                avg_vol = float(seg_vol.mean()) if seg_vol.size else 0.0
                start_ts = pd.Timestamp(recent.iloc[hi_idx]["date"])
                end_ts = pd.Timestamp(recent.iloc[idx]["date"])
                contractions.append(Contraction(
                    retracement=float(retracement),
                    kcWidth=avg_kc,
                    volume=avg_vol,
                    startDate=start_ts.strftime("%Y-%m-%d"),
                    endDate=end_ts.strftime("%Y-%m-%d"),
                ))
            last_high = None

    return contractions[-max_contractions:]


def grade_from_score(score: float, confirmed_breakout: bool, near_breakout: bool) -> str:
    if confirmed_breakout and score >= 80:
        return "A+ Confirmed"
    if score >= 80:
        return "A Watchlist"
    if score >= 65:
        return "B Watchlist" if near_breakout else "B Setup"
    if score >= 50:
        return "C Early Setup"
    return "Rejected"


def _empty_result(symbol: str, yahoo_symbol: str, reason: str = "Insufficient data") -> dict[str, Any]:
    return {
        "symbol": symbol, "yahooSymbol": yahoo_symbol,
        "analysisDate": "",
        "vcpScore": 0, "setupGrade": "Rejected",
        "vcp": False, "vcpSetup": False, "nearBreakout": False, "confirmedBreakout": False,
        "contractions": 0, "maxContraction": "", "latestContraction": "",
        "volatilityDecrease": "N/A",
        "distanceFromResistance": "", "distanceFrom52wHigh": "",
        "volumeDryUp": "",
        "adxStrength": False, "diBullish": False,
        "rsiValue": 0, "priceIncrease": "0%",
        "priceAboveMa50": False, "priceAboveMa200": False,
        "ema20AboveEma50": False, "ema50AboveEma200": False,
        "anomalyFree": False, "volumeContraction": False, "breakoutDetected": False,
        "rvol": 0, "strongStart": False,
        "reason": reason,
    }


def analyze_vcp(symbol: str, yahoo_symbol: str, bars: pd.DataFrame, filters: dict[str, Any]) -> dict[str, Any]:
    """Run the full VCP analysis. `bars` must be a DataFrame with
    columns: date, open, high, low, close, volume (chronological)."""
    if bars is None or bars.empty or len(bars) < filters.get("minBaseDuration", 30):
        return _empty_result(symbol, yahoo_symbol)

    df = bars.reset_index(drop=True)
    n = len(df)
    closes = df["close"].to_numpy(dtype="float64")
    highs = df["high"].to_numpy(dtype="float64")
    lows = df["low"].to_numpy(dtype="float64")
    volumes = df["volume"].to_numpy(dtype="float64")

    analysis_date = pd.Timestamp(df.iloc[-1]["date"]).strftime("%Y-%m-%d")

    ma50 = sma(closes, 50)
    ma200 = sma(closes, 200)
    ema20 = ema(closes, 20)
    ema50 = ema(closes, 50)
    ema200 = ema(closes, 200)
    atr_vals = atr(highs, lows, closes, 14)
    rsi_vals = rsi(closes, 14)
    kc_vals = kc_width(closes, highs, lows, 20)

    close = float(closes[-1])
    price_increase = (close - float(closes[0])) / float(closes[0]) if closes[0] != 0 else 0.0

    # -- RVOL (Relative Volume): today's volume / 20-bar SMA of volume (excluding today)
    if n >= 21:
        avg_vol_20 = float(np.nanmean(volumes[-21:-1]))
    elif n >= 2:
        avg_vol_20 = float(np.nanmean(volumes[:-1]))
    else:
        avg_vol_20 = float("nan")
    today_vol = float(volumes[-1]) if n >= 1 else float("nan")
    rvol_value = (
        today_vol / avg_vol_20
        if avg_vol_20 and avg_vol_20 > 0 and not np.isnan(avg_vol_20)
        else float("nan")
    )

    # -- Strong Start: today's open > previous close AND today's low >= previous close * 0.995
    if n >= 2:
        prev_close = float(closes[-2])
        today_open = float(df.iloc[-1]["open"])
        today_low = float(lows[-1])
        strong_start = (
            not np.isnan(prev_close)
            and prev_close > 0
            and today_open > prev_close
            and today_low >= prev_close * 0.995
        )
    else:
        strong_start = False

    contractions = detect_contractions(df)
    retracements = [c.retracement for c in contractions]
    kc_widths = [c.kcWidth for c in contractions]

    c_cfg = filters["checks"]
    contraction_count_ok = len(contractions) >= c_cfg["contractionCount"].get("min", 2)
    improving_steps = sum(
        1 for i, r in enumerate(retracements)
        if i > 0 and r <= retracements[i - 1] * 1.15
    )
    valid_contractions = contraction_count_ok and improving_steps >= max(1, len(retracements) - 2)
    kc_contraction = (
        len(kc_widths) >= 2
        and not np.isnan(kc_widths[-1])
        and kc_widths[-1] <= nan_median(kc_widths[:-1]) * 1.05
    )

    early_kc_start = max(0, n - 60)
    early_kc_end = max(0, n - 30)
    early_width = rolling_mean(kc_vals, early_kc_start, early_kc_end)
    recent_width = rolling_mean(kc_vals, n - 10, n)
    volatility_decrease = (
        early_width / recent_width - 1
        if not np.isnan(early_width) and recent_width and recent_width > 0
        else float("nan")
    )

    recent_vol_start = max(0, n - 10)
    prior_vol_start = max(0, n - 60)
    prior_vol_end = max(0, n - 10)
    recent_volume = rolling_mean(volumes, recent_vol_start, n)
    if prior_vol_end > prior_vol_start:
        prior_volume = rolling_mean(volumes, prior_vol_start, prior_vol_end)
    else:
        prior_volume = rolling_mean(volumes, 0, recent_vol_start)
    volume_dry_up_val = (
        1 - recent_volume / prior_volume if prior_volume and prior_volume > 0 else float("nan")
    )

    look_back_start = max(0, n - 20)
    resistance_slice = highs[look_back_start:n - 1] if n > look_back_start + 1 else highs[look_back_start:n]
    resistance = float(resistance_slice.max()) if resistance_slice.size else 0.0
    vol20 = rolling_mean(volumes, max(0, n - 20), n)
    volume_spike = volumes[-1] > vol20 * filters.get("volumeSpikeMultiplier", 1.5)
    dist_from_resistance = (resistance - close) / resistance if resistance > 0 else float("nan")
    high52w_slice = highs[max(0, n - 252):]
    high52w = float(high52w_slice.max()) if high52w_slice.size else 0.0
    dist_from_52w_high = (high52w - close) / high52w if high52w > 0 else float("nan")

    breakout_detected = bool(close > resistance and volume_spike)
    near_breakout = (
        (not np.isnan(dist_from_resistance) and dist_from_resistance <= filters.get("nearBreakoutPct", 0.05))
        or close > resistance
    )

    ma50_last = ma50[-1] if not np.isnan(ma50[-1]) else 0.0
    ma200_last = ma200[-1]
    above_ma50 = close > ma50_last
    above_ma200 = True if np.isnan(ma200_last) else close > ma200_last
    ema20v = ema20[-1] if not np.isnan(ema20[-1]) else 0.0
    ema50v = ema50[-1] if not np.isnan(ema50[-1]) else 0.0
    ema200v = ema200[-1]
    ema20_above_ema50 = close > 0 and ema20v > ema50v
    ema50_above_ema200 = True if np.isnan(ema200v) else ema50v > ema200v
    close_near_high = (
        not np.isnan(dist_from_52w_high)
        and dist_from_52w_high <= c_cfg["nearHigh"].get("threshold", 0.25)
    )
    rsi_value = float(rsi_vals[-1]) if not np.isnan(rsi_vals[-1]) else 0.0

    # anomaly detection (ATR & volume z-scores over last 50 bars)
    def _std_slice(arr: np.ndarray, size: int) -> float:
        s = arr[-size:]
        s = s[~np.isnan(s)]
        if s.size < 2:
            return float("nan")
        m = s.mean()
        return float(np.sqrt(((s - m) ** 2).mean()))

    atr_mean = rolling_mean(atr_vals, max(0, n - 50), n)
    atr_std = _std_slice(atr_vals, 50)
    vol_mean = rolling_mean(volumes, max(0, n - 50), n)
    vol_std = _std_slice(volumes, 50)
    atr_z = abs((atr_vals[-1] - atr_mean) / atr_std) if not np.isnan(atr_std) and atr_std > 0 else 0.0
    vol_z = abs((volumes[-1] - vol_mean) / vol_std) if not np.isnan(vol_std) and vol_std > 0 else 0.0
    anomaly_free = atr_z <= 3 and vol_z <= 3

    volume_contraction = (
        not np.isnan(volume_dry_up_val)
        and volume_dry_up_val >= c_cfg["volumeDryUp"].get("threshold", 0.10)
    )

    # -- weighted scoring
    checks: list[tuple[bool, bool, int, str]] = [
        (c_cfg["priorUptrend"]["enabled"],
         price_increase >= c_cfg["priorUptrend"].get("threshold", 0.15),
         c_cfg["priorUptrend"]["points"], "prior uptrend"),
        (c_cfg["aboveMa50"]["enabled"],       above_ma50,             c_cfg["aboveMa50"]["points"],       "above MA50"),
        (c_cfg["aboveMa200"]["enabled"],      above_ma200,            c_cfg["aboveMa200"]["points"],      "above MA200"),
        (c_cfg["ema20AboveEma50"]["enabled"], ema20_above_ema50,      c_cfg["ema20AboveEma50"]["points"], "EMA20 above EMA50"),
        (c_cfg["ema50AboveEma200"]["enabled"],ema50_above_ema200,     c_cfg["ema50AboveEma200"]["points"],"EMA50 above EMA200"),
        (c_cfg["nearHigh"]["enabled"],        close_near_high,        c_cfg["nearHigh"]["points"],        "near 52W high"),
        (c_cfg["contractionCount"]["enabled"],contraction_count_ok,   c_cfg["contractionCount"]["points"],"2+ contractions"),
        (c_cfg["contractionsImproving"]["enabled"], valid_contractions, c_cfg["contractionsImproving"]["points"], "contractions improving"),
        (c_cfg["kcContraction"]["enabled"],   kc_contraction,         c_cfg["kcContraction"]["points"],   "volatility tightening"),
        (c_cfg["kcWidthLower"]["enabled"],
         (not np.isnan(volatility_decrease) and volatility_decrease > c_cfg["kcWidthLower"].get("threshold", 0.10)),
         c_cfg["kcWidthLower"]["points"], "KC width lower"),
        (c_cfg["volumeDryUp"]["enabled"],     volume_contraction,     c_cfg["volumeDryUp"]["points"],     "volume drying"),
        (c_cfg["rsiHealthy"]["enabled"],
         c_cfg["rsiHealthy"].get("min", 50) <= rsi_value <= c_cfg["rsiHealthy"].get("max", 75),
         c_cfg["rsiHealthy"]["points"], "RSI healthy"),
        (c_cfg["nearBreakout"]["enabled"],    near_breakout,          c_cfg["nearBreakout"]["points"],    "near breakout"),
        (c_cfg["breakoutConfirmed"]["enabled"], breakout_detected,    c_cfg["breakoutConfirmed"]["points"], "breakout confirmed"),
        (c_cfg["anomalyFree"]["enabled"],     anomaly_free,           c_cfg["anomalyFree"]["points"],     "no extreme anomaly"),
    ]

    score = 0
    passed: list[str] = []
    failed: list[str] = []
    for enabled, result, points, label in checks:
        if not enabled:
            continue
        if result:
            score += points
            passed.append(label)
        else:
            failed.append(label)
    score = min(score, 100)

    vcp_setup = score >= 65 and contraction_count_ok and above_ma50 and bool(near_breakout)
    vcp = vcp_setup and breakout_detected
    grade = grade_from_score(score, vcp, bool(near_breakout))

    if vcp:
        reason = "Confirmed VCP breakout: " + ", ".join(passed[:6])
    elif vcp_setup:
        reason = "VCP watchlist: " + ", ".join(passed[:6])
    else:
        reason = "Rejected or early: missing " + ", ".join(failed[:5])

    return {
        "symbol": symbol,
        "yahooSymbol": yahoo_symbol,
        "analysisDate": analysis_date,
        "vcpScore": int(score),
        "setupGrade": grade,
        "vcp": bool(vcp),
        "vcpSetup": bool(vcp_setup),
        "nearBreakout": bool(near_breakout),
        "confirmedBreakout": bool(breakout_detected),
        "contractions": len(contractions),
        "maxContraction": _pct(max(retracements)) if retracements else "",
        "latestContraction": _pct(retracements[-1]) if retracements else "",
        "volatilityDecrease": _pct(volatility_decrease),
        "distanceFromResistance": _pct(dist_from_resistance),
        "distanceFrom52wHigh": _pct(dist_from_52w_high),
        "volumeDryUp": _pct(volume_dry_up_val),
        "adxStrength": False,
        "diBullish": False,
        "rsiValue": round(rsi_value * 10) / 10,
        "priceIncrease": _pct(price_increase),
        "priceAboveMa50": bool(above_ma50),
        "priceAboveMa200": bool(above_ma200),
        "ema20AboveEma50": bool(ema20_above_ema50),
        "ema50AboveEma200": bool(ema50_above_ema200),
        "anomalyFree": bool(anomaly_free),
        "volumeContraction": bool(volume_contraction),
        "breakoutDetected": bool(breakout_detected),
        "rvol": (round(rvol_value, 2) if not np.isnan(rvol_value) else 0),
        "strongStart": bool(strong_start),
        "reason": reason,
        "contractionsList": [asdict(c) for c in contractions],
    }
