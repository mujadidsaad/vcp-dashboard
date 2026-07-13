import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { RvolResult, RvolScanConfig, RvolSortMode, StockRow } from '../../types';
import { fetchStocks, startRvolScan, type UniverseInfo } from '../../api';
import { clearState, loadState, saveState } from '../../persist';
import RvolControls from './RvolControls';
import RvolResultsTable from './RvolResultsTable';
import ScreenerSidebar from '../ScreenerSidebar';
import { applyRvolFilterSort, downloadCsv, rvolToCsv } from './csv';

const RVOL_PERSIST_KEY = 'rvol-scan';
const RVOL_PERSIST_VER = 1;

interface PersistedRvolScan {
  results: RvolResult[];
  errors: number;
  processed: number;
  total: number;
  cfg: RvolScanConfig;
  selectedUniverse: string;
}

const DEFAULT_CFG: RvolScanConfig = {
  lookback: 20,
  rvolFlagPct: 150,
  chgFlagPct: 1.5,
  gatePct: 50,
  showRvolAs: 'Percent',
  sortBy: 'RVOL',
  strongStartOnly: false,
};

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

/* ---------- component ---------- */

export default function RvolScreener({ universes }: Props) {
  const [cfg, setCfg] = useState<RvolScanConfig>(DEFAULT_CFG);
  const [selectedUniverse, setSelectedUniverse] = useState<string>('All Stocks');
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [results, setResults] = useState<RvolResult[]>([]);
  const [errors, setErrors] = useState(0);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cached = loadState<PersistedRvolScan>(RVOL_PERSIST_KEY, RVOL_PERSIST_VER);
    if (cached && cached.data.results.length > 0) {
      setResults(cached.data.results);
      setErrors(cached.data.errors);
      setProcessed(cached.data.processed);
      setTotal(cached.data.total);
      setCfg(cached.data.cfg);
      setSelectedUniverse(cached.data.selectedUniverse);
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
  }, [hydrated, universes]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedUniverse) return;
    (async () => {
      try {
        const s = await fetchStocks(selectedUniverse);
        setStocks(s.stocks);
      } catch (e) { console.error(e); }
    })();
  }, [selectedUniverse]);

  const totalStocks = stocks.length;
  const resultsCount = useMemo(() => results.length, [results]);

  const start = async () => {
    if (!stocks.length) return;
    clearState(RVOL_PERSIST_KEY);
    setLastScanAt(null);
    setResults([]);
    setErrors(0);
    setProcessed(0);
    setTotal(stocks.length);
    setCurrentSymbol('');
    setScanning(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await startRvolScan(stocks, cfg.lookback, cfg.asOf, {
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
    setLastScanAt(null);
    clearState(RVOL_PERSIST_KEY);
  };

  useEffect(() => {
    if (!hydrated) return;
    if (scanning) return;
    if (results.length === 0) return;
    const payload: PersistedRvolScan = {
      results, errors, processed, total, cfg, selectedUniverse,
    };
    saveState(RVOL_PERSIST_KEY, RVOL_PERSIST_VER, payload);
    setLastScanAt(Date.now());
  }, [hydrated, scanning, results, errors, processed, total, cfg, selectedUniverse]);

  const download = () => {
    const rows = applyRvolFilterSort(results, cfg);
    if (rows.length === 0) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeUniverse = selectedUniverse.replace(/[^a-z0-9]+/gi, '_');
    downloadCsv(`rvol_${safeUniverse}_${stamp}.csv`, rvolToCsv(rows, cfg));
  };

  const strongCount = useMemo(
    () => results.filter(r => r.strongStart).length,
    [results],
  );

  return (
    <>
      <ScreenerSidebar
        title="RVOL · Relative Volume"
        subtitle="Confirmation filter on breakout day"
        universes={universes}
        selectedUniverse={selectedUniverse}
        onUniverseChange={setSelectedUniverse}
        asOf={cfg.asOf}
        onAsOfChange={asOf => setCfg({ ...cfg, asOf })}
        totalStocks={totalStocks}
        stats={[
          { label: 'Results',      value: resultsCount, tone: 'accent' },
          { label: 'Strong Start', value: strongCount,  tone: 'good'   },
          { label: 'Errors',       value: errors,       tone: errors > 0 ? 'bad' : 'muted' },
          { label: 'Lookback',     value: `${cfg.lookback}d`, tone: 'muted' },
        ]}
        onClear={results.length > 0 ? clearResults : undefined}
        scanning={scanning}
      >
        <SidebarSection title="Lookback">
          <SidebarNumber
            value={cfg.lookback}
            min={1} max={100}
            onChange={v => setCfg({ ...cfg, lookback: Math.max(1, Math.min(100, Math.round(v || 0))) })}
            suffix="days"
          />
        </SidebarSection>

        <SidebarSection title="RVOL flag">
          <SidebarNumber
            value={cfg.rvolFlagPct}
            min={0} step={0.5}
            onChange={v => setCfg({ ...cfg, rvolFlagPct: Math.max(0, v || 0) })}
            suffix="%"
          />
        </SidebarSection>

        <SidebarSection title="Chg threshold">
          <SidebarNumber
            value={cfg.chgFlagPct}
            min={0} step={0.1}
            onChange={v => setCfg({ ...cfg, chgFlagPct: Math.max(0, v || 0) })}
            suffix="%"
          />
        </SidebarSection>

        <SidebarSection title="Top % highlighted">
          <SidebarNumber
            value={cfg.gatePct}
            min={10} max={100} step={5}
            onChange={v => setCfg({ ...cfg, gatePct: Math.max(10, Math.min(100, Math.round(v || 0))) })}
            suffix="%"
          />
        </SidebarSection>

        <SidebarSection title="Sort by">
          <SidebarSelect<RvolSortMode>
            value={cfg.sortBy}
            onChange={v => setCfg({ ...cfg, sortBy: v })}
            options={[
              { value: 'RVOL',   label: 'RVOL (highest)' },
              { value: 'ChgPct', label: 'Chg% (biggest)' },
              { value: 'SS',     label: 'Strong Start first' },
            ]}
          />
        </SidebarSection>

        <SidebarSection title="Show RVOL as">
          <SidebarSelect
            value={cfg.showRvolAs}
            onChange={v => setCfg({ ...cfg, showRvolAs: v })}
            options={[
              { value: 'Percent', label: 'Percent (100% = avg)' },
              { value: 'Ratio',   label: 'Ratio (1.00 = avg)' },
            ]}
          />
        </SidebarSection>

        <SidebarSection title="Strong Start">
          <label className="flex items-center gap-2 text-[12px] text-white/75 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={cfg.strongStartOnly}
              onChange={e => setCfg({ ...cfg, strongStartOnly: e.target.checked })}
              className="accent-accent w-3.5 h-3.5"
            />
            <span className="flex-1">Only Strong Start rows</span>
          </label>
        </SidebarSection>
      </ScreenerSidebar>

      <main className="flex-1 space-y-4">
        <RvolControls
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
          totalStocks={totalStocks}
          results={resultsCount}
          errors={errors}
        />
        <RvolResultsTable results={results} cfg={cfg} />
      </main>
    </>
  );
}