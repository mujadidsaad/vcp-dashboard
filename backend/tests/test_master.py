"""Tests for the master screener that fuses Trend Template + VCP + RVOL."""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.master import (
    VERDICT_HOLD,
    VERDICT_READY,
    VERDICT_SETUP,
    VERDICT_SKIP,
    VERDICT_WATCHLIST,
    _classify_verdict,
    analyze_master,
)


# ---------- helpers ----------------------------------------------------------

def _bars(closes, opens=None, highs=None, lows=None, volumes=None):
    n = len(closes)
    dates = pd.date_range("2024-01-01", periods=n, freq="D")
    if opens is None:
        opens = closes
    if lows is None:
        lows = [min(o, c) for o, c in zip(opens, closes)]
    if highs is None:
        highs = [max(o, c) for o, c in zip(opens, closes)]
    if volumes is None:
        volumes = [1_000_000] * n
    return pd.DataFrame({
        "date": dates,
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "volume": volumes,
    })


def _uptrend(n=260, start=50.0, end=150.0, seed=42):
    rng = np.random.default_rng(seed)
    base = np.linspace(start, end, n)
    noise = rng.normal(0, 0.5, n)
    return list(base + noise)


def _downtrend(n=260, start=150.0, end=60.0, seed=7):
    rng = np.random.default_rng(seed)
    base = np.linspace(start, end, n)
    noise = rng.normal(0, 0.5, n)
    return list(base + noise)


# ---------- _classify_verdict pure-logic tests ------------------------------

def _stub_trend(stage: int, score: int = 8):
    return {"stage": stage, "score": score, "rsVsBench": 0.1, "analysisDate": "2026-07-01"}

def _stub_vcp(grade: str, score: int = 70):
    return {"setupGrade": grade, "vcpScore": score, "analysisDate": "2026-07-01"}

def _stub_rvol(rvol: float, chg: float, ss: bool = False):
    return {
        "rvol": rvol,
        "rvolPct": rvol * 100,
        "chgPct": chg,
        "strongStart": ss,
        "close": 100.0,
        "analysisDate": "2026-07-01",
    }


def test_verdict_ready_when_stage2_a_grade_high_rvol_up_day():
    assert (
        _classify_verdict(_stub_trend(2), _stub_vcp("A+ Confirmed"), _stub_rvol(2.0, 3.0), {})
        == VERDICT_READY
    )


def test_verdict_watchlist_when_stage2_b_setup_normal_rvol():
    assert (
        _classify_verdict(_stub_trend(2), _stub_vcp("B Setup"), _stub_rvol(1.1, 0.5), {})
        == VERDICT_WATCHLIST
    )


def test_verdict_setup_when_stage1_c_early_setup():
    assert (
        _classify_verdict(_stub_trend(1), _stub_vcp("C Early Setup"), _stub_rvol(0.8, 0.0), {})
        == VERDICT_SETUP
    )


def test_verdict_hold_when_stage3_even_with_strong_vcp():
    assert (
        _classify_verdict(_stub_trend(3), _stub_vcp("A+ Confirmed"), _stub_rvol(3.0, 5.0), {})
        == VERDICT_HOLD
    )


def test_verdict_skip_when_stage4():
    assert (
        _classify_verdict(_stub_trend(4), _stub_vcp("A Watchlist"), _stub_rvol(2.0, 2.0), {})
        == VERDICT_SKIP
    )


def test_verdict_skip_when_vcp_rejected():
    assert (
        _classify_verdict(_stub_trend(2), _stub_vcp("Rejected"), _stub_rvol(2.0, 2.0), {})
        == VERDICT_SKIP
    )


def test_verdict_ready_downgrades_when_chg_is_negative():
    # Same setup as ready-test above but with a red day → drops to WATCHLIST
    v = _classify_verdict(_stub_trend(2), _stub_vcp("A+ Confirmed"), _stub_rvol(2.0, -0.5), {})
    assert v == VERDICT_WATCHLIST


def test_verdict_ready_requires_strong_start_when_flag_set():
    cfg = {"requireStrongStart": True}
    # RVOL high, chg positive, but no SS -> not READY, falls to WATCHLIST
    assert (
        _classify_verdict(_stub_trend(2), _stub_vcp("A+ Confirmed"), _stub_rvol(2.0, 2.0, ss=False), cfg)
        == VERDICT_WATCHLIST
    )
    # Same but with SS -> READY
    assert (
        _classify_verdict(_stub_trend(2), _stub_vcp("A+ Confirmed"), _stub_rvol(2.0, 2.0, ss=True), cfg)
        == VERDICT_READY
    )


def test_verdict_thresholds_are_configurable():
    # Bump ready_rvol to 2.5 → a 2.0x RVOL should no longer be READY.
    cfg = {"readyRvol": 2.5, "watchlistRvol": 1.5}
    v = _classify_verdict(_stub_trend(2), _stub_vcp("A+ Confirmed"), _stub_rvol(2.0, 3.0), cfg)
    assert v == VERDICT_WATCHLIST


# ---------- End-to-end analyze_master on synthetic bars ---------------------

def test_analyze_master_strong_uptrend_returns_actionable_verdict():
    """A clean uptrend with a big volume spike on the last day should land
    somewhere in {READY, WATCHLIST}."""
    closes = _uptrend(n=260, start=50.0, end=150.0)
    volumes = [1_000_000] * 259 + [3_000_000]   # 3x spike today
    bars = _bars(closes, volumes=volumes)
    r = analyze_master("BULL", "BULL.NS", bars, benchmark_return_126d=0.02)

    assert r["stage"] == 2
    assert r["verdict"] in (VERDICT_READY, VERDICT_WATCHLIST, VERDICT_SETUP)
    assert r["trend"] is not None
    assert r["vcp"] is not None
    assert r["rvol"] is not None
    assert r["rvolValue"] > 2.0


def test_analyze_master_downtrend_returns_skip():
    closes = _downtrend()
    bars = _bars(closes)
    r = analyze_master("BEAR", "BEAR.NS", bars, benchmark_return_126d=0.05)
    assert r["verdict"] == VERDICT_SKIP
    assert r["stage"] == 4


def test_analyze_master_short_history_returns_skip():
    bars = _bars([100.0] * 10)
    r = analyze_master("SHORT", "SHORT.NS", bars, benchmark_return_126d=0.0)
    assert r["verdict"] == VERDICT_SKIP


def test_analyze_master_result_shape():
    """Sanity: every field the frontend reads must be present."""
    closes = _uptrend()
    bars = _bars(closes)
    r = analyze_master("TEST", "TEST.NS", bars, benchmark_return_126d=0.05)
    for key in (
        "symbol", "yahooSymbol", "analysisDate", "verdict", "verdictRank",
        "trend", "vcp", "rvol",
        "stage", "trendScore", "vcpGrade", "vcpScore",
        "rvolValue", "chgPct", "strongStart", "close", "rsVsBench",
    ):
        assert key in r, f"missing key: {key}"