"""Tests for the Trend Template analyzer."""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.trend_template import analyze_trend_template, compute_return_6m


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


def _uptrend_series(n=260, start=50.0, end=150.0):
    """Linear-ish uptrend from `start` to `end` over `n` bars, with mild noise."""
    rng = np.random.default_rng(42)
    base = np.linspace(start, end, n)
    noise = rng.normal(0, 0.5, n)
    return list(base + noise)


def _downtrend_series(n=260, start=150.0, end=60.0):
    rng = np.random.default_rng(7)
    base = np.linspace(start, end, n)
    noise = rng.normal(0, 0.5, n)
    return list(base + noise)


def test_analyze_returns_all_keys_on_valid_input():
    closes = _uptrend_series()
    bars = _bars(closes)
    r = analyze_trend_template("TEST", "TEST.NS", bars, benchmark_return_126d=0.05)
    for key in (
        "symbol", "yahooSymbol", "analysisDate", "stage", "score",
        "close", "sma50", "sma150", "sma200", "sma200_21ago",
        "high52w", "low52w", "return6m", "benchmarkReturn6m", "rsVsBench",
        "c1_aboveMa150_200", "c2_ma150AboveMa200", "c3_ma200Rising",
        "c4_ma50AboveMa150_200", "c5_aboveMa50",
        "c6_above30PctFromLow", "c7_within25PctOfHigh", "c8_beatsBenchmark",
    ):
        assert key in r, f"missing key: {key}"
    assert 0 <= r["score"] <= 8
    assert r["stage"] in (1, 2, 3, 4)


def test_strong_uptrend_hits_stage_2():
    """A clean rising series that closes near the high should score highly
    and be classified as Stage 2."""
    closes = _uptrend_series(n=260, start=50.0, end=150.0)
    bars = _bars(closes)
    # Benchmark is up only a little; the stock crushed it in the last 6mo.
    r = analyze_trend_template("BULL", "BULL.NS", bars, benchmark_return_126d=0.02)

    assert r["c1_aboveMa150_200"], "close should be above MA150 and MA200"
    assert r["c2_ma150AboveMa200"], "MA150 should sit above MA200 in a fresh uptrend"
    assert r["c3_ma200Rising"], "MA200 should be rising"
    assert r["c4_ma50AboveMa150_200"], "MA50 should sit above MA150 and MA200"
    assert r["c5_aboveMa50"], "close should be above MA50"
    assert r["c6_above30PctFromLow"], "close should be well above 52w low"
    assert r["c7_within25PctOfHigh"], "close should be within 25% of 52w high"
    assert r["c8_beatsBenchmark"], "stock outperformed the benchmark"
    assert r["score"] == 8
    assert r["stage"] == 2


def test_strong_downtrend_hits_stage_4():
    """A clean falling series that closes near the low should be Stage 4."""
    closes = _downtrend_series(n=260, start=150.0, end=60.0)
    bars = _bars(closes)
    r = analyze_trend_template("BEAR", "BEAR.NS", bars, benchmark_return_126d=0.05)

    assert not r["c1_aboveMa150_200"]
    assert not r["c3_ma200Rising"]
    # close is well below MA200 and MA200 is falling → Stage 4
    assert r["stage"] == 4
    assert r["score"] <= 3  # basically nothing passes


def test_flat_series_is_stage_1_or_3():
    closes = [100.0] * 260
    bars = _bars(closes)
    r = analyze_trend_template("FLAT", "FLAT.NS", bars, benchmark_return_126d=0.0)

    # In a perfectly flat series, MA200 is neither rising nor falling,
    # and close == MA200 → falls through to Stage 1.
    assert r["stage"] in (1, 3)
    assert r["score"] <= 6


def test_short_history_returns_insufficient_data():
    bars = _bars([100.0] * 10)
    r = analyze_trend_template("SHORT", "SHORT.NS", bars, benchmark_return_126d=0.0)
    assert r["stage"] == 0
    assert r["score"] == 0
    assert "Need" in r["reason"]


def test_missing_benchmark_forces_c8_false():
    closes = _uptrend_series()
    bars = _bars(closes)
    r = analyze_trend_template("NO_BENCH", "NO_BENCH.NS", bars, benchmark_return_126d=None)
    assert r["c8_beatsBenchmark"] is False
    # Score should still be at most 7 without the benchmark rule
    assert r["score"] <= 7


def test_c6_c7_below_30_pct_from_low():
    """Fabricate a series where close sits at 20% above the 52w low →
    rule c6 (>= 30% above 52w low) must be False."""
    # Big drop early, close hovering near lows
    closes = [200.0] * 30 + [100.0] * 200 + [115.0] * 30
    bars = _bars(closes)
    r = analyze_trend_template("NEAR_LOW", "NEAR_LOW.NS", bars, benchmark_return_126d=0.0)
    assert r["c6_above30PctFromLow"] is False


def test_c7_within_25_pct_of_high():
    """Very simple: close at 76 with a recent high of 100 → within 25%."""
    closes = list(np.linspace(60, 100, 200)) + [76.0] * 60
    bars = _bars(closes)
    r = analyze_trend_template("NEAR_HIGH", "NEAR_HIGH.NS", bars, benchmark_return_126d=0.0)
    # 76 / 100 = 0.76, threshold is >= 0.75 → passes
    assert r["c7_within25PctOfHigh"] is True


def test_compute_return_6m_matches_expected():
    # Close today 130, close 126 bars ago 100 → +30%
    n = 200
    lookback = 126
    closes = [100.0] * (n - lookback) + list(np.linspace(101, 130, lookback))
    bars = _bars(closes)
    r = compute_return_6m(bars)
    assert abs(r - 0.30) < 0.01


def test_return_6m_needs_enough_history():
    bars = _bars(list(range(1, 40)))
    r = compute_return_6m(bars)
    assert np.isnan(r)