"""Unit tests for indicators."""
import numpy as np

from app.indicators import sma, ema, atr, rsi, kc_width, rolling_mean, nan_median


def test_sma_basic():
    v = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    out = sma(v, 3)
    # min_periods = max(2, 1) = 1 -> first value after 2 obs
    assert np.isnan(out[0])
    assert out[-1] == 4.0  # (3+4+5)/3


def test_ema_matches_length():
    v = np.arange(1, 21, dtype="float64")
    out = ema(v, 5)
    assert out.shape == v.shape
    # Later values should be finite and rising for a rising series
    assert np.isfinite(out[-1])
    assert out[-1] > out[-5]


def test_atr_finite_after_window():
    highs = np.linspace(10, 20, 30)
    lows = highs - 0.5
    closes = (highs + lows) / 2
    out = atr(highs, lows, closes, 14)
    assert np.isfinite(out[-1])
    assert out[-1] >= 0


def test_rsi_range():
    closes = np.cumsum(np.random.default_rng(0).normal(0, 1, 200)) + 100
    out = rsi(closes, 14)
    finite = out[np.isfinite(out)]
    assert (finite >= 0).all() and (finite <= 100).all()


def test_kc_width_positive():
    closes = np.linspace(100, 110, 60)
    highs = closes + 1
    lows = closes - 1
    w = kc_width(closes, highs, lows, 20)
    finite = w[np.isfinite(w)]
    assert (finite > 0).all()


def test_rolling_mean_and_median():
    arr = np.array([1.0, np.nan, 3.0, 5.0])
    assert rolling_mean(arr, 0, 4) == 3.0
    assert nan_median([1.0, np.nan, 3.0]) == 2.0