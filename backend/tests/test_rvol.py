"""Tests for the RVOL analyzer."""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.rvol import analyze_rvol


def _make_bars(closes, volumes, opens=None, lows=None, highs=None):
    n = len(closes)
    dates = pd.date_range("2024-01-01", periods=n, freq="D")
    if opens is None:
        opens = closes
    if lows is None:
        lows = [min(o, c) for o, c in zip(opens, closes)]
    if highs is None:
        highs = [max(o, c) for o, c in zip(opens, closes)]
    return pd.DataFrame({
        "date": dates,
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "volume": volumes,
    })


def test_rvol_basic():
    # 20 prior days of volume=100, then today=300 → RVOL = 3.0
    volumes = [100.0] * 20 + [300.0]
    closes = [100.0] * 20 + [102.0]
    bars = _make_bars(closes, volumes)
    out = analyze_rvol("XYZ", "XYZ.NS", bars, lookback=20)

    assert out["rvol"] == 3.0
    assert out["rvolPct"] == 300.0
    assert out["avgVolume"] == 100.0
    assert out["volume"] == 300.0
    # Chg% = (102 - 100)/100 * 100 = 2.0
    assert out["chgPct"] == 2.0
    assert out["reason"] == ""


def test_rvol_strong_start_true():
    # Today opens above prev close and holds (low >= prev_close * 0.995)
    prev_close = 100.0
    today_open = 101.0
    today_low = prev_close * 0.998  # holds
    today_close = 102.0
    volumes = [100.0] * 20 + [150.0]
    opens = [prev_close] * 20 + [today_open]
    closes = [prev_close] * 20 + [today_close]
    lows = [prev_close] * 20 + [today_low]
    highs = [prev_close + 0.5] * 20 + [102.5]
    bars = _make_bars(closes, volumes, opens, lows, highs)
    out = analyze_rvol("XYZ", "XYZ.NS", bars, lookback=20)
    assert out["strongStart"] is True


def test_rvol_strong_start_false_gap_filled():
    # Opens above prev close but immediately fills the gap (low < prev * 0.995)
    prev_close = 100.0
    today_open = 101.0
    today_low = 99.0     # < prev_close * 0.995 = 99.5  →  fails
    today_close = 100.5
    volumes = [100.0] * 20 + [150.0]
    opens = [prev_close] * 20 + [today_open]
    closes = [prev_close] * 20 + [today_close]
    lows = [prev_close] * 20 + [today_low]
    bars = _make_bars(closes, volumes, opens, lows)
    out = analyze_rvol("XYZ", "XYZ.NS", bars, lookback=20)
    assert out["strongStart"] is False


def test_rvol_insufficient_data():
    bars = _make_bars([100.0], [100.0])
    out = analyze_rvol("XYZ", "XYZ.NS", bars, lookback=20)
    assert out["rvol"] == 0.0
    assert out["strongStart"] is False
    assert "Need" in out["reason"] or out["reason"] == "No data"


def test_rvol_low_volume_today():
    # 20 prior days of volume=1000, today=200 → RVOL = 0.2
    volumes = [1000.0] * 20 + [200.0]
    closes = [50.0] * 21
    bars = _make_bars(closes, volumes)
    out = analyze_rvol("XYZ", "XYZ.NS", bars, lookback=20)
    assert out["rvol"] == 0.2
    assert out["rvolPct"] == 20.0