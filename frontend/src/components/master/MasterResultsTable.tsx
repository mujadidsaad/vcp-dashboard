import { useMemo } from 'react';
import type { MasterConfig, MasterResult, MasterVerdict } from '../../types';

interface Props {
  results: MasterResult[];
  cfg: MasterConfig;
}

const VERDICT_META: Record<MasterVerdict, { label: string; badge: string; row: string; icon: string }> = {
  'READY TO TRADE': {
    label: 'READY',
    icon:  '',
    badge: 'bg-good/25 text-good border border-good/60',
    row:   'bg-good/[0.06] hover:bg-good/[0.10]',
  },
  'WATCHLIST': {
    label: 'WATCH',
    icon:  '',
    badge: 'bg-info/25 text-info border border-info/60',
    row:   'bg-info/[0.05] hover:bg-info/[0.09]',
  },
  'SETUP FORMING': {
    label: 'SETUP',
    icon:  '',
    badge: 'bg-accent/20 text-accent border border-accent/50',
    row:   '',
  },
  'HOLD OFF': {
    label: 'HOLD',
    icon:  '',
    badge: 'bg-warn/20 text-warn border border-warn/50',
    row:   'bg-warn/[0.03]',
  },
  'SKIP': {
    label: 'SKIP',
    icon:  '',
    badge: 'bg-white/5 text-white/40 border border-white/10',
    row:   'opacity-70',
  },
};

const STAGE_TAG: Record<number, string> = {
  1: 'text-white/70 border-white/20',
  2: 'text-good     border-good/40',
  3: 'text-warn     border-warn/40',
  4: 'text-bad      border-bad/40',
};

function fmtPct(x: number): string {
  if (!Number.isFinite(x)) return '–';
  const p = x * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}
function fmtSigned(x: number): string {
  if (!Number.isFinite(x)) return '–';
  return `${x >= 0 ? '+' : ''}${x.toFixed(2)}%`;
}
function fmtPrice(v: number): string {
  return Number.isFinite(v) && v > 0 ? v.toFixed(2) : '–';
}
function fmtRvol(v: number): string {
  return Number.isFinite(v) && v > 0 ? `${v.toFixed(2)}x` : '–';
}

function sortResults(rows: MasterResult[], mode: MasterConfig['sortBy']): MasterResult[] {
  const copy = rows.slice();
  if (mode === 'Symbol') {
    copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return copy;
  }
  const key = (r: MasterResult): number => {
    switch (mode) {
      case 'Verdict': return r.verdictRank * 1e6 + r.trendScore * 1e3 + r.vcpScore;
      case 'RVOL':    return Number.isFinite(r.rvolValue) ? r.rvolValue : -Infinity;
      case 'RS':      return Number.isFinite(r.rsVsBench) ? r.rsVsBench : -Infinity;
      case 'VCP':     return r.vcpScore;
    }
    return 0;
  };
  copy.sort((a, b) => key(b) - key(a));
  return copy;
}

export default function MasterResultsTable({ results, cfg }: Props) {
  const { visible, filteredOutCount } = useMemo(() => {
    const set = new Set(cfg.verdictFilter);
    const valid = results.filter(r => set.has(r.verdict));
    return {
      visible: sortResults(valid, cfg.sortBy),
      filteredOutCount: results.length - valid.length,
    };
  }, [results, cfg.verdictFilter, cfg.sortBy]);

  if (results.length === 0) {
    return (
      <div className="panel px-8 py-14 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
          <span className="text-2xl">MS</span>
        </div>
        <div className="text-white/70 text-sm font-medium">
          No results yet — click <span className="text-accent">Run Master Screener</span> above
        </div>
        <div className="text-white/40 text-xs mt-2 leading-relaxed">
          Runs Trend Template + VCP + RVOL against the same daily bars and gives a verdict:
          {' '}<span className="text-good">READY</span>,{' '}
          <span className="text-info">WATCHLIST</span>,{' '}
          <span className="text-accent">SETUP</span>,{' '}
          <span className="text-warn">HOLD</span>, or{' '}
          <span className="text-white/50">SKIP</span>.
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="panel px-8 py-14 text-center">
        <div className="text-white/70 text-sm font-medium">
          {results.length} stocks scanned, but none match the current verdict filter
        </div>
        <div className="text-white/40 text-xs mt-2">
          Try enabling more verdicts (WATCHLIST / SETUP) or lowering the RVOL thresholds.
        </div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Verdicts</div>
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-white/50">
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Verdict</th>
              <th className="px-3 py-2 text-left font-medium">Symbol</th>
              <th className="px-3 py-2 text-center font-medium">Stage</th>
              <th className="px-3 py-2 text-center font-medium">Trend</th>
              <th className="px-3 py-2 text-left font-medium">VCP Grade</th>
              <th className="px-3 py-2 text-right font-medium">VCP</th>
              <th className="px-3 py-2 text-right font-medium">RVOL</th>
              <th className="px-3 py-2 text-right font-medium">Chg%</th>
              <th className="px-3 py-2 text-center font-medium">SS</th>
              <th className="px-3 py-2 text-right font-medium">Close</th>
              <th className="px-3 py-2 text-right font-medium">RS</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const meta = VERDICT_META[r.verdict];
              const stageTag = STAGE_TAG[r.stage] ?? STAGE_TAG[1];
              const rvColor =
                r.rvolValue >= cfg.readyRvol       ? 'text-good' :
                r.rvolValue >= cfg.watchlistRvol   ? 'text-warn' : 'text-white/60';
              const chgColor =
                !Number.isFinite(r.chgPct) ? 'text-white/40' :
                r.chgPct > 0 ? 'text-good' : r.chgPct < 0 ? 'text-bad' : 'text-white/60';
              const rsColor =
                !Number.isFinite(r.rsVsBench) ? 'text-white/40' :
                r.rsVsBench > 0 ? 'text-good' : 'text-bad';

              return (
                <tr
                  key={r.yahooSymbol}
                  className={`border-t border-white/5 transition ${meta.row}`}
                  title={r.reason}
                >
                  <td className="px-3 py-2 text-white/40 stat-num">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${meta.badge}`}>
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-white font-semibold">{r.symbol}</div>
                    <div className="text-[10px] text-white/40 font-mono">{r.yahooSymbol}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.stage > 0 ? (
                      <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${stageTag}`}>
                        S{r.stage}
                      </span>
                    ) : <span className="text-white/30">–</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`stat-num font-semibold ${r.trendScore >= 7 ? 'text-good' : r.trendScore >= 5 ? 'text-warn' : 'text-white/60'}`}>
                      {r.trendScore}
                    </span>
                    <span className="text-white/30 text-[10px]">/8</span>
                  </td>
                  <td className="px-3 py-2 text-white/80">{r.vcpGrade || '–'}</td>
                  <td className={`px-3 py-2 text-right stat-num font-semibold ${r.vcpScore >= 80 ? 'text-good' : r.vcpScore >= 65 ? 'text-warn' : 'text-white/60'}`}>
                    {r.vcpScore}
                    <span className="text-white/30 text-[10px]">/100</span>
                  </td>
                  <td className={`px-3 py-2 text-right stat-num font-semibold ${rvColor}`}>
                    {fmtRvol(r.rvolValue)}
                  </td>
                  <td className={`px-3 py-2 text-right stat-num ${chgColor}`}>
                    {fmtSigned(r.chgPct)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.strongStart
                      ? <span className="text-good text-[14px] leading-none">*</span>
                      : <span className="text-white/20">·</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-white/85 stat-num">{fmtPrice(r.close)}</td>
                  <td className={`px-3 py-2 text-right stat-num ${rsColor}`}>
                    {fmtPct(r.rsVsBench)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}