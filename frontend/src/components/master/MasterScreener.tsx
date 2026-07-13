import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type {
  MasterConfig,
  MasterResult,
  MasterVerdict,
  StockRow,
  TrendTemplateBenchmark,
} from '../../types';
import { fetchStocks, startMasterScan, type UniverseInfo } from '../../api';
import { clearState, loadState, saveState } from '../../persist';
import MasterControls from './MasterControls';
import MasterResultsTable from './MasterResultsTable';
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

interface Props {
  universes: UniverseInfo[];
}

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

  // Fallback universe if persisted one isn't available
  useEffect(() => {
    if (!hydrated) return;
    if (!universes.length) return;
    if (!universes.some(u => u.name === selectedUniverse)) {
      setSelectedUniverse(universes[0].name);
    }
  }, [hydrated, universes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load stocks when universe changes
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

  // Persist a completed / stopped scan
  useEffect(() => {
    if (!hydrated) return;
    if (scanning) return;
    if (results.length === 0) return;
    const payload: PersistedMasterScan = {
      results,
      errors,
      processed,
      total,
      cfg,
      selectedUniverse,
      benchmark,
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

  return (
    <main className="flex-1 space-y-4">
      <MasterControls
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
  );
}