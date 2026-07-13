import { useMemo } from 'react';
import type { TrendTemplateConfig, TrendTemplateResult } from '../../types';

interface Props {
  results: TrendTemplateResult[];
  cfg: TrendTemplateConfig;
}

const STAGE_META: Record<number, { label: string; badge: string; row: string }> = {
  1: { label: 'S1 ▬', badge: 'text-white/70 border-white/20 bg-white/[0.04]', row: '' },
  2: { label: 'S2 ▲', badge: 'text-good border-good/40 bg-good/15',        row: 'bg-good/[0.05]' },
  3: { label: 'S3 ◆', badge: 'text-warn border-warn/40 bg-warn/15',        row: 'bg-warn/[0.04]' },
  4: { label: 'S4 ▼', badge: 'text-bad border-bad/40 bg-bad/15',           row: 'bg-bad/[0.05]' },
};

const RULE_LABELS: Array<{ key: keyof TrendTemplateResult; label: string; tip: string }> = [
  { key: 'c1_aboveMa150_200',     label: '150/200', tip: 'Close above SMA150 AND SMA200' },
  { key: 'c2_ma150AboveMa200',    label: '150>200', tip: 'SMA150 above SMA200' },
  { key: 'c3_ma200Rising',        label: '200↑',    tip: 'SMA200 rising (vs 21 bars ago)' },
  { key: 'c4_ma50AboveMa150_200', label: 'Stack',   tip: 'SMA50 above SMA150 and SMA200' },
  { key: 'c5_aboveMa50',          label: '>50',     tip: 'Close above SMA50' },
  { key: 'c6_above30PctFromLow',  label: '≥30% Lo', tip: 'Close ≥ 30% above 52w low' },
  { key: 'c7_within25PctOfHigh',  label: '≤25% Hi', tip: 'Close within 25% of 52w high' },
  { key: 'c8_beatsBenchmark',     label: 'RS>Bench',tip: '6m return beats benchmark' },
];

function fmtPct(x: number): string {
  if (!Number.isFinite(x)) return '–';
  const p = x * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

function fmtPrice(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '–';
  return v.toFixed(2);
}

/** Sort per cfg.sortBy. Filters (stage, min-score) are applied before this. */
function sortResults(rows: TrendTemplateResult[], mode: TrendTemplateConfig['sortBy']): TrendTemplateResult[] {
  const copy = rows.slice();
  if (mode === 'Symbol') {
    copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return copy;
  }
  const key = (r: TrendTemplateResult): number => {
    switch (mode) {
      case 'Score': return r.score * 100 + r.stage;
      case 'Stage': return r.stage * 100 + r.score;
      case 'RS':    return Number.isFinite(r.rsVsBench) ? r.rsVsBench : -Infinity;
    }
    return 0;
  };
  copy.sort((a, b) => key(b) - key(a));
  return copy;
}

export default function TrendResultsTable({ results, cfg }: Props) {
  const { visible, filteredOutCount } = useMemo(() => {
    const stages = new Set<number>(cfg.stageFilter);
    const valid = results.filter(
      r => r.stage > 0 && r.score >= cfg.minScore && stages.has(r.stage),
    );
    return {
      visible: sortResults(valid, cfg.sortBy),
      filteredOutCount: results.length - valid.length,
    };
  }, [results, cfg.sortBy, cfg.minScore, cfg.stageFilter]);

  if (results.length === 0) {
    return (
      <div className="panel px-8 py-14 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <path d="M4 20h16M4 20V8m4 12V12m4 8V6m4 14v-8m4 8V10" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-white/70 text-sm font-medium">
          No results yet — click <span className="text-accent">Run Trend Template</span> above
        </div>
        <div className="text-white/40 text-xs mt-2 leading-relaxed">
          The screener uses daily bars from Yahoo Finance. Each stock is graded against Minervini's 8-rule trend template
          and mapped to a Weinstein stage (1–4).
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="panel px-8 py-14 text-center">
        <div className="text-white/70 text-sm font-medium">
          {results.length} stocks scanned, but none match the current filters
        </div>
        <div className="text-white/40 text-xs mt-2">
          Try lowering <em>Min Score</em> or enabling more stages.
        </div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Ranked</div>
          <span className="stat-num text-sm text-white font-semibold">
            {visible.length}
            <span className="text-white/40 font-normal"> / {results.length}</span>
          </span>
          {filteredOutCount > 0 && (
            <span className="text-[11px] text-white/40">({filteredOutCount} filtered out)</span>
          )}
        </div>
        <div className="text-[11px] text-white/40">
          Sort: <span className="stat-num text-white/70">{cfg.sortBy}</span>
          {' · '}Min score: <span className="stat-num text-white/70">{cfg.minScore}/8</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-white/50">
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Symbol</th>
              <th className="px-3 py-2 text-center font-medium">Stage</th>
              <th className="px-3 py-2 text-center font-medium">Score</th>
              <th className="px-3 py-2 text-right font-medium">Close</th>
              <th className="px-3 py-2 text-right font-medium">SMA50</th>
              <th className="px-3 py-2 text-right font-medium">SMA200</th>
              <th className="px-3 py-2 text-right font-medium">6M Ret</th>
              <th className="px-3 py-2 text-right font-medium">RS vs Bench</th>
              <th className="px-3 py-2 text-center font-medium" colSpan={8}>Rules (1..8)</th>
            </tr>
            <tr className="text-[9px] uppercase tracking-[0.14em] text-white/30 border-b border-white/5">
              <th colSpan={9}></th>
              {RULE_LABELS.map(r => (
                <th key={r.key as string} title={r.tip} className="px-1 py-1 text-center font-medium">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const meta = STAGE_META[r.stage] ?? STAGE_META[1];
              const rsColor = !Number.isFinite(r.rsVsBench)
                ? 'text-white/40'
                : r.rsVsBench >= 0 ? 'text-good' : 'text-bad';
              const retColor = !Number.isFinite(r.return6m)
                ? 'text-white/40'
                : r.return6m >= 0 ? 'text-good' : 'text-bad';

              return (
                <tr
                  key={r.yahooSymbol}
                  className={`border-t border-white/5 hover:bg-white/[0.03] ${meta.row}`}
                >
                  <td className="px-3 py-2 text-white/40 stat-num">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="text-white font-semibold">{r.symbol}</div>
                    <div className="text-[10px] text-white/40 font-mono">{r.yahooSymbol}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`stat-num font-semibold ${r.score >= 7 ? 'text-good' : r.score >= 5 ? 'text-warn' : 'text-white/60'}`}>
                      {r.score}
                    </span>
                    <span className="text-white/30 text-[10px]">/8</span>
                  </td>
                  <td className="px-3 py-2 text-right text-white/85 stat-num">{fmtPrice(r.close)}</td>
                  <td className="px-3 py-2 text-right text-white/60 stat-num">{fmtPrice(r.sma50)}</td>
                  <td className="px-3 py-2 text-right text-white/60 stat-num">{fmtPrice(r.sma200)}</td>
                  <td className={`px-3 py-2 text-right stat-num ${retColor}`}>{fmtPct(r.return6m)}</td>
                  <td className={`px-3 py-2 text-right stat-num ${rsColor}`}>{fmtPct(r.rsVsBench)}</td>
                  {RULE_LABELS.map(rule => {
                    const passed = r[rule.key] as boolean;
                    return (
                      <td key={rule.key as string} className="px-1 py-2 text-center" title={rule.tip}>
                        {passed
                          ? <span className="text-good text-[13px] leading-none">✓</span>
                          : <span className="text-white/20 text-[13px] leading-none">·</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}