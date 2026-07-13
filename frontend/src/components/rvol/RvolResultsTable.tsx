import { useMemo } from 'react';
import type { RvolResult, RvolScanConfig } from '../../types';

interface Props {
  results: RvolResult[];
  cfg: RvolScanConfig;
}

function fmtRvol(rvol: number, mode: 'Percent' | 'Ratio'): string {
  if (!Number.isFinite(rvol) || rvol <= 0) return '–';
  return mode === 'Percent'
    ? `${Math.round(rvol * 100)}%`
    : `${rvol.toFixed(2)}x`;
}

function fmtVol(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '–';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
  return v.toFixed(0);
}

function fmtPrice(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '–';
  return v.toFixed(2);
}

/** Compute the display order for the given sort mode. */
function sortResults(rows: RvolResult[], mode: RvolScanConfig['sortBy']): RvolResult[] {
  const copy = rows.slice();
  const key = (r: RvolResult): number => {
    switch (mode) {
      case 'RVOL':
        return Number.isFinite(r.rvol) ? r.rvol : -Infinity;
      case 'ChgPct':
        return Number.isFinite(r.chgPct) ? r.chgPct : -Infinity;
      case 'SS':
        // Strong-start rows on top; RVOL ranks within each group
        return (r.strongStart ? 1e9 : 0) + (Number.isFinite(r.rvol) ? r.rvol : 0);
    }
  };
  copy.sort((a, b) => key(b) - key(a));
  return copy;
}

export default function RvolResultsTable({ results, cfg }: Props) {
  const { visible, rankByYahoo, hotCount, filteredOutCount } = useMemo(() => {
    // 1. Filter out entries without valid RVOL, and apply Strong-Start-only if enabled
    const valid = results.filter(
      r => Number.isFinite(r.rvol) && r.rvol > 0 && (!cfg.strongStartOnly || r.strongStart)
    );

    // 2. Rank by RVOL desc (used for "top X%" tinting, independent of chosen sort)
    const byRvol = valid.slice().sort((a, b) => b.rvol - a.rvol);
    const rankMap = new Map<string, number>();
    byRvol.forEach((r, i) => rankMap.set(r.yahooSymbol, i));

    // 3. Sort for display
    const sorted = sortResults(valid, cfg.sortBy);

    const hot = Math.max(1, Math.round((valid.length * cfg.gatePct) / 100));

    return {
      visible: sorted,
      rankByYahoo: rankMap,
      hotCount: hot,
      filteredOutCount: results.length - valid.length,
    };
  }, [results, cfg.sortBy, cfg.gatePct, cfg.strongStartOnly]);

  if (results.length === 0) {
    return (
      <div className="panel px-8 py-14 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <path d="M4 20h16M4 20V8m4 12V12m4 8V6m4 14v-8m4 8V10" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-white/70 text-sm font-medium">
          No RVOL data yet — click <span className="text-accent">Run RVOL Screener</span> above
        </div>
        <div className="text-white/40 text-xs mt-2 leading-relaxed">
          The screener uses daily bars from Yahoo Finance. During market hours the last daily bar may be partial.
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
        {cfg.strongStartOnly && (
          <div className="text-white/40 text-xs mt-2">
            Try un-checking <em>Only * rows</em>.
          </div>
        )}
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
          Sort: <span className="stat-num text-white/70">{cfg.sortBy}</span>{' '}
          · Top <span className="stat-num text-white/70">{cfg.gatePct}%</span> tinted
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-white/50">
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Symbol</th>
              <th className="px-3 py-2 text-right font-medium">RVOL</th>
              <th className="px-3 py-2 text-right font-medium">Chg%</th>
              <th className="px-3 py-2 text-center font-medium">SS</th>
              <th className="px-3 py-2 text-right font-medium">Close</th>
              <th className="px-3 py-2 text-right font-medium">Prev Close</th>
              <th className="px-3 py-2 text-right font-medium">Open</th>
              <th className="px-3 py-2 text-right font-medium">Low</th>
              <th className="px-3 py-2 text-right font-medium">Volume</th>
              <th className="px-3 py-2 text-right font-medium">Avg Vol ({cfg.lookback}d)</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const rvRank = rankByYahoo.get(r.yahooSymbol) ?? 999999;
              const isHot = rvRank < hotCount;

              // Row tinting: only for top X% by RVOL, colored by Chg% direction
              let rowBg = '';
              if (isHot) {
                if (r.chgPct >= cfg.chgFlagPct)         rowBg = 'bg-good/[0.09]';
                else if (r.chgPct <= -cfg.chgFlagPct)   rowBg = 'bg-bad/[0.09]';
                else                                    rowBg = 'bg-warn/[0.07]';
              }

              const rvColor =
                r.rvolPct >= cfg.rvolFlagPct
                  ? 'text-good'
                  : r.rvolPct >= cfg.rvolFlagPct * 0.6
                    ? 'text-warn'
                    : 'text-white/70';

              const chgColor =
                !Number.isFinite(r.chgPct) ? 'text-white/40'
                  : r.chgPct >= cfg.chgFlagPct ? 'text-good'
                  : r.chgPct <= -cfg.chgFlagPct ? 'text-bad'
                  : r.chgPct >= 0 ? 'text-warn' : 'text-white/70';

              return (
                <tr
                  key={r.yahooSymbol}
                  className={`border-t border-white/5 hover:bg-white/[0.03] ${rowBg}`}
                >
                  <td className="px-3 py-2 text-white/40 stat-num">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="text-white font-semibold">{r.symbol}</div>
                    <div className="text-[10px] text-white/40 font-mono">{r.yahooSymbol}</div>
                  </td>
                  <td className={`px-3 py-2 text-right stat-num font-semibold ${rvColor}`}>
                    {fmtRvol(r.rvol, cfg.showRvolAs)}
                  </td>
                  <td className={`px-3 py-2 text-right stat-num ${chgColor}`}>
                    {Number.isFinite(r.chgPct) ? `${r.chgPct >= 0 ? '+' : ''}${r.chgPct.toFixed(2)}%` : '–'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.strongStart ? <span className="text-good text-[14px] leading-none">*</span> : <span className="text-white/20">·</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-white/85 stat-num">{fmtPrice(r.close)}</td>
                  <td className="px-3 py-2 text-right text-white/60 stat-num">{fmtPrice(r.prevClose)}</td>
                  <td className="px-3 py-2 text-right text-white/60 stat-num">{fmtPrice(r.open)}</td>
                  <td className="px-3 py-2 text-right text-white/60 stat-num">{fmtPrice(r.low)}</td>
                  <td className="px-3 py-2 text-right text-white/70 stat-num">{fmtVol(r.volume)}</td>
                  <td className="px-3 py-2 text-right text-white/50 stat-num">{fmtVol(r.avgVolume)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}