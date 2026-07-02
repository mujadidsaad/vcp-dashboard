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

export type RvolFilter = 'any' | 'lt1' | 'lt2' | 'lt3' | 'gt3';

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