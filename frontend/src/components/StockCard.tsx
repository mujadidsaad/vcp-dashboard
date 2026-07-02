import type { VCPResult } from '../types';

const GRADE_STYLES: Record<string, { badge: string; ring: string; num: string }> = {
  'A+ Confirmed': { badge: 'bg-accent text-white',            ring: 'ring-accent/40',       num: 'text-accent' },
  'A Watchlist':  { badge: 'bg-info/20 text-info border border-info/40',       ring: 'ring-info/25',         num: 'text-info' },
  'B Watchlist':  { badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/40', ring: 'ring-purple-500/25', num: 'text-purple-300' },
  'B Setup':      { badge: 'bg-violet-500/15 text-violet-300 border border-violet-500/35', ring: 'ring-violet-500/20', num: 'text-violet-300' },
  'C Early Setup':{ badge: 'bg-warn/15 text-warn border border-warn/40',       ring: 'ring-warn/25',         num: 'text-warn' },
  Rejected:       { badge: 'bg-white/5 text-white/40 border border-white/10',  ring: 'ring-white/5',         num: 'text-white/40' },
};

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'good' | 'warn' | 'bad' | 'accent' }) {
  const t =
    tone === 'good'   ? 'text-good' :
    tone === 'warn'   ? 'text-warn' :
    tone === 'bad'    ? 'text-bad' :
    tone === 'accent' ? 'text-accent' :
                        'text-white/85';
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-white/45">{label}</span>
      <span className={`stat-num text-[12px] font-medium ${t}`}>{value}</span>
    </div>
  );
}

function Tag({ label, on }: { label: string; on: boolean }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium
      ${on ? 'bg-good/10 border-good/30 text-good' : 'bg-white/[0.03] border-white/10 text-white/30'}`}>
      {label}
    </span>
  );
}

// Simple sparkline placeholder based on score
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-accent to-accent-soft"
        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
      />
    </div>
  );
}

export default function StockCard({ r }: { r: VCPResult }) {
  const style = GRADE_STYLES[r.setupGrade] ?? GRADE_STYLES.Rejected;
  const priceUp = r.priceIncrease.trim().startsWith('-') ? false : true;

  return (
    <div className={`panel p-4 space-y-3 ring-1 ${style.ring} hover:ring-white/20 transition`}>
      {/* Top */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[15px] font-semibold text-white tracking-tight">{r.symbol}</div>
          <div className="text-[10px] text-white/40 font-mono mt-0.5">
            {r.yahooSymbol} · {r.analysisDate}
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${style.badge}`}>
            {r.setupGrade}
          </div>
          <div className={`stat-num text-3xl font-bold leading-none mt-1 ${style.num}`}>
            {r.vcpScore}
          </div>
        </div>
      </div>

      <ScoreBar score={r.vcpScore} />

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-4">
        <div>
          <Row label="Contractions" value={r.contractions} tone={r.contractions >= 2 ? 'accent' : undefined} />
          <Row label="Max Contract" value={r.maxContraction || '—'} />
          <Row label="Latest" value={r.latestContraction || '—'} />
          <Row label="Volatility ↓" value={r.volatilityDecrease} />
          <Row label="Volume Dry" value={r.volumeDryUp || '—'} tone={r.volumeContraction ? 'good' : undefined} />
        </div>
        <div>
          <Row label="Dist. Resistance" value={r.distanceFromResistance || '—'} tone={r.nearBreakout ? 'accent' : undefined} />
          <Row label="Dist. 52w High" value={r.distanceFrom52wHigh || '—'} />
          <Row label="Price ∆" value={r.priceIncrease} tone={priceUp ? 'good' : 'bad'} />
          <Row label="RSI" value={r.rsiValue} />
          <Row
            label="RVOL"
            value={r.rvol ? `${r.rvol.toFixed(2)}x` : '—'}
            tone={r.rvol >= 3 ? 'accent' : r.rvol >= 1 ? 'good' : undefined}
          />
          <Row label="Breakout" value={r.confirmedBreakout ? 'Yes' : 'No'} tone={r.confirmedBreakout ? 'good' : undefined} />
        </div>
      </div>

      {/* Bool tag chips */}
      <div className="flex flex-wrap gap-1 pt-1">
        <Tag label="MA50"      on={r.priceAboveMa50} />
        <Tag label="MA200"     on={r.priceAboveMa200} />
        <Tag label="EMA20>50"  on={r.ema20AboveEma50} />
        <Tag label="EMA50>200" on={r.ema50AboveEma200} />
        <Tag label="VolContract" on={r.volumeContraction} />
        <Tag label="AnomalyFree" on={r.anomalyFree} />
        <Tag label="StrongStart" on={!!r.strongStart} />
      </div>

      <p className="text-[10.5px] text-white/40 leading-snug border-t border-white/5 pt-2 line-clamp-2">
        {r.reason}
      </p>
    </div>
  );
}