import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { RvolResult, RvolScanConfig, StockRow } from '../../types';
import { fetchStocks, startRvolScan, type UniverseInfo } from '../../api';
import RvolControls from './RvolControls';
import RvolResultsTable from './RvolResultsTable';
import { applyRvolFilterSort, downloadCsv, rvolToCsv } from './csv';

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
  const abortRef = useRef<AbortController | null>(null);

  // Fallback: pick first available universe if 'All Stocks' isn't in the list
  useEffect(() => {
    if (!universes.length) return;
    if (!universes.some(u => u.name === selectedUniverse)) {
      setSelectedUniverse(universes[0].name);
    }
  }, [universes]);   // eslint-disable-line react-hooks/exhaustive-deps

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
    setResults([]);
    setErrors(0);
    setProcessed(0);
    setTotal(stocks.length);
    setCurrentSymbol('');
    setScanning(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await startRvolScan(stocks, cfg.lookback, {
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