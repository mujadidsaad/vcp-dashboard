import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type {
  MasterConfig,
  MasterPreset,
  MasterResult,
  MasterSortMode,
  MasterVerdict,
  StockRow,
  TrendTemplateBenchmark,
} from '../../types';
import { fetchStocks, startMasterScan, type UniverseInfo } from '../../api';
import { clearState, loadState, saveState } from '../../persist';
import MasterControls from './MasterControls';
import MasterResultsTable from './MasterResultsTable';
import ScreenerSidebar from '../ScreenerSidebar';
import { applyMasterFilterSort, downloadCsv, masterToCsv } from './csv';

const PERSIST_KEY = 'master-scan';
const PERSIST_VER = 1;

interface PersistedMasterScan {
  results: MasterResult[];
  errors: number;
  processed: number;
  total: number;
  cfg: MasterConfig;
  selectedUniverse: string;
  benchmark: TrendTemplateBenchmark | null;
}

const DEFAULT_CFG: MasterConfig = {
  benchmarkSymbol: '^NSEI',
  verdictFilter: ['READY TO TRADE', 'WATCHLIST', 'SETUP FORMING'],
  sortBy: 'Verdict',
  preset: 'Balanced',
  readyRvol: 1.5,
  watchlistRvol: 1.0,
  requireStrongStart: false,
  rvolLookback: 20,
};

const EMPTY_VERDICT_COUNTS: Record<MasterVerdict, number> = {
  'READY TO TRADE': 0,
  'WATCHLIST': 0,
  'SETUP FORMING': 0,
  'HOLD OFF': 0,
  'SKIP': 0,
};

const BENCHMARK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '^NSEI',    label: 'Nifty 50 (^NSEI)' },
  { value: '^NSEBANK', label: 'Bank Nifty (^NSEBANK)' },
  { value: '^CNXIT',   label: 'Nifty IT (^CNXIT)' },
  { value: '^BSESN',   label: 'BSE Sensex (^BSESN)' },
];

const PRESETS: Record<MasterPreset, Partial<MasterConfig>> = {
  Conservative: { readyRvol: 2.0, watchlistRvol: 1.3, requireStrongStart: true  },
  Balanced:     { readyRvol: 1.5, watchlistRvol: 1.0, requireStrongStart: false },
  Aggressive:   { readyRvol: 1.2, watchlistRvol: 0.8, requireStrongStart: false },
  Custom: {},
};

const VERDICT_META: Record<MasterVerdict, { label: string; className: string }> = {
  'READY TO TRADE': { label: 'READY', className: 'text-good     border-good/40     bg-good/10'          },
  'WATCHLIST':      { label: 'WATCH', className: 'text-info     border-info/40     bg-info/10'          },
  'SETUP FORMING':  { label: 'SETUP', className: 'text-accent   border-accent/40   bg-accent/10'        },
  'HOLD OFF':       { label: 'HOLD',  className: 'text-warn     border-warn/40     bg-warn/10'          },
  'SKIP':           { label: 'SKIP',  className: 'text-white/60 border-white/20    bg-white/[0.03]'     },
};

interface Props {
  universes: UniverseInfo[];
}

/* ---------- small inline widgets used by the sidebar filter block ---------- */

function SidebarSection({
  title, children, right,
}: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function SidebarSelect<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="w-full h-9 px-2.5 rounded-md bg-white/[0.03] border border-white/10 text-[12px] text-white focus:outline-none focus:border-accent/50"
    >
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-bg text-white">{o.label}</option>
      ))}
    </select>
  );
}

function SidebarNumber({
  value, onChange, min, max, step = 1, suffix,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-9 px-2.5 rounded-md bg-white/[0.03] border border-white/10 text-[12px] text-white focus:outline-none focus:border-accent/50 stat-num"
      />
      {suffix && <span className="text-[11px] text-white/40">{suffix}</span>}
    </div>
  );
}

/* ---------------------------- component ---------------------------- */

export default function MasterScreener({ universes }: Props) {
  const [cfg, setCfg] = useState<MasterConfig>(DEFAULT_CFG);
  const [selectedUniverse, setSelectedUniverse] = useState<string>('Nifty 200');
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [results, setResults] = useState<MasterResult[]>([]);
  const [errors, setErrors] = useState(0);
  const [benchmark, setBenchmark] = useState<TrendTemplateBenchmark | null>(null);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Rehydrate last scan
  useEffect(() => {
    const cached = loadState<PersistedMasterScan>(PERSIST_KEY, PERSIST_VER);
    if (cached && cached.data.results.length > 0) {
      setResults(cached.data.results);
      setErrors(cached.data.errors);
      setProcessed(cached.data.processed);
      setTotal(cached.data.total);
      setCfg(cached.data.cfg);
      setSelectedUniverse(cached.data.selectedUniverse);
      setBenchmark(cached.data.benchmark);
      setLastScanAt(cached.savedAt);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!universes.length) return;
    if (!universes.some(u => u.name === selectedUniverse)) {
      setSelectedUniverse(universes[0].name);
    }
  }, [hydrated, universes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedUniverse) return;
    (async () => {
      try {
        const s = await fetchStocks(selectedUniverse);
        setStocks(s.stocks);
      } catch (e) { console.error(e); }
    })();
  }, [selectedUniverse]);

  const verdictCounts = useMemo(() => {
    const counts: Record<MasterVerdict, number> = { ...EMPTY_VERDICT_COUNTS };
    for (const r of results) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
    return counts;
  }, [results]);

  const start = async () => {
    if (!stocks.length) return;
    clearState(PERSIST_KEY);
    setLastScanAt(null);
    setResults([]);
    setErrors(0);
    setProcessed(0);
    setTotal(stocks.length);
    setCurrentSymbol('');
    setBenchmark(null);
    setScanning(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await startMasterScan(stocks, cfg, {
        onBenchmark: b => setBenchmark(b),
        onProgress: p => flushSync(() => {
          setProcessed(p.current);
          setTotal(p.total);
          setCurrentSymbol(p.symbol);
        }),
        onResult: r => setResults(prev => [...prev, r]),
        onError:  _ => setErrors(prev => prev + 1),
        onDone:   () => setScanning(false),
      }, ac.signal);
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setScanning(false);
  };

  const clearResults = () => {
    setResults([]);
    setErrors(0);
    setProcessed(0);
    setTotal(0);
    setBenchmark(null);
    setLastScanAt(null);
    clearState(PERSIST_KEY);
  };

  useEffect(() => {
    if (!hydrated) return;
    if (scanning) return;
    if (results.length === 0) return;
    const payload: PersistedMasterScan = {
      results, errors, processed, total, cfg, selectedUniverse, benchmark,
    };
    saveState(PERSIST_KEY, PERSIST_VER, payload);
    setLastScanAt(Date.now());
  }, [hydrated, scanning, results, errors, processed, total, cfg, selectedUniverse, benchmark]);

  const download = () => {
    const rows = applyMasterFilterSort(results, cfg);
    if (rows.length === 0) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeUniverse = selectedUniverse.replace(/[^a-z0-9]+/gi, '_');
    downloadCsv(`master_${safeUniverse}_${stamp}.csv`, masterToCsv(rows));
  };

  const applyPreset = (preset: MasterPreset) => {
    const patch = PRESETS[preset];
    setCfg({ ...cfg, preset, ...patch });
  };

  const toggleVerdict = (v: MasterVerdict) => {
    const set = new Set<MasterVerdict>(cfg.verdictFilter);
    if (set.has(v)) set.delete(v); else set.add(v);
    if (set.size === 0) return;
    setCfg({ ...cfg, verdictFilter: Array.from(set) as MasterVerdict[] });
  };

  const readyCount = verdictCounts['READY TO TRADE'] ?? 0;
  const watchCount = verdictCounts['WATCHLIST'] ?? 0;
  const setupCount = verdictCounts['SETUP FORMING'] ?? 0;
  const holdCount  = verdictCounts['HOLD OFF'] ?? 0;

  return (
    <>
      <ScreenerSidebar
        title="Master · Trend + VCP + RVOL"
        subtitle="One verdict per stock"
        universes={universes}
        selectedUniverse={selectedUniverse}
        onUniverseChange={setSelectedUniverse}
        asOf={cfg.asOf}
        onAsOfChange={asOf => setCfg({ ...cfg, asOf })}
        totalStocks={stocks.length}
        stats={[
          { label: 'Ready',    value: readyCount, tone: 'good'   },
          { label: 'Watch',    value: watchCount, tone: 'info'   },
          { label: 'Setup',    value: setupCount, tone: 'accent' },
          { label: 'Hold off', value: holdCount,  tone: 'warn'   },
        ]}
        onClear={results.length > 0 ? clearResults : undefined}
        scanning={scanning}
      >
        {/* Screener config */}
        <SidebarSection title="Benchmark (RS)">
          <SidebarSelect
            value={cfg.benchmarkSymbol}
            onChange={v => setCfg({ ...cfg, benchmarkSymbol: v })}
            options={BENCHMARK_OPTIONS}
          />
        </SidebarSection>

        <SidebarSection title="Preset">
          <SidebarSelect<MasterPreset>
            value={cfg.preset}
            onChange={applyPreset}
            options={[
              { value: 'Balanced',     label: 'Balanced (default)' },
              { value: 'Conservative', label: 'Conservative' },
              { value: 'Aggressive',   label: 'Aggressive' },
              { value: 'Custom',       label: 'Custom' },
            ]}
          />
        </SidebarSection>

        <SidebarSection title="Sort by">
          <SidebarSelect<MasterSortMode>
            value={cfg.sortBy}
            onChange={v => setCfg({ ...cfg, sortBy: v })}
            options={[
              { value: 'Verdict', label: 'Verdict rank' },
              { value: 'RVOL',    label: 'RVOL (highest)' },
              { value: 'RS',      label: 'RS vs benchmark' },
              { value: 'VCP',     label: 'VCP Score' },
              { value: 'Symbol',  label: 'Symbol (A-Z)' },
            ]}
          />
        </SidebarSection>

        <SidebarSection title="Ready RVOL ≥">
          <SidebarNumber
            value={cfg.readyRvol}
            min={0.5} max={10} step={0.1}
            onChange={v => setCfg({ ...cfg, readyRvol: Math.max(0.1, v || 0), preset: 'Custom' })}
          />
        </SidebarSection>

        <SidebarSection title="Watchlist RVOL ≥">
          <SidebarNumber
            value={cfg.watchlistRvol}
            min={0.1} max={5} step={0.1}
            onChange={v => setCfg({ ...cfg, watchlistRvol: Math.max(0.1, v || 0), preset: 'Custom' })}
          />
        </SidebarSection>

        <SidebarSection title="Show verdicts">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VERDICT_META) as MasterVerdict[]).map(v => {
              const on = cfg.verdictFilter.includes(v);
              const meta = VERDICT_META[v];
              const count = verdictCounts[v] ?? 0;
              return (
                <button
                  key={v}
                  onClick={() => toggleVerdict(v)}
                  className={
                    'px-2 h-7 rounded-md text-[10.5px] font-semibold border transition inline-flex items-center gap-1 ' +
                    (on ? meta.className : 'text-white/30 border-white/10 bg-white/[0.02]')
                  }
                  title={v}
                >
                  <span>{meta.label}</span>
                  <span className={`stat-num text-[10px] font-normal ${on ? '' : 'text-white/30'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </SidebarSection>

        <SidebarSection title="Strong Start">
          <label className="flex items-center gap-2 text-[12px] text-white/75 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={cfg.requireStrongStart}
              onChange={e => setCfg({ ...cfg, requireStrongStart: e.target.checked, preset: 'Custom' })}
              className="accent-accent w-3.5 h-3.5"
            />
            <span className="flex-1">Require Strong Start for READY</span>
          </label>
        </SidebarSection>
      </ScreenerSidebar>

      <main className="flex-1 space-y-4">
        <MasterControls
          cfg={cfg}
          scanning={scanning}
          onStart={start}
          onStop={stop}
          onDownload={download}
          onRescan={start}
          onClear={clearResults}
          lastScanAt={lastScanAt}
          processed={processed}
          total={total}
          currentSymbol={currentSymbol}
          totalStocks={stocks.length}
          results={results}
          errors={errors}
          benchmarkReturn6m={benchmark?.return6m ?? null}
          benchmarkSymbol={benchmark?.benchmarkSymbol ?? null}
          benchmarkAvailable={benchmark?.available ?? false}
          verdictCounts={verdictCounts}
        />
        <MasterResultsTable results={results} cfg={cfg} />
      </main>
    </>
  );
}