import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type {
  StockRow,
  TrendTemplateBenchmark,
  TrendTemplateConfig,
  TrendTemplateResult,
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

interface Props {
  universes: UniverseInfo[];
}

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

  // Rehydrate the last Trend Template scan on first mount
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

  // Fallback: pick first available universe if the persisted / default one isn't in the list.
  useEffect(() => {
    if (!hydrated) return;
    if (!universes.length) return;
    if (!universes.some(u => u.name === selectedUniverse)) {
      setSelectedUniverse(universes[0].name);
    }
  }, [hydrated, universes]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Load stocks whenever the selected universe changes
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

  // Persist a completed / stopped scan so it survives a refresh.
  useEffect(() => {
    if (!hydrated) return;
    if (scanning) return;
    if (results.length === 0) return;
    const payload: PersistedTrendScan = {
      results,
      errors,
      processed,
      total,
      cfg,
      selectedUniverse,
      benchmark,
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
          { label: 'Stage 1', value: stage1, tone: 'muted'  },
          { label: 'Stage 2', value: stage2, tone: 'good'   },
          { label: 'Stage 3', value: stage3, tone: 'warn'   },
          { label: 'Stage 4', value: stage4, tone: 'bad'    },
        ]}
        onClear={results.length > 0 ? clearResults : undefined}
        scanning={scanning}
      />
      <main className="flex-1 space-y-4">
      <TrendControls
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
        stage2Count={stage2Count}
      />
      <TrendResultsTable results={results} cfg={cfg} />
      </main>
    </>
  );
}
