import AsOfPicker from '../AsOfPicker';
import type { TrendTemplateConfig, TrendTemplateResult, TrendSortMode } from '../../types';
import type { UniverseInfo } from '../../api';

interface Props {
  cfg: TrendTemplateConfig;
  onCfg: (c: TrendTemplateConfig) => void;
  universes: UniverseInfo[];
  selectedUniverse: string;
  onUniverseChange: (name: string) => void;
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

const BENCHMARK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '^NSEI',    label: 'Nifty 50 (^NSEI)' },
  { value: '^NSEBANK', label: 'Bank Nifty (^NSEBANK)' },
  { value: '^CNXIT',   label: 'Nifty IT (^CNXIT)' },
  { value: '^BSESN',   label: 'BSE Sensex (^BSESN)' },
];

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return '';
  if (diff < 45_000)         return 'just now';
  if (diff < 3_600_000)      return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 3_600_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / (24 * 3_600_000))}d ago`;
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
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">
        {label}{suffix ? ` (${suffix})` : ''}
      </span>
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

function StageChip({
  stage, on, onToggle,
}: { stage: 1 | 2 | 3 | 4; on: boolean; onToggle: () => void }) {
  const labels: Record<number, { label: string; color: string }> = {
    1: { label: 'S1 ▬', color: 'text-white/70 border-white/20 bg-white/[0.04]' },
    2: { label: 'S2 ▲', color: 'text-good border-good/40 bg-good/10' },
    3: { label: 'S3 ◆', color: 'text-warn border-warn/40 bg-warn/10' },
    4: { label: 'S4 ▼', color: 'text-bad border-bad/40 bg-bad/10' },
  };
  const { label, color } = labels[stage];
  return (
    <button
      onClick={onToggle}
      className={
        `px-2 h-8 rounded-md text-[11px] font-semibold border transition ` +
        (on ? color : 'text-white/30 border-white/10 bg-white/[0.02]')
      }
    >
      {label}
    </button>
  );
}

export default function TrendControls(p: Props) {
  const c = p.cfg;
  const pct = p.total ? Math.round((p.processed / p.total) * 100) : 0;

  const toggleStage = (s: 1 | 2 | 3 | 4) => {
    const set = new Set<1 | 2 | 3 | 4>(c.stageFilter);
    if (set.has(s)) set.delete(s); else set.add(s);
    if (set.size === 0) return;
    p.onCfg({ ...c, stageFilter: Array.from(set).sort() as Array<1 | 2 | 3 | 4> });
  };

  const bench = p.benchmarkReturn6m;
  const benchPct = bench !== null && Number.isFinite(bench) ? bench * 100 : null;

  return (
    <div className="panel p-5 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <div className="text-xs text-white/70 font-medium">Minervini Trend Template · Stage Analyzer</div>
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            Ranks stocks by 8 uptrend rules and classifies each into Weinstein Stage 1–4.
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
              Run Trend Template
            </button>
          )}
        </div>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
        <LabeledSelect
          label="Universe"
          value={p.selectedUniverse}
          onChange={p.onUniverseChange}
          options={p.universes.map(u => ({ value: u.name, label: `${u.name} · ${u.count.toLocaleString()}` }))}
        />
        <LabeledSelect
          label="Benchmark (RS)"
          value={c.benchmarkSymbol}
          onChange={v => p.onCfg({ ...c, benchmarkSymbol: v })}
          options={BENCHMARK_OPTIONS}
        />
        <AsOfPicker
          value={c.asOf}
          onChange={asOf => p.onCfg({ ...c, asOf })}
          compact
        />
        <NumberField
          label="Min Score"
          suffix="of 8"
          value={c.minScore}
          min={0}
          max={8}
          onChange={v => p.onCfg({ ...c, minScore: Math.max(0, Math.min(8, Math.round(v || 0))) })}
        />
        <LabeledSelect<TrendSortMode>
          label="Sort by"
          value={c.sortBy}
          onChange={v => p.onCfg({ ...c, sortBy: v })}
          options={[
            { value: 'Score',  label: 'Score (highest)' },
            { value: 'Stage',  label: 'Stage (2 first)' },
            { value: 'RS',     label: 'RS vs benchmark' },
            { value: 'Symbol', label: 'Symbol (A-Z)' },
          ]}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">Stages</span>
          <div className="flex items-center gap-1">
            {([2, 1, 3, 4] as const).map(s => (
              <StageChip
                key={s}
                stage={s}
                on={c.stageFilter.includes(s)}
                onToggle={() => toggleStage(s)}
              />
            ))}
          </div>
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
              · benchmark unavailable → rule c8 forced to False
            </span>
          )}
          <span className="ml-auto text-white/40">
            Stage 2 (breadth): <span className="stat-num text-good font-semibold">{p.stage2Count}</span> / {p.results.length}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-white/50 gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Processed{' '}
              <span className="stat-num text-white">{p.processed.toLocaleString()}</span>
              {' / '}
              <span className="stat-num">{p.total.toLocaleString()}</span>
            </span>
            {p.errors > 0 && (
              <span>Errors <span className="stat-num text-bad">{p.errors}</span></span>
            )}
            {p.lastScanAt && (
              <span title={new Date(p.lastScanAt).toLocaleString()}>
                Last scan{' '}
                <span className="stat-num text-white/85">{formatAgo(p.lastScanAt)}</span>
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
