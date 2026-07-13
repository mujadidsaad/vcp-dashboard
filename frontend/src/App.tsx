import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Header, { type Tab } from './components/Header';
import FilterPanel from './components/FilterPanel';
import ScanControls from './components/ScanControls';
import ResultsGrid, { passesRvol } from './components/ResultsGrid';
import RvolScreener from './components/rvol/RvolScreener';
import TrendTemplateScreener from './components/trend/TrendTemplateScreener';
import { applyVcpFilterSort, downloadCsv, vcpToCsv } from './components/vcpCsv';
import { fetchConfig, fetchStocks, fetchUniverses, startScan, type UniverseInfo } from './api';
import { clearState, loadState, saveState } from './persist';
import type { ConfigResponse, FilterConfig, StockRow, Timeframe, VCPResult } from './types';

const VCP_PERSIST_KEY = 'vcp-scan';
const VCP_PERSIST_VER = 1;

interface PersistedVcpScan {
  results: VCPResult[];
  errors: number;
  progress: number;
  total: number;
  timeframe: Timeframe;
  selectedUniverse: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('vcp');
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [universes, setUniverses] = useState<UniverseInfo[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<string>('Nifty 50');
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [filters, setFilters] = useState<FilterConfig | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const [results, setResults] = useState<VCPResult[]>([]);
  const [errors, setErrors] = useState(0);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load config + universe metadata once, and rehydrate the last VCP scan
  useEffect(() => {
    (async () => {
      try {
        const [cfg, us] = await Promise.all([fetchConfig(), fetchUniverses()]);
        setConfig(cfg);
        setFilters(cfg.defaultFilters);
        setUniverses(us);

        const cached = loadState<PersistedVcpScan>(VCP_PERSIST_KEY, VCP_PERSIST_VER);
        if (cached && cached.data.results.length > 0) {
          setResults(cached.data.results);
          setErrors(cached.data.errors);
          setProgress(cached.data.progress);
          setTotal(cached.data.total);
          setTimeframe(cached.data.timeframe);
          setSelectedUniverse(cached.data.selectedUniverse);
          setLastScanAt(cached.savedAt);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Fetch stocks whenever the selected universe changes
  useEffect(() => {
    (async () => {
      try {
        const st = await fetchStocks(selectedUniverse);
        setStocks(st.stocks);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedUniverse]);

  const matches = useMemo(() => {
    if (!filters) return 0;
    return results.filter(r =>
      r.vcpScore >= filters.minScore &&
      (filters.gradeFilter.length === 0 || filters.gradeFilter.includes(r.setupGrade)) &&
      passesRvol(r.rvol, filters.rvolFilter) &&
      (!filters.strongStartOnly || r.strongStart === true)
    ).length;
  }, [results, filters]);

  const applyPreset = (name: string) => {
    if (!config || !filters) return;
    const p = config.presets[name];
    if (!p) return;
    setFilters({ ...filters, ...p });
  };

  const start = async () => {
    if (!filters || !stocks.length) return;
    // Any prior cached scan is now stale — wipe it before we start.
    clearState(VCP_PERSIST_KEY);
    setLastScanAt(null);
    setResults([]);
    setErrors(0);
    setProgress(0);
    setTotal(stocks.length);
    setCurrentSymbol('');
    setRecentSymbols([]);
    setScanning(true);
    const ac = new AbortController();
    abortRef.current = ac;
    const symbols = stocks;

    try {
      await startScan(symbols, filters, timeframe, {
        onProgress: p => {
          // flushSync forces React to render immediately so the user
          // sees each symbol update instead of batched-at-the-end.
          flushSync(() => {
            setProgress(p.current);
            setTotal(p.total);
            setCurrentSymbol(p.symbol);
            setRecentSymbols(prev => [...prev.slice(-9), p.symbol]);
          });
        },
        onResult:   r => setResults(prev => [...prev, r]),
        onError:    _ => setErrors(prev => prev + 1),
        onDone:     () => setScanning(false),
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
    setProgress(0);
    setTotal(0);
    setLastScanAt(null);
    clearState(VCP_PERSIST_KEY);
  };

  // Persist a completed / stopped scan so it survives a refresh.
  useEffect(() => {
    if (scanning) return;
    if (results.length === 0) return;
    const payload: PersistedVcpScan = {
      results,
      errors,
      progress,
      total,
      timeframe,
      selectedUniverse,
    };
    saveState(VCP_PERSIST_KEY, VCP_PERSIST_VER, payload);
    // Only record "last scan at" for scans that actually produced data.
    setLastScanAt(Date.now());
  }, [scanning, results, errors, progress, total, timeframe, selectedUniverse]);

  const downloadVcp = () => {
    if (!filters) return;
    const rows = applyVcpFilterSort(results, filters);
    if (rows.length === 0) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeUniverse = selectedUniverse.replace(/[^a-z0-9]+/gi, '_');
    downloadCsv(`vcp_${safeUniverse}_${timeframe}_${stamp}.csv`, vcpToCsv(rows));
  };

  if (!config || !filters) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-white/50 text-sm">
        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
        Loading configuration…
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <Header
        totalStocks={stocks.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mx-auto max-w-[1400px] px-6 py-6 flex flex-col lg:flex-row gap-5">
        {activeTab === 'vcp' && (
          <>
            <FilterPanel
              filters={filters}
              onFilters={setFilters}
              timeframe={timeframe}
              onTimeframe={setTimeframe}
              timeframes={config.timeframes}
              grades={config.grades}
              presets={config.presets}
              onPreset={applyPreset}
              totalStocks={stocks.length}
              universes={universes}
              selectedUniverse={selectedUniverse}
              onUniverseChange={setSelectedUniverse}
            />

            <main className="flex-1 space-y-4">
              <ScanControls
                scanning={scanning}
                progress={progress}
                total={total}
                currentSymbol={currentSymbol}
                recentSymbols={recentSymbols}
                errors={errors}
                matches={matches}
                onStart={start}
                onStop={stop}
                onDownload={downloadVcp}
                canDownload={matches > 0}
                lastScanAt={lastScanAt}
                onRescan={start}
                onClear={clearResults}
              />
              <ResultsGrid
                results={results}
                minScore={filters.minScore}
                gradeFilter={filters.gradeFilter}
                rvolFilter={filters.rvolFilter}
                strongStartOnly={filters.strongStartOnly}
              />
            </main>
          </>
        )}

        {activeTab === 'rvol' && (
          <RvolScreener universes={universes} />
        )}

        {activeTab === 'trend' && (
          <TrendTemplateScreener universes={universes} />
        )}
      </div>
    </div>
  );
}
