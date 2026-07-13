import AsOfPicker from '../AsOfPicker';
import type { RvolScanConfig, RvolSortMode } from '../../types';
import type { UniverseInfo } from '../../api';

interface Props {
  cfg: RvolScanConfig;
  onCfg: (c: RvolScanConfig) => void;
  universes: UniverseInfo[];
  selectedUniverse: string;
  onUniverseChange: (name: string) => void;
  scanning: boolean;
  onStart: () => void;
  onStop: () => void;
  onDownload: () => void;
  onRescan?: () => void;
  onClear?: () => void;
  /** ms timestamp of the last completed scan whose results are still in view */
  lastScanAt?: number | null;
  processed: number;
  total: number;
  currentSymbol: string;
  totalStocks: number;
  results: number;
  errors: number;
}

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return '';
  if (diff < 45_000)          return 'just now';
  if (diff < 3_600_000)       return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 3_600_000)  return `${Math.round(diff / 3_600_000)}h ago`;
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

function LabeledSelect<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="h-9 px-2.5 rounded-md bg-white/[0.03] border border-white/10 text-[12px] text-white focus:outline-none focus:border-accent/50"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-bg text-white">{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label, value, onChange, min, max, step = 1, suffix,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">{label}{suffix ? ` (${suffix})` : ''}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-9 px-2.5 rounded-md bg-white/[0.03] border border-white/10 text-[12px] text-white focus:outline-none focus:border-accent/50 stat-num"
      />
    </label>
  );
}

export default function RvolControls(p: Props) {
  const c = p.cfg;
  const pct = p.total ? Math.round((p.processed / p.total) * 100) : 0;

  return (
    <div className="panel p-5 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <div className="text-xs text-white/70 font-medium">Strong Start RVOL Dashboard</div>
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            Daily RVOL, Chg% and Strong Start (open &gt; prev close, low ≥ prev close × 0.995).
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={p.onDownload}
            disabled={p.results === 0 || p.scanning}
            title={
              p.scanning
                ? 'Wait for scan to finish'
                : p.results === 0
                  ? 'Run a scan first'
                  : 'Download visible rows as CSV (opens in Excel)'
            }
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
              ▶  Run RVOL Screener
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <LabeledSelect
          label="Universe"
          value={p.selectedUniverse}
          onChange={p.onUniverseChange}
          options={p.universes.map(u => ({ value: u.name, label: `${u.name} · ${u.count.toLocaleString()}` }))}
        />
        <AsOfPicker
          value={c.asOf}
          onChange={asOf => p.onCfg({ ...c, asOf })}
          compact
        />
        <NumberField
          label="Lookback"
          suffix="days"
          value={c.lookback}
          min={1}
          max={100}
          onChange={v => p.onCfg({ ...c, lookback: Math.max(1, Math.min(100, Math.round(v || 0))) })}
        />
        <NumberField
          label="RVOL Flag"
          suffix="%"
          value={c.rvolFlagPct}
          min={0}
          step={0.5}
          onChange={v => p.onCfg({ ...c, rvolFlagPct: Math.max(0, v || 0) })}
        />
        <NumberField
          label="Chg Threshold"
          suffix="%"
          value={c.chgFlagPct}
          min={0}
          step={0.1}
          onChange={v => p.onCfg({ ...c, chgFlagPct: Math.max(0, v || 0) })}
        />
        <NumberField
          label="Top % highlighted"
          value={c.gatePct}
          min={10}
          max={100}
          step={5}
          onChange={v => p.onCfg({ ...c, gatePct: Math.max(10, Math.min(100, Math.round(v || 0))) })}
        />
        <LabeledSelect<RvolSortMode>
          label="Sort by"
          value={c.sortBy}
          onChange={v => p.onCfg({ ...c, sortBy: v })}
          options={[
            { value: 'RVOL',   label: 'RVOL (highest)' },
            { value: 'ChgPct', label: 'Chg% (biggest)' },
            { value: 'SS',     label: 'Strong Start first' },
          ]}
        />
        <LabeledSelect
          label="Show RVOL as"
          value={c.showRvolAs}
          onChange={v => p.onCfg({ ...c, showRvolAs: v })}
          options={[
            { value: 'Percent', label: 'Percent (100% = avg)' },
            { value: 'Ratio',   label: 'Ratio (1.00 = avg)' },
          ]}
        />
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">Strong Start</span>
          <label className="h-9 flex items-center gap-2 px-2.5 rounded-md bg-white/[0.03] border border-white/10 text-[12px] text-white/85 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={c.strongStartOnly}
              onChange={e => p.onCfg({ ...c, strongStartOnly: e.target.checked })}
              className="accent-accent w-3.5 h-3.5"
            />
            <span>Only ★ rows</span>
          </label>
        </label>
      </div>

      {/* Progress + stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <div className="flex items-center gap-4 flex-wrap">
            <span>Processed <span className="stat-num text-white">{p.processed.toLocaleString()}</span> / <span className="stat-num">{p.total.toLocaleString()}</span></span>
            <span>Results <span className="stat-num text-accent">{p.results.toLocaleString()}</span></span>
            {p.errors > 0 && <span>Errors <span className="stat-num text-bad">{p.errors}</span></span>}
            {p.lastScanAt && (
              <span title={new Date(p.lastScanAt).toLocaleString()}>
                Last scan{' '}
                <span className="stat-num text-white/85">{formatAbs(p.lastScanAt)}</span>
                <span className="text-white/40"> · {formatAgo(p.lastScanAt)}</span>
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
      {!p.scanning && p.lastScanAt && p.results > 0 && (
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
