"""Unit tests for the VCP engine on synthetic data."""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.config import DEFAULT_FILTERS
from app.vcp import analyze_vcp, detect_contractions


def _make_bars(n: int = 260, seed: int = 42) -> pd.DataFrame:
    """Generate a rising, tightening synthetic series for tests."""
    rng = np.random.default_rng(seed)
    closes = np.linspace(100, 150, n) + rng.normal(0, 1.0, n).cumsum() * 0.05
    highs = closes + rng.uniform(0.5, 1.5, n)
    lows = closes - rng.uniform(0.5, 1.5, n)
    opens = closes + rng.uniform(-0.3, 0.3, n)
    volumes = rng.integers(500_000, 1_500_000, n).astype("float64")
    dates = pd.date_range("2024-01-01", periods=n, freq="B")
    return pd.DataFrame({
        "date": dates, "open": opens, "high": highs, "low": lows,
        "close": closes, "volume": volumes,
    })


def test_analyze_returns_all_keys():
    df = _make_bars()
    r = analyze_vcp("TEST", "TEST.NS", df, DEFAULT_FILTERS)
    required = {
        "symbol", "yahooSymbol", "analysisDate", "vcpScore", "setupGrade",
        "vcp", "vcpSetup", "nearBreakout", "confirmedBreakout",
        "contractions", "rsiValue", "priceIncrease", "reason",
    }
    assert required.issubset(r.keys())
    assert 0 <= r["vcpScore"] <= 100


def test_short_series_returns_empty_result():
    df = _make_bars(n=10)
    r = analyze_vcp("TEST", "TEST.NS", df, DEFAULT_FILTERS)
    assert r["setupGrade"] == "Rejected"
    assert r["vcpScore"] == 0


def test_detect_contractions_runs():
    df = _make_bars(n=200)
    cs = detect_contractions(df)
    assert isinstance(cs, list)
    for c in cs:
        assert 0.02 <= c.retracement <= 0.45