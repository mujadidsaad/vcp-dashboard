import type { FilterConfig, VCPResult } from '../types';
import { passesRvol } from './ResultsGrid';

/** Escape a single CSV field: wrap in quotes if it contains comma, quote, or newline. */
function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Same visibility rules as ResultsGrid + same score-desc sort. */
export function applyVcpFilterSort(rows: VCPResult[], f: FilterConfig): VCPResult[] {
  return rows
    .filter(r =>
      r.vcpScore >= f.minScore &&
      (f.gradeFilter.length === 0 || f.gradeFilter.includes(r.setupGrade)) &&
      passesRvol(r.rvol, f.rvolFilter) &&
      (!f.strongStartOnly || r.strongStart === true)
    )
    .slice()
    .sort((a, b) => b.vcpScore - a.vcpScore);
}

/**
 * CSV export of the VCP screener results.  Columns are chosen to be actionable
 * in Excel: raw numbers, ISO date, boolean flags, plus the human-readable
 * grade + reason.
 */
export function vcpToCsv(rows: VCPResult[]): string {
  const header = [
    'Rank',
    'Symbol',
    'YahooSymbol',
    'AnalysisDate',
    'VCP_Score',
    'Setup_Grade',
    'VCP',
    'VCP_Setup',
    'Near_Breakout',
    'Confirmed_Breakout',
    'Contractions',
    'Max_Contraction',
    'Latest_Contraction',
    'Volatility_Decrease',
    'Dist_From_Resistance',
    'Dist_From_52W_High',
    'Volume_Dry_Up',
    'RSI',
    'Price_Change',
    'Above_MA50',
    'Above_MA200',
    'EMA20_Above_EMA50',
    'EMA50_Above_EMA200',
    'Volume_Contraction',
    'Anomaly_Free',
    'Breakout_Detected',
    'RVOL',
    'Strong_Start',
    'Reason',
  ];

  const yn = (b: boolean) => (b ? 'Yes' : 'No');

  const lines: string[] = [header.join(',')];
  rows.forEach((r, i) => {
    lines.push([
      i + 1,
      esc(r.symbol),
      esc(r.yahooSymbol),
      esc(r.analysisDate),
      r.vcpScore,
      esc(r.setupGrade),
      yn(r.vcp),
      yn(r.vcpSetup),
      yn(r.nearBreakout),
      yn(r.confirmedBreakout),
      r.contractions,
      esc(r.maxContraction),
      esc(r.latestContraction),
      esc(r.volatilityDecrease),
      esc(r.distanceFromResistance),
      esc(r.distanceFrom52wHigh),
      esc(r.volumeDryUp),
      Number.isFinite(r.rsiValue) ? r.rsiValue.toFixed(1) : '',
      esc(r.priceIncrease),
      yn(r.priceAboveMa50),
      yn(r.priceAboveMa200),
      yn(r.ema20AboveEma50),
      yn(r.ema50AboveEma200),
      yn(r.volumeContraction),
      yn(r.anomalyFree),
      yn(r.breakoutDetected),
      Number.isFinite(r.rvol) ? r.rvol.toFixed(4) : '',
      yn(!!r.strongStart),
      esc(r.reason),
    ].join(','));
  });

  return lines.join('\r\n');
}

/** Trigger a download of the given CSV content as a file. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}