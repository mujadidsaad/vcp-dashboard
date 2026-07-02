import type { RvolResult, RvolScanConfig } from '../../types';

/** Escape a single CSV field: wrap in quotes if it contains comma, quote, or newline. */
function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Apply the same visibility rules as RvolResultsTable, then sort per cfg. */
export function applyRvolFilterSort(rows: RvolResult[], cfg: RvolScanConfig): RvolResult[] {
  const valid = rows.filter(
    r => Number.isFinite(r.rvol) && r.rvol > 0 && (!cfg.strongStartOnly || r.strongStart),
  );
  const key = (r: RvolResult): number => {
    switch (cfg.sortBy) {
      case 'RVOL':   return Number.isFinite(r.rvol) ? r.rvol : -Infinity;
      case 'ChgPct': return Number.isFinite(r.chgPct) ? r.chgPct : -Infinity;
      case 'SS':     return (r.strongStart ? 1e9 : 0) + (Number.isFinite(r.rvol) ? r.rvol : 0);
    }
  };
  return valid.slice().sort((a, b) => key(b) - key(a));
}

/** Build a CSV string from RVOL results + config. Numbers are kept raw so Excel can chart / sort them. */
export function rvolToCsv(rows: RvolResult[], cfg: RvolScanConfig): string {
  const header = [
    'Rank',
    'Symbol',
    'YahooSymbol',
    'AnalysisDate',
    'RVOL',
    'RVOL_Pct',
    'Chg_Pct',
    'StrongStart',
    'Close',
    'PrevClose',
    'Open',
    'Low',
    'High',
    'Volume',
    `AvgVolume_${cfg.lookback}d`,
  ];

  const lines: string[] = [header.join(',')];
  rows.forEach((r, i) => {
    lines.push([
      i + 1,
      esc(r.symbol),
      esc(r.yahooSymbol),
      esc(r.analysisDate),
      Number.isFinite(r.rvol)     ? r.rvol.toFixed(4)     : '',
      Number.isFinite(r.rvolPct)  ? r.rvolPct.toFixed(2)  : '',
      Number.isFinite(r.chgPct)   ? r.chgPct.toFixed(2)   : '',
      r.strongStart ? 'Yes' : 'No',
      Number.isFinite(r.close)     ? r.close.toFixed(2)     : '',
      Number.isFinite(r.prevClose) ? r.prevClose.toFixed(2) : '',
      Number.isFinite(r.open)      ? r.open.toFixed(2)      : '',
      Number.isFinite(r.low)       ? r.low.toFixed(2)       : '',
      Number.isFinite(r.high)      ? r.high.toFixed(2)      : '',
      Number.isFinite(r.volume)    ? Math.round(r.volume)   : '',
      Number.isFinite(r.avgVolume) ? Math.round(r.avgVolume): '',
    ].join(','));
  });

  return lines.join('\r\n');
}

/** Trigger a download of the given CSV content as a file. */
export function downloadCsv(filename: string, csv: string): void {
  // BOM makes Excel open UTF-8 CSVs correctly.
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