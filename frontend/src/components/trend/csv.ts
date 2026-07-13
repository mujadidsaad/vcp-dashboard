import type { TrendTemplateConfig, TrendTemplateResult } from '../../types';

/** Escape a single CSV field: wrap in quotes if it contains comma, quote, or newline. */
function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Apply the same visibility rules the TrendResultsTable uses, then sort per cfg. */
export function applyTrendFilterSort(
  rows: TrendTemplateResult[],
  cfg: TrendTemplateConfig,
): TrendTemplateResult[] {
  const stages = new Set<number>(cfg.stageFilter);
  const filtered = rows.filter(
    r => r.stage > 0 && r.score >= cfg.minScore && stages.has(r.stage),
  );

  const key = (r: TrendTemplateResult): number => {
    switch (cfg.sortBy) {
      case 'Score':  return r.score * 100 + r.stage; // score primary, stage tie-breaker
      case 'Stage':  return r.stage * 100 + r.score;
      case 'RS':     return Number.isFinite(r.rsVsBench) ? r.rsVsBench : -Infinity;
      case 'Symbol': return 0; // handled below via string compare
    }
  };

  if (cfg.sortBy === 'Symbol') {
    return filtered.slice().sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
  return filtered.slice().sort((a, b) => key(b) - key(a));
}

/** Build a CSV string from Trend Template results. */
export function trendToCsv(rows: TrendTemplateResult[]): string {
  const header = [
    'Rank',
    'Symbol',
    'YahooSymbol',
    'AnalysisDate',
    'Stage',
    'Score_of_8',
    'Close',
    'SMA50',
    'SMA150',
    'SMA200',
    'High52w',
    'Low52w',
    'Return6m_Pct',
    'Benchmark6m_Pct',
    'RS_vs_Bench_Pct',
    'c1_aboveMa150_200',
    'c2_ma150AboveMa200',
    'c3_ma200Rising',
    'c4_ma50AboveMa150_200',
    'c5_aboveMa50',
    'c6_above30PctFromLow',
    'c7_within25PctOfHigh',
    'c8_beatsBenchmark',
  ];

  const lines: string[] = [header.join(',')];
  rows.forEach((r, i) => {
    lines.push([
      i + 1,
      esc(r.symbol),
      esc(r.yahooSymbol),
      esc(r.analysisDate),
      r.stage,
      `${r.score}/8`,
      Number.isFinite(r.close)     ? r.close.toFixed(2)      : '',
      Number.isFinite(r.sma50)     ? r.sma50.toFixed(2)      : '',
      Number.isFinite(r.sma150)    ? r.sma150.toFixed(2)     : '',
      Number.isFinite(r.sma200)    ? r.sma200.toFixed(2)     : '',
      Number.isFinite(r.high52w)   ? r.high52w.toFixed(2)    : '',
      Number.isFinite(r.low52w)    ? r.low52w.toFixed(2)     : '',
      Number.isFinite(r.return6m)          ? (r.return6m * 100).toFixed(2)          : '',
      Number.isFinite(r.benchmarkReturn6m) ? (r.benchmarkReturn6m * 100).toFixed(2) : '',
      Number.isFinite(r.rsVsBench)         ? (r.rsVsBench * 100).toFixed(2)         : '',
      r.c1_aboveMa150_200      ? 'Y' : 'N',
      r.c2_ma150AboveMa200     ? 'Y' : 'N',
      r.c3_ma200Rising         ? 'Y' : 'N',
      r.c4_ma50AboveMa150_200  ? 'Y' : 'N',
      r.c5_aboveMa50           ? 'Y' : 'N',
      r.c6_above30PctFromLow   ? 'Y' : 'N',
      r.c7_within25PctOfHigh   ? 'Y' : 'N',
      r.c8_beatsBenchmark      ? 'Y' : 'N',
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