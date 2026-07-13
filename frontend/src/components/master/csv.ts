import type { MasterConfig, MasterResult } from '../../types';

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Apply the same visibility rules the MasterResultsTable uses, then sort per cfg. */
export function applyMasterFilterSort(rows: MasterResult[], cfg: MasterConfig): MasterResult[] {
  const set = new Set(cfg.verdictFilter);
  const valid = rows.filter(r => set.has(r.verdict));

  if (cfg.sortBy === 'Symbol') {
    return valid.slice().sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
  const key = (r: MasterResult): number => {
    switch (cfg.sortBy) {
      case 'Verdict': return r.verdictRank * 1e6 + r.trendScore * 1e3 + r.vcpScore;
      case 'RVOL':    return Number.isFinite(r.rvolValue) ? r.rvolValue : -Infinity;
      case 'RS':      return Number.isFinite(r.rsVsBench) ? r.rsVsBench : -Infinity;
      case 'VCP':     return r.vcpScore;
    }
    return 0;
  };
  return valid.slice().sort((a, b) => key(b) - key(a));
}

/** Build a CSV string from Master results. */
export function masterToCsv(rows: MasterResult[]): string {
  const header = [
    'Rank',
    'Symbol',
    'YahooSymbol',
    'AnalysisDate',
    'Verdict',
    'Stage',
    'TrendScore',
    'VCP_Grade',
    'VCP_Score',
    'RVOL',
    'ChgPct',
    'StrongStart',
    'Close',
    'RS_vs_Bench_Pct',
    'Reason',
  ];
  const lines: string[] = [header.join(',')];
  rows.forEach((r, i) => {
    lines.push([
      i + 1,
      esc(r.symbol),
      esc(r.yahooSymbol),
      esc(r.analysisDate),
      esc(r.verdict),
      r.stage,
      r.trendScore,
      esc(r.vcpGrade),
      r.vcpScore,
      Number.isFinite(r.rvolValue) ? r.rvolValue.toFixed(2) : '',
      Number.isFinite(r.chgPct)    ? r.chgPct.toFixed(2)    : '',
      r.strongStart ? 'Yes' : 'No',
      Number.isFinite(r.close)     ? r.close.toFixed(2)     : '',
      Number.isFinite(r.rsVsBench) ? (r.rsVsBench * 100).toFixed(2) : '',
      esc(r.reason),
    ].join(','));
  });
  return lines.join('\r\n');
}

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