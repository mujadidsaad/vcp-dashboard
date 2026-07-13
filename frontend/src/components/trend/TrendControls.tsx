/**
 * TrendControls — scan bar mirroring VCP's ScanControls layout.
 *
 * All filter/config controls live in the shared ScreenerSidebar.
 */

import type { TrendTemplateResult } from '../../types';

interface Props {
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
  results: TrendTemplateResult[];
  errors: number;
  benchmarkReturn6m: number | null;
  benchmarkSymbol: string | null;
  benchmarkAvailable: boolean;
  stage2Count: number;
}

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return '';
  if (diff < 45_000)         return 'just now';
  if (diff < 3_600_000)      return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 3_600_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / (24 * 3_600_000))}d ago`;
}

function formatAbs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const d = new Date(ms);
  const today = new Date();
  const same =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (same) return `Today, ${time}`;
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const isYest =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  if (isYest) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${time}`;
}

function Stat({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'accent' }) {
  const toneCls =
    tone === 'good'   ? 'text-good' :
    tone === 'warn'   ? 'text-warn' :
    tone === 'accent' ? 'text-accent' :
                        'text-white';
  return (
    <div className="flex flex-col items-start">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className={`stat-num text-xl font-semibold mt-0.5 ${toneCls}`}>{value}</div>
    </div>
  );
}

export default function TrendControls(p: Props) {
  const pct = p.total > 0 ? Math.round((p.processed / p.total) * 100) : 0;
  const bench = p.benchmarkReturn6m;
  const benchPct = bench !== null && Number.isFinite(bench) ? bench * 100 : null;
  const matches = p.results.length;
  const canDownload = matches > 0 && !p.scanning;

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 flex-wrap">
          {p.scanning ? (
            <button
              onClick={p.onStop}
              className="h-11 px-5 rounded-xl bg-bad/15 border border-bad/40 text-bad font-semibold text-sm hover:bg-bad/25 transition inline-flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 bg-bad rounded-sm" />
              Stop Scan
            </button>
          ) : (
            <button
              onClick={p.onStart}
              disabled={!p.totalStocks}
              className="h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm shadow-glow hover:shadow-[0_0_36px_rgba(255,107,122,0.35)] disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
            >
              <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 1l9 5-9 5V1z" fill="currentColor"/></svg>
              Start Scan
            </button>
          )}

          <button
            onClick={p.onDownload}
            disabled={!canDownload}
            title={
              p.scanning
                ? 'Wait for the scan to finish'
                : !canDownload
                  ? 'Run a scan first'
                  : 'Download visible rows as CSV'
            }
            className="h-11 px-4 rounded-xl border border-white/15 bg-white/[0.04] text-white/85 font-semibold text-sm hover:bg-white/[0.09] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download CSV
          </button>

          <div className="flex items-baseline gap-1">
            <div className="stat-num text-2xl sm:text-4xl font-bold text-white leading-none">{p.processed}</div>
            <div className="stat-num text-base sm:text-lg text-white/40 leading-none">/ {p.total}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 ml-2 leading-none">
              scanned
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-5 flex-wrap">
          {p.lastScanAt && (
            <div className="flex flex-col items-start">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Last scan</div>
              <div
                className="stat-num text-[13px] font-semibold text-white/85 mt-0.5"
                title={new Date(p.lastScanAt).toLocaleString()}
              >
                {formatAbs(p.lastScanAt)}
                <span className="text-white/40 font-normal ml-1">· {formatAgo(p.lastScanAt)}</span>
              </div>
            </div>
          )}
          <Stat label="Matches" value={matches} tone="accent" />
          <Stat label="Errors" value={p.errors} tone={p.errors > 0 ? 'warn' : 'default'} />
          <Stat label="Complete" value={<>{pct}<span className="text-white/30 text-sm">%</span></>} tone="good" />
        </div>
      </div>

      {p.scanning && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.04] px-4 py-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <div className="text-[13px] text-white/70">
            Scanning <span className="font-mono font-semibold text-white">{p.currentSymbol || '…'}</span>
          </div>
        </div>
      )}

      <div className="relative h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%`, boxShadow: '0 0 12px rgba(255,107,122,0.55)' }}
        />
      </div>

      {benchPct !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-info/25 bg-info/[0.06] px-4 py-2.5 text-[12px]">
          <span className="text-white/60">Benchmark</span>
          <span className="stat-num text-info font-semibold">{p.benchmarkSymbol}</span>
          <span className="text-white/40">6-month return</span>
          <span className={`stat-num font-semibold ${benchPct >= 0 ? 'text-good' : 'text-bad'}`}>
            {benchPct >= 0 ? '+' : ''}{benchPct.toFixed(2)}%
          </span>
          {!p.benchmarkAvailable && (
            <span className="text-warn text-[11px]">
              · benchmark unavailable → rule c8 forced to False
            </span>
          )}
          <span className="ml-auto text-white/40">
            Stage 2 (breadth):{' '}
            <span className="stat-num text-good font-semibold">{p.stage2Count}</span> / {matches}
          </span>
        </div>
      )}

      {!p.scanning && p.lastScanAt && matches > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
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
                className="h-8 px-3 rounded-md text-[12px] font-semibold bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25 inline-flex items-center gap-1.5"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M4 4v4h4M16 16v-4h-4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 8a6 6 0 019.5-2M14 12a6 6 0 01-9.5 2" strokeLinecap="round" />
                </svg>
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