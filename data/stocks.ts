import type { StockRow } from '@/types';

// Stock universe is now loaded dynamically from data/data.csv via /api/stocks
// This file is kept as a fallback only.
export const STOCKS: StockRow[] = [];

export function toYahooSymbol(symbol: string, exchange: string): string {
  const raw = symbol.trim().toUpperCase().replace(/\s/g, '');
  const indexMap: Record<string, string> = {
    NIFTY: '^NSEI', NIFTY50: '^NSEI', 'NIFTY 50': '^NSEI',
    BANKNIFTY: '^NSEBANK', NIFTYBANK: '^NSEBANK',
    SENSEX: '^BSESN',
  };
  if (indexMap[raw]) return indexMap[raw];
  if (raw.startsWith('^') || raw.endsWith('.NS') || raw.endsWith('.BO')) return raw;
  return `${raw}.${exchange.toUpperCase()}`;
}

export function alternateExchange(exchange: string): string {
  return exchange.toUpperCase() === 'NS' ? 'BO' : 'NS';
}