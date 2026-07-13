/**
 * MasterControls — slim scan bar (VCP-style).
 *
 * All filter/config controls (universe, benchmark, as-of, preset, sort,
 * thresholds, verdict chips, strong-start toggle) live in the shared
 * ScreenerSidebar. This component now only shows the run/stop/download
 * buttons, the progress bar, the benchmark ribbon, and the cached-scan
 * ribbon — mirroring VCP's ScanControls layout.
 */

import type {
  MasterConfig,
  MasterResult,
  MasterVerdict,
} from '../../types';

interface Props {
  cfg: MasterConfig;
  scanning: boolean;
  onStart: () => void;
  onStop: () => void;
  onDownload: () => void;
  onRescan?: () => void;
  onClear?: () => void;
  lastScanAt?: number | null;
  processed: number;
  total: number;
  currentSymbol: string;
  totalStocks: number;
  results: MasterResult[];
  errors: number;
  benchmarkReturn6m: number | null;
  benchmarkSymbol: string | null;
  benchmarkAvailable: boolean;
  verdictCounts: Record<MasterVerdict, number>;
}

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return '';
  if (diff < 45_000)         return 'just now';
  if (diff < 3_600_000)      return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 3_600_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / (24 * 3_600_000))}d ago`;
}

export default function MasterControls(p: Props) {
  const pct = p.total ? Math.round((p.processed / p.total) * 100) : 0;
  const bench = p.benchmarkReturn6m;
  const benchPct = bench !== null && Number.isFinite(bench) ? bench * 100 : null;

  return (
    <div className="panel p-5 space-y-5">
      {/* Header + primary actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <div className="text-xs text-white/70 font-medium">
              Master Screener — Trend + VCP + RVOL fused
            </div>
            <span
              className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-info/40 bg-info/10 text-info uppercase tracking-[0.14em] cursor-help"
              title="Master always runs on daily bars. Trend Template (SMA50/150/200, 52-week range) and RVOL (20-day volume average) are only meaningful on daily data."
            >
              1D · Daily
            </span>
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            One click. All three signals. Verdict tells you whether to trade, watch, or skip.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={p.onDownload}
            disabled={p.results.length === 0 || p.scanning}
            title={p.scanning ? 'Wait for scan to finish' : p.results.length === 0 ? 'Run a scan first' : 'Download visible rows as CSV'}
            className="px-3 h-9 rounded-md text-[12px] font-semibold border border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/[0.09] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download CSV
          </button>
          {p.scanning ? (
            <button
              onClick={p.onStop}
              className="px-4 h-9 rounded-md text-[12px] font-semibold bg-bad/20 text-bad border border-bad/40 hover:bg-bad/30"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={p.onStart}
              disabled={!p.totalStocks}
              className="px-4 h-9 rounded-md text-[12px] font-semibold bg-accent text-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shadow-glow"
            >
              Run Master Screener
            </button>
          )}
        </div>
      </div>

      {/* Benchmark ribbon */}
      {benchPct !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-info/25 bg-info/[0.06] px-3 py-2 text-[12px]">
          <span className="text-white/60">Benchmark</span>
          <span className="stat-num text-info font-semibold">{p.benchmarkSymbol}</span>
          <span className="text-white/40">6-month return</span>
          <span className={`stat-num font-semibold ${benchPct >= 0 ? 'text-good' : 'text-bad'}`}>
            {benchPct >= 0 ? '+' : ''}{benchPct.toFixed(2)}%
          </span>
          {!p.benchmarkAvailable && (
            <span className="text-warn text-[11px]">
              · benchmark unavailable → Trend rule c8 forced to False
            </span>
          )}
        </div>
      )}

      {/* Progress bar + counts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-white/50 gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Processed{' '}
              <span className="stat-num text-white">{p.processed.toLocaleString()}</span>
              {' / '}
              <span className="stat-num">{p.total.toLocaleString()}</span>
            </span>
            <span>Results <span className="stat-num text-accent">{p.results.length.toLocaleString()}</span></span>
            {p.errors > 0 && <span>Errors <span className="stat-num text-bad">{p.errors}</span></span>}
            {p.lastScanAt && (
              <span title={new Date(p.lastScanAt).toLocaleString()}>
                Last scan <span className="stat-num text-white/85">{formatAgo(p.lastScanAt)}</span>
              </span>
            )}
          </div>
          <div className="truncate max-w-[280px] text-white/40">
            {p.scanning && p.currentSymbol ? `→ ${p.currentSymbol}` : p.scanning ? 'Fetching…' : 'Idle'}
          </div>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Cached-scan ribbon */}
      {!p.scanning && p.lastScanAt && p.results.length > 0 && (p.onRescan || p.onClear) && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-white/50">
            <path d="M4 4v4h4M16 16v-4h-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 8a6 6 0 019.5-2M14 12a6 6 0 01-9.5 2" strokeLinecap="round" />
          </svg>
          <div className="text-[12px] text-white/70">
            Showing cached results from{' '}
            <span className="stat-num text-white font-medium">{formatAgo(p.lastScanAt)}</span>
            <span className="text-white/40"> · restored from your last scan</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {p.onRescan && (
              <button
                onClick={p.onRescan}
                className="h-8 px-3 rounded-md text-[12px] font-semibold bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25"
              >
                Rescan
              </button>
            )}
            {p.onClear && (
              <button
                onClick={p.onClear}
                className="h-8 px-3 rounded-md text-[12px] font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/20"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCheckCfg = null as unknown as MasterConfig | null; // keep cfg import alive for future use