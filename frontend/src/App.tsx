import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import ScanControls from './components/ScanControls';
import ResultsGrid, { passesRvol } from './components/ResultsGrid';
import { fetchConfig, fetchStocks, fetchUniverses, startScan, type UniverseInfo } from './api';
import type { ConfigResponse, FilterConfig, StockRow, Timeframe, VCPResult } from './types';

export default function App() {
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
  const abortRef = useRef<AbortController | null>(null);

  // Load config + universe metadata once
  useEffect(() => {
    (async () => {
      try {
        const [cfg, us] = await Promise.all([fetchConfig(), fetchUniverses()]);
        setConfig(cfg);
        setFilters(cfg.defaultFilters);
        setUniverses(us);
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
      <Header totalStocks={stocks.length} />

      <div className="mx-auto max-w-[1400px] px-6 py-6 flex flex-col lg:flex-row gap-5">
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
          />
          <ResultsGrid
            results={results}
            minScore={filters.minScore}
            gradeFilter={filters.gradeFilter}
            rvolFilter={filters.rvolFilter}
            strongStartOnly={filters.strongStartOnly}
          />
        </main>
      </div>
    </div>
  );
}