import type { ConfigResponse, FilterConfig, StockRow, VCPResult } from './types';

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

export interface ScanEvents {
  onProgress?: (p: { current: number; total: number; symbol: string }) => void;
  onResult?: (r: VCPResult) => void;
  onError?: (e: { symbol: string; reason: string }) => void;
  onDone?: (d: { total: number; processed: number }) => void;
}

/**
 * POST /api/scan (SSE). We parse the SSE stream manually from a fetch body
 * because EventSource does not support POST bodies.
 */
export async function startScan(
  symbols: StockRow[],
  filters: FilterConfig,
  timeframe: string,
  events: ScanEvents,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',   // required by sse-starlette
    },
    body: JSON.stringify({ symbols, filters, timeframe }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`scan: ${res.status}`);

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
    }
  };

  // SSE spec allows LF, CRLF, or CR as line terminators. Normalise before
  // splitting so we don't miss events when the server (sse-starlette) sends
  // \r\n\r\n and the parser is looking for \n\n.
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
      // Advance past whichever boundary matched (\n\n = 2, \r\n\r\n = 4).
      const advance = buffer.startsWith('\r\n\r\n', sep) ? 4 : 2;
      buffer = buffer.slice(sep + advance);

      let event = 'message';
      let data = '';
      // Handle both \r\n and \n line endings within the chunk.
      for (const rawLine of chunk.split(/\r?\n/)) {
        const line = rawLine;
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      dispatch(event, data);
    }
  }
}