import type {
  ConfigResponse,
  FilterConfig,
  MasterConfig,
  MasterResult,
  RvolResult,
  StockRow,
  TrendTemplateBenchmark,
  TrendTemplateResult,
  VCPResult,
} from './types';

// In dev, Vite proxies /api/* to http://localhost:8000 (see vite.config.ts).
// In production (Vercel), set VITE_API_BASE=https://your-backend.onrender.com
const BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchConfig(): Promise<ConfigResponse> {
  const r = await fetch(`${BASE}/api/config`);
  if (!r.ok) throw new Error(`config: ${r.status}`);
  return r.json();
}

export async function fetchStocks(universeName?: string): Promise<{ count: number; stocks: StockRow[]; universe: string }> {
  const url = universeName
    ? `${BASE}/api/stocks?universe_name=${encodeURIComponent(universeName)}`
    : `${BASE}/api/stocks`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`stocks: ${r.status}`);
  return r.json();
}

export interface UniverseInfo { name: string; count: number }

export async function fetchUniverses(): Promise<UniverseInfo[]> {
  const r = await fetch(`${BASE}/api/universes`);
  if (!r.ok) throw new Error(`universes: ${r.status}`);
  const data = await r.json();
  return data.universes as UniverseInfo[];
}

export interface ScanEvents<TResult = VCPResult> {
  onProgress?: (p: { current: number; total: number; symbol: string }) => void;
  onResult?: (r: TResult) => void;
  onError?: (e: { symbol: string; reason: string }) => void;
  onDone?: (d: { total: number; processed: number }) => void;
  /**
   * Optional catch-all for screener-specific event names (e.g. the Trend
   * Template endpoint emits a `benchmark` event before results). Keys are
   * event names; values receive the parsed payload.
   */
  extraEvents?: Record<string, (payload: any) => void>;
}

// ----- shared SSE stream parser -----
async function consumeSse<T>(
  url: string,
  body: unknown,
  events: ScanEvents<T>,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`sse ${url}: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (event: string, data: string) => {
    if (!data) return;
    let payload: unknown;
    try { payload = JSON.parse(data); } catch (e) {
      console.warn('[SSE] failed to parse', event, data.slice(0, 100), e);
      return;
    }
    console.debug('[SSE]', event, payload);
    switch (event) {
      case 'progress': events.onProgress?.(payload as any); break;
      case 'result':   events.onResult?.(payload as any); break;
      case 'error':    events.onError?.(payload as any); break;
      case 'done':     events.onDone?.(payload as any); break;
      default:
        events.extraEvents?.[event]?.(payload);
        break;
    }
  };

  const findBoundary = (s: string): number => {
    const a = s.indexOf('\n\n');
    const b = s.indexOf('\r\n\r\n');
    if (a === -1) return b;
    if (b === -1) return a;
    return Math.min(a, b);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = findBoundary(buffer)) !== -1) {
      const chunk = buffer.slice(0, sep);
      const advance = buffer.startsWith('\r\n\r\n', sep) ? 4 : 2;
      buffer = buffer.slice(sep + advance);

      let event = 'message';
      let data = '';
      for (const rawLine of chunk.split(/\r?\n/)) {
        const line = rawLine;
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      dispatch(event, data);
    }
  }
}

/** POST /api/scan (VCP screener, SSE). */
export async function startScan(
  symbols: StockRow[],
  filters: FilterConfig,
  timeframe: string,
  events: ScanEvents<VCPResult>,
  signal?: AbortSignal
): Promise<void> {
  return consumeSse<VCPResult>(
    `${BASE}/api/scan`,
    { symbols, filters, timeframe },
    events,
    signal,
  );
}

/** POST /api/scan/rvol (RVOL screener, SSE). */
export async function startRvolScan(
  symbols: StockRow[],
  lookback: number,
  events: ScanEvents<RvolResult>,
  signal?: AbortSignal
): Promise<void> {
  return consumeSse<RvolResult>(
    `${BASE}/api/scan/rvol`,
    { symbols, lookback },
    events,
    signal,
  );
}

/** POST /api/scan/trend-template (Minervini Trend Template screener, SSE).
 *
 * In addition to the standard events, the backend emits ONE `benchmark`
 * event at the very start of the stream with `{ benchmarkSymbol, return6m,
 * available }` — pass an `onBenchmark` callback to receive it.
 */
export async function startTrendTemplateScan(
  symbols: StockRow[],
  benchmarkSymbol: string,
  benchmarkExchange: string,
  events: ScanEvents<TrendTemplateResult> & {
    onBenchmark?: (b: TrendTemplateBenchmark) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const { onBenchmark, extraEvents, ...rest } = events;
  return consumeSse<TrendTemplateResult>(
    `${BASE}/api/scan/trend-template`,
    { symbols, benchmarkSymbol, benchmarkExchange },
    {
      ...rest,
      extraEvents: {
        ...(extraEvents ?? {}),
        benchmark: (p: TrendTemplateBenchmark) => onBenchmark?.(p),
      },
    },
    signal,
  );
}

/** POST /api/scan/master (Master screener — fuses Trend + VCP + RVOL, SSE).
 *
 * Emits `benchmark` first, then per-symbol `progress`/`result`/`error`, then
 * `done` with a per-verdict breakdown.
 */
export async function startMasterScan(
  symbols: StockRow[],
  cfg: MasterConfig,
  events: ScanEvents<MasterResult> & {
    onBenchmark?: (b: TrendTemplateBenchmark) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const { onBenchmark, extraEvents, ...rest } = events;
  return consumeSse<MasterResult>(
    `${BASE}/api/scan/master`,
    {
      symbols,
      benchmarkSymbol:     cfg.benchmarkSymbol,
      benchmarkExchange:   'NSE',
      rvolLookback:        cfg.rvolLookback,
      readyRvol:           cfg.readyRvol,
      watchlistRvol:       cfg.watchlistRvol,
      requireStrongStart:  cfg.requireStrongStart,
    },
    {
      ...rest,
      extraEvents: {
        ...(extraEvents ?? {}),
        benchmark: (p: TrendTemplateBenchmark) => onBenchmark?.(p),
      },
    },
    signal,
  );
}
