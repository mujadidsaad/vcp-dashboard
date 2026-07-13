import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { RvolResult, RvolScanConfig, StockRow } from '../../types';
import { fetchStocks, startRvolScan, type UniverseInfo } from '../../api';
import { clearState, loadState, saveState } from '../../persist';
import RvolControls from './RvolControls';
import RvolResultsTable from './RvolResultsTable';
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
  rvolFlagPct: 150, // more useful than the Pine default of 8; user can lower
  chgFlagPct: 1.5,
  gatePct: 50,
  showRvolAs: 'Percent',
  sortBy: 'RVOL',
  strongStartOnly: false,
};

interface Props {
  universes: UniverseInfo[];
}

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

  // Rehydrate the last RVOL scan on first mount
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

  // Fallback: pick first available universe if the persisted / default one isn't in the list.
  // Only kick in AFTER rehydration so we don't fight the cached universe.
  useEffect(() => {
    if (!hydrated) return;
    if (!universes.length) return;
    if (!universes.some(u => u.name === selectedUniverse)) {
      setSelectedUniverse(universes[0].name);
    }
  }, [hydrated, universes]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Load the selected universe's stock list
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
    // Any prior cached scan is now stale — wipe it before we start.
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

  // Persist a completed / stopped scan so it survives a refresh.
  useEffect(() => {
    if (!hydrated) return;
    if (scanning) return;
    if (results.length === 0) return;
    const payload: PersistedRvolScan = {
      results,
      errors,
      processed,
      total,
      cfg,
      selectedUniverse,
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

  return (
    <main className="flex-1 space-y-4">
      <RvolControls
        cfg={cfg}
        onCfg={setCfg}
        universes={universes}
        selectedUniverse={selectedUniverse}
        onUniverseChange={setSelectedUniverse}
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
  );
}