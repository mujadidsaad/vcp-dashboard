export interface StockRow {
  symbol: string;
  exchange: string;
}

export interface VCPResult {
  symbol: string;
  yahooSymbol: string;
  analysisDate: string;
  vcpScore: number;
  setupGrade: string;
  vcp: boolean;
  vcpSetup: boolean;
  nearBreakout: boolean;
  confirmedBreakout: boolean;
  contractions: number;
  maxContraction: string;
  latestContraction: string;
  volatilityDecrease: string;
  distanceFromResistance: string;
  distanceFrom52wHigh: string;
  volumeDryUp: string;
  adxStrength: boolean;
  diBullish: boolean;
  rsiValue: number;
  priceIncrease: string;
  priceAboveMa50: boolean;
  priceAboveMa200: boolean;
  ema20AboveEma50: boolean;
  ema50AboveEma200: boolean;
  anomalyFree: boolean;
  volumeContraction: boolean;
  breakoutDetected: boolean;
  rvol: number;
  strongStart: boolean;
  reason: string;
}

export type RvolFilter =
  | 'any'
  | 'lt1' | 'lt2' | 'lt3'
  | 'gte1' | 'gte1_5' | 'gte2' | 'gte2_5' | 'gte3' | 'gte5'
  | 'gt3';   // legacy alias – kept so old configs keep working

export interface CheckConfig {
  enabled: boolean;
  points: number;
  threshold?: number;
  min?: number;
  max?: number;
}

export interface FilterConfig {
  minScore: number;
  gradeFilter: string[];
  nearBreakoutPct: number;
  volumeSpikeMultiplier: number;
  volumeDryUpMultiplier: number;
  minBaseDuration: number;
  rvolFilter: RvolFilter;
  strongStartOnly: boolean;
  checks: Record<string, CheckConfig>;
}

export interface ConfigResponse {
  grades: string[];
  timeframes: string[];
  defaultFilters: FilterConfig;
  presets: Record<string, Partial<FilterConfig>>;
}

export interface ScanState {
  status: 'idle' | 'scanning' | 'done';
  progress: number;
  total: number;
  currentSymbol: string;
  results: VCPResult[];
  errors: number;
}

export type Timeframe = '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1wk' | '1mo';

// ============ RVOL Screener ============

export interface RvolResult {
  symbol: string;
  yahooSymbol: string;
  analysisDate: string;
  close: number;
  prevClose: number;
  open: number;
  low: number;
  high: number;
  volume: number;
  avgVolume: number;
  rvol: number;       // ratio (today / 20d avg)
  rvolPct: number;    // rvol * 100
  chgPct: number;
  strongStart: boolean;
  reason?: string;
}

export type RvolSortMode = 'RVOL' | 'ChgPct' | 'SS';

export interface RvolScanConfig {
  lookback: number;
  rvolFlagPct: number;     // colour threshold for the RVOL value itself
  chgFlagPct: number;      // ± this Chg% turns row green / red (else amber)
  gatePct: number;         // top X% of the list gets tinted rows
  showRvolAs: 'Percent' | 'Ratio';
  sortBy: RvolSortMode;
  strongStartOnly: boolean;
}

// ============ Trend Template Screener ============

/**
 * Result from POST /api/scan/trend-template for a single stock.
 * Mirrors the payload emitted by the backend's `analyze_trend_template`.
 */
export interface TrendTemplateResult {
  symbol: string;
  yahooSymbol: string;
  analysisDate: string;

  /** 1 = base, 2 = advance, 3 = topping, 4 = decline, 0 = no data */
  stage: 0 | 1 | 2 | 3 | 4;
  /** 0..8 — number of Minervini rules that pass */
  score: number;

  close: number;
  sma50: number;
  sma150: number;
  sma200: number;
  sma200_21ago: number;
  high52w: number;
  low52w: number;
  /** Stock's 6-month return (decimal, e.g. 0.184 = +18.4%) */
  return6m: number;
  /** Benchmark's 6-month return over the same window (decimal) */
  benchmarkReturn6m: number;
  /** return6m - benchmarkReturn6m — "relative strength" */
  rsVsBench: number;

  // The 8 Minervini rules — kept as individual booleans for chip rendering.
  c1_aboveMa150_200: boolean;
  c2_ma150AboveMa200: boolean;
  c3_ma200Rising: boolean;
  c4_ma50AboveMa150_200: boolean;
  c5_aboveMa50: boolean;
  c6_above30PctFromLow: boolean;
  c7_within25PctOfHigh: boolean;
  c8_beatsBenchmark: boolean;

  reason?: string;
}

/** Benchmark info emitted at the start of a Trend Template scan. */
export interface TrendTemplateBenchmark {
  benchmarkSymbol: string;
  return6m: number;
  available: boolean;
}

export type TrendSortMode = 'Score' | 'Stage' | 'RS' | 'Symbol';

/** Per-user UI preferences for the Trend Template screener. */
export interface TrendTemplateConfig {
  /** Yahoo ticker (or plain symbol) — default "^NSEI" (Nifty 50). */
  benchmarkSymbol: string;
  /** Stocks with score >= this show up (0..8) */
  minScore: number;
  /** Which stages appear in the table. */
  stageFilter: Array<1 | 2 | 3 | 4>;
  sortBy: TrendSortMode;
}

// ============ Master Screener (fuses Trend + VCP + RVOL) ============

export type MasterVerdict =
  | 'READY TO TRADE'
  | 'WATCHLIST'
  | 'SETUP FORMING'
  | 'HOLD OFF'
  | 'SKIP';

/**
 * Result from POST /api/scan/master. Combines the three underlying analyzers
 * and adds a `verdict` label + rank for quick sorting.
 */
export interface MasterResult {
  symbol: string;
  yahooSymbol: string;
  analysisDate: string;

  verdict: MasterVerdict;
  verdictRank: number;   // 100=READY, 80=WATCHLIST, 60=SETUP, 40=HOLD, 20=SKIP
  reason: string;

  // Nested full payloads (for detail popovers / drill-in).
  trend: TrendTemplateResult | null;
  vcp:   VCPResult | null;
  rvol:  RvolResult | null;

  // Flat convenience fields for the results table + sorting.
  stage: 0 | 1 | 2 | 3 | 4;
  trendScore: number;   // 0..8
  vcpGrade: string;
  vcpScore: number;     // 0..100
  rvolValue: number;    // ratio (e.g. 2.15)
  chgPct: number;       // today's %
  strongStart: boolean;
  close: number;
  rsVsBench: number;    // decimal: e.g. 0.184 = +18.4%
}

export type MasterSortMode = 'Verdict' | 'RVOL' | 'RS' | 'VCP' | 'Symbol';

/** Verdict presets exposed in the master screener control bar. */
export type MasterPreset = 'Conservative' | 'Balanced' | 'Aggressive' | 'Custom';

/** Per-user UI preferences for the master screener. */
export interface MasterConfig {
  benchmarkSymbol: string;
  /** Which verdicts to show in the table. */
  verdictFilter: MasterVerdict[];
  sortBy: MasterSortMode;
  preset: MasterPreset;

  /** Thresholds passed to the backend `analyze_master`. */
  readyRvol: number;
  watchlistRvol: number;
  requireStrongStart: boolean;
  rvolLookback: number;
}
