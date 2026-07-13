import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type {
  StockRow,
  TrendTemplateBenchmark,
  TrendTemplateConfig,
  TrendTemplateResult,
  TrendSortMode,
} from '../../types';
import { fetchStocks, startTrendTemplateScan, type UniverseInfo } from '../../api';
import { clearState, loadState, saveState } from '../../persist';
import TrendControls from './TrendControls';
import TrendResultsTable from './TrendResultsTable';
import ScreenerSidebar from '../ScreenerSidebar';
import { applyTrendFilterSort, downloadCsv, trendToCsv } from './csv';

const TREND_PERSIST_KEY = 'trend-template-scan';
const TREND_PERSIST_VER = 1;

interface PersistedTrendScan {
  results: TrendTemplateResult[];
  errors: number;
  processed: number;
  total: number;
  cfg: TrendTemplateConfig;
  selectedUniverse: string;
  benchmark: TrendTemplateBenchmark | null;
}

const DEFAULT_CFG: TrendTemplateConfig = {
  benchmarkSymbol: '^NSEI',
  minScore: 5,
  stageFilter: [1, 2, 3, 4],
  sortBy: 'Score',
};

const BENCHMARK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '^NSEI',    label: 'Nifty 50 (^NSEI)' },
  { value: '^NSEBANK', label: 'Bank Nifty (^NSEBANK)' },
  { value: '^CNXIT',   label: 'Nifty IT (^CNXIT)' },
  { value: '^BSESN',   label: 'BSE Sensex (^BSESN)' },
];

interface Props {
  universes: UniverseInfo[];
}

/* ---------- sidebar sub-widgets ---------- */

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

function StageChip({
  stage, on, onToggle,
}: { stage: 1 | 2 | 3 | 4; on: boolean; onToggle: () => void }) {
  const labels: Record<number, { label: string; color: string }> = {
    1: { label: 'S1', color: 'text-white/70 border-white/20 bg-white/[0.04]' },
    2: { label: 'S2', color: 'text-good border-good/40 bg-good/10' },
    3: { label: 'S3', color: 'text-warn border-warn/40 bg-warn/10' },
    4: { label: 'S4', color: 'text-bad border-bad/40 bg-bad/10' },
  };
  const { label, color } = labels[stage];
  return (
    <button
      onClick={onToggle}
      className={
        `px-2 h-7 rounded-md text-[11px] font-semibold border transition ` +
        (on ? color : 'text-white/30 border-white/10 bg-white/[0.02]')
      }
    >
      {label}
    </button>
  );
}

/* ---------- component ---------- */

export default function TrendTemplateScreener({ universes }: Props) {
  const [cfg, setCfg] = useState<TrendTemplateConfig>(DEFAULT_CFG);
  const [selectedUniverse, setSelectedUniverse] = useState<string>('Nifty 200');
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [results, setResults] = useState<TrendTemplateResult[]>([]);
  const [errors, setErrors] = useState(0);
  const [benchmark, setBenchmark] = useState<TrendTemplateBenchmark | null>(null);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cached = loadState<PersistedTrendScan>(TREND_PERSIST_KEY, TREND_PERSIST_VER);
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
  }, [hydrated, universes]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedUniverse) return;
    (async () => {
      try {
        const s = await fetchStocks(selectedUniverse);
        setStocks(s.stocks);
      } catch (e) { console.error(e); }
    })();
  }, [selectedUniverse]);

  const stage2Count = useMemo(
    () => results.filter(r => r.stage === 2).length,
    [results],
  );

  const start = async () => {
    if (!stocks.length) return;
    clearState(TREND_PERSIST_KEY);
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
      await startTrendTemplateScan(
        stocks,
        cfg.benchmarkSymbol,
        'NSE',
        cfg.asOf,
        {
          onBenchmark: b => setBenchmark(b),
          onProgress: p => flushSync(() => {
            setProcessed(p.current);
            setTotal(p.total);
            setCurrentSymbol(p.symbol);
          }),
          onResult: r => setResults(prev => [...prev, r]),
          onError:  _ => setErrors(prev => prev + 1),
          onDone:   () => setScanning(false),
        },
        ac.signal,
      );
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
    clearState(TREND_PERSIST_KEY);
  };

  useEffect(() => {
    if (!hydrated) return;
    if (scanning) return;
    if (results.length === 0) return;
    const payload: PersistedTrendScan = {
      results, errors, processed, total, cfg, selectedUniverse, benchmark,
    };
    saveState(TREND_PERSIST_KEY, TREND_PERSIST_VER, payload);
    setLastScanAt(Date.now());
  }, [hydrated, scanning, results, errors, processed, total, cfg, selectedUniverse, benchmark]);

  const download = () => {
    const rows = applyTrendFilterSort(results, cfg);
    if (rows.length === 0) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeUniverse = selectedUniverse.replace(/[^a-z0-9]+/gi, '_');
    downloadCsv(`trend_${safeUniverse}_${stamp}.csv`, trendToCsv(rows));
  };

  const toggleStage = (s: 1 | 2 | 3 | 4) => {
    const set = new Set<1 | 2 | 3 | 4>(cfg.stageFilter);
    if (set.has(s)) set.delete(s); else set.add(s);
    if (set.size === 0) return;
    setCfg({ ...cfg, stageFilter: Array.from(set).sort() as Array<1 | 2 | 3 | 4> });
  };

  const stage1 = useMemo(() => results.filter(r => r.stage === 1).length, [results]);
  const stage2 = stage2Count;
  const stage3 = useMemo(() => results.filter(r => r.stage === 3).length, [results]);
  const stage4 = useMemo(() => results.filter(r => r.stage === 4).length, [results]);

  return (
    <>
      <ScreenerSidebar
        title="Trend Template · Stages"
        subtitle="Minervini 8 rules + Weinstein stages"
        universes={universes}
        selectedUniverse={selectedUniverse}
        onUniverseChange={setSelectedUniverse}
        asOf={cfg.asOf}
        onAsOfChange={asOf => setCfg({ ...cfg, asOf })}
        totalStocks={stocks.length}
        stats={[
          { label: 'Stage 1', value: stage1, tone: 'muted' },
          { label: 'Stage 2', value: stage2, tone: 'good'  },
          { label: 'Stage 3', value: stage3, tone: 'warn'  },
          { label: 'Stage 4', value: stage4, tone: 'bad'   },
        ]}
        onClear={results.length > 0 ? clearResults : undefined}
        scanning={scanning}
      >
        <SidebarSection title="Benchmark (RS)">
          <SidebarSelect
            value={cfg.benchmarkSymbol}
            onChange={v => setCfg({ ...cfg, benchmarkSymbol: v })}
            options={BENCHMARK_OPTIONS}
          />
        </SidebarSection>

        <SidebarSection title="Min score">
          <SidebarNumber
            value={cfg.minScore}
            min={0} max={8}
            onChange={v => setCfg({ ...cfg, minScore: Math.max(0, Math.min(8, Math.round(v || 0))) })}
            suffix="of 8"
          />
        </SidebarSection>

        <SidebarSection title="Sort by">
          <SidebarSelect<TrendSortMode>
            value={cfg.sortBy}
            onChange={v => setCfg({ ...cfg, sortBy: v })}
            options={[
              { value: 'Score',  label: 'Score (highest)' },
              { value: 'Stage',  label: 'Stage (2 first)' },
              { value: 'RS',     label: 'RS vs benchmark' },
              { value: 'Symbol', label: 'Symbol (A-Z)' },
            ]}
          />
        </SidebarSection>

        <SidebarSection title="Stages">
          <div className="flex items-center gap-1.5">
            {([2, 1, 3, 4] as const).map(s => (
              <StageChip
                key={s}
                stage={s}
                on={cfg.stageFilter.includes(s)}
                onToggle={() => toggleStage(s)}
              />
            ))}
          </div>
        </SidebarSection>
      </ScreenerSidebar>

      <main className="flex-1 space-y-4">
        <TrendControls
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
          stage2Count={stage2Count}
        />
        <TrendResultsTable results={results} cfg={cfg} />
      </main>
    </>
  );
}