"""Master screener — fuses Trend Template + VCP + RVOL for one symbol.

Runs all three analyzers against a single daily-bar DataFrame so we don't
triple-hit Yahoo Finance. Produces one combined result per symbol including
a computed `verdict` label that tells the user, at a glance, whether the
stock is Ready To Trade / Watchlist / Setup / Hold / Skip.

Verdict rules (defaults; overridable per-scan via MasterConfig)
---------------------------------------------------------------
"READY TO TRADE"   Stage 2 AND VCP grade in {A+ Confirmed, A Watchlist,
                   B Watchlist} AND RVOL >= 1.5 AND chgPct > 0.
                   (Strong Start bumps confidence but isn't required.)

"WATCHLIST"        Stage 2 AND VCP grade in {A+ Confirmed, A Watchlist,
                   B Watchlist, B Setup} AND RVOL >= 1.0.

"SETUP FORMING"    Stage in {1, 2} AND VCP grade in {B Watchlist, B Setup,
                   C Early Setup}. RVOL not required.

"HOLD OFF"         Stage == 3 (topping). Even a strong VCP is discounted here.

"SKIP"             Everything else (Stage 4 decline, VCP Rejected, or no data).
"""
from __future__ import annotations

from typing import Any, Optional

import pandas as pd

from .config import DEFAULT_FILTERS
from .rvol import analyze_rvol
from .trend_template import analyze_trend_template
from .vcp import analyze_vcp

# Verdict labels. Frontend uses these strings directly for badge colours.
VERDICT_READY     = "READY TO TRADE"
VERDICT_WATCHLIST = "WATCHLIST"
VERDICT_SETUP     = "SETUP FORMING"
VERDICT_HOLD      = "HOLD OFF"
VERDICT_SKIP      = "SKIP"

# Precedence used for sorting (higher = more actionable / higher on the list).
VERDICT_RANK: dict[str, int] = {
    VERDICT_READY:     100,
    VERDICT_WATCHLIST:  80,
    VERDICT_SETUP:      60,
    VERDICT_HOLD:       40,
    VERDICT_SKIP:       20,
}

READY_GRADES     = {"A+ Confirmed", "A Watchlist", "B Watchlist"}
WATCHLIST_GRADES = READY_GRADES | {"B Setup"}
SETUP_GRADES     = {"B Watchlist", "B Setup", "C Early Setup"}


def _empty(symbol: str, yahoo_symbol: str, reason: str = "No data") -> dict[str, Any]:
    return {
        "symbol": symbol,
        "yahooSymbol": yahoo_symbol,
        "analysisDate": "",
        "verdict": VERDICT_SKIP,
        "verdictRank": VERDICT_RANK[VERDICT_SKIP],
        "reason": reason,
        # Nested payloads for details on hover / drill-in
        "trend": None,
        "vcp": None,
        "rvol": None,
        # Flat convenience fields (used for table columns + sorting)
        "stage": 0,
        "trendScore": 0,
        "vcpGrade": "",
        "vcpScore": 0,
        "rvolValue": 0.0,
        "chgPct": 0.0,
        "strongStart": False,
        "close": 0.0,
        "rsVsBench": 0.0,
    }


def _classify_verdict(trend: dict, vcp: dict, rvol: dict, cfg: dict) -> str:
    """Compute the verdict label from the three analyzer payloads."""
    stage = int(trend.get("stage", 0))
    grade = vcp.get("setupGrade", "")
    rvol_val = float(rvol.get("rvol", 0.0) or 0.0)
    chg = float(rvol.get("chgPct", 0.0) or 0.0)
    ss = bool(rvol.get("strongStart", False))

    ready_rvol     = float(cfg.get("readyRvol",     1.5))
    watchlist_rvol = float(cfg.get("watchlistRvol", 1.0))
    require_ss     = bool(cfg.get("requireStrongStart", False))

    # 1. Hard skip: no data or Stage 4 or VCP Rejected
    if stage == 0 or stage == 4 or grade == "Rejected" or grade == "":
        return VERDICT_SKIP

    # 2. HOLD OFF — Stage 3 topping regardless of VCP
    if stage == 3:
        return VERDICT_HOLD

    # 3. READY — Stage 2 with a real breakout signal
    if (
        stage == 2
        and grade in READY_GRADES
        and rvol_val >= ready_rvol
        and chg > 0
        and (ss or not require_ss)
    ):
        return VERDICT_READY

    # 4. WATCHLIST — Stage 2 near-breakout with normal-ish volume
    if stage == 2 and grade in WATCHLIST_GRADES and rvol_val >= watchlist_rvol:
        return VERDICT_WATCHLIST

    # 5. SETUP — base/uptrend with a VCP forming
    if stage in (1, 2) and grade in SETUP_GRADES:
        return VERDICT_SETUP

    return VERDICT_SKIP


def analyze_master(
    symbol: str,
    yahoo_symbol: str,
    bars: pd.DataFrame,
    benchmark_return_126d: Optional[float] = None,
    config: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Fuse Trend Template + VCP + RVOL for one symbol using the same daily bars.

    Args:
        symbol / yahoo_symbol: identifiers passed through to each analyzer.
        bars: chronological daily OHLCV DataFrame.
        benchmark_return_126d: 6-month return of the benchmark index (decimal).
        config: optional overrides:
                {
                  "readyRvol":     1.5,   # min RVOL to reach READY
                  "watchlistRvol": 1.0,   # min RVOL to reach WATCHLIST
                  "requireStrongStart": False,   # if True, READY requires SS
                  "vcpFilters":    DEFAULT_FILTERS,
                  "rvolLookback":  20,
                }
    """
    cfg = config or {}

    if bars is None or bars.empty:
        return _empty(symbol, yahoo_symbol, "No data")

    df = bars.reset_index(drop=True)
    if len(df) < 30:
        return _empty(symbol, yahoo_symbol, "Need >= 30 bars")

    vcp_filters = cfg.get("vcpFilters") or DEFAULT_FILTERS
    rvol_lookback = int(cfg.get("rvolLookback", 20))

    trend = analyze_trend_template(symbol, yahoo_symbol, df, benchmark_return_126d)
    vcp = analyze_vcp(symbol, yahoo_symbol, df, vcp_filters)
    rvol = analyze_rvol(symbol, yahoo_symbol, df, rvol_lookback)

    verdict = _classify_verdict(trend, vcp, rvol, cfg)
    analysis_date = trend.get("analysisDate") or vcp.get("analysisDate") or rvol.get("analysisDate") or ""

    # Build a short human-readable reason for the verdict.
    reason_parts: list[str] = []
    stage = int(trend.get("stage", 0))
    if stage:
        reason_parts.append(f"Stage {stage}")
    if vcp.get("setupGrade"):
        reason_parts.append(f"VCP {vcp['setupGrade']}")
    if rvol.get("rvol"):
        reason_parts.append(f"RVOL {rvol['rvol']:.2f}x")
    if rvol.get("chgPct"):
        reason_parts.append(f"Chg {rvol['chgPct']:+.2f}%")
    reason = " · ".join(reason_parts) if reason_parts else "insufficient signal"

    return {
        "symbol": symbol,
        "yahooSymbol": yahoo_symbol,
        "analysisDate": analysis_date,
        "verdict": verdict,
        "verdictRank": VERDICT_RANK[verdict],
        "reason": reason,
        # Nested payloads
        "trend": trend,
        "vcp": vcp,
        "rvol": rvol,
        # Flat convenience fields for the table
        "stage": stage,
        "trendScore": int(trend.get("score", 0)),
        "vcpGrade": vcp.get("setupGrade", ""),
        "vcpScore": int(vcp.get("vcpScore", 0)),
        "rvolValue": float(rvol.get("rvol", 0.0) or 0.0),
        "chgPct": float(rvol.get("chgPct", 0.0) or 0.0),
        "strongStart": bool(rvol.get("strongStart", False)),
        "close": float(rvol.get("close", 0.0) or 0.0),
        "rsVsBench": float(trend.get("rsVsBench", 0.0) or 0.0),
    }