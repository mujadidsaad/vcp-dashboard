/**
 * SignalDesk landing page.
 *
 * First page shown on first visit and available under the "Home" pill.
 * Purpose: marketing / orientation.
 *   - Animated hero (typed title, greeting, blobs, moving grid)
 *   - Live-ish market ticker
 *   - Animated candlestick preview
 *   - Feature highlights for the four scanners (each links to Master or Docs)
 *   - Two CTAs: "Open Master screener" and "Read the docs"
 *
 * All animations respect prefers-reduced-motion.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface Props {
  /** Called by the primary CTA — opens the Master screener (and dismisses first-visit). */
  onGetStarted: () => void;
  /** Opens the docs / How to Use tab. */
  onOpenDocs: () => void;
  /** Whether this page was reached via the nav pill (vs. the first-visit auto-landing). */
  fromNav?: boolean;
}

/* --------------------------- tiny SVG icons --------------------------- */
type IconProps = { className?: string };
const Icons = {
  target: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  trend: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  contract: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <path d="M3 6h18M5 12h14M7 18h10" strokeLinecap="round" />
    </svg>
  ),
  bolt: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
    </svg>
  ),
  book: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5z" />
      <path d="M8 3v18" />
    </svg>
  ),
};

/* ---------------------- hooks (motion-friendly) ---------------------- */

function useReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setPrefers(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return prefers;
}

function useTyped(text: string, speed = 90, reduced = false): string {
  const [out, setOut] = useState(reduced ? text : '');
  useEffect(() => {
    if (reduced) { setOut(text); return; }
    let i = 0;
    setOut('');
    const iv = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, reduced]);
  return out;
}

function useGreeting(): string {
  const compute = () => {
    const h = new Date().getHours();
    if (h < 5)  return 'Late night trader';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  };
  const [g, setG] = useState(compute);
  useEffect(() => {
    const iv = setInterval(() => setG(compute()), 60_000);
    return () => clearInterval(iv);
  }, []);
  return g;
}

function useReveal<T extends HTMLElement>(): [(el: T | null) => void, boolean] {
  const [visible, setVisible] = useState(false);
  const ref = useRef<T | null>(null);
  const set = (el: T | null) => {
    ref.current = el;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      }
    }, { threshold: 0.15 });
    obs.observe(el);
  };
  return [set, visible];
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  const [setRef, visible] = useReveal<HTMLDivElement>();
  const style: React.CSSProperties = reduced ? {} : {
    transitionDelay: `${delay}ms`,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    opacity: visible ? 1 : 0,
  };
  return (
    <div ref={setRef} className={reduced ? '' : 'transition duration-700 ease-out'} style={style}>
      {children}
    </div>
  );
}

/* --------------------------- market ticker --------------------------- */
interface TickerItem { symbol: string; pct: number }
const SEED_TICKER: TickerItem[] = [
  { symbol: 'NIFTY',      pct: 0.42 },
  { symbol: 'BANKNIFTY',  pct: -0.15 },
  { symbol: 'RELIANCE',   pct: 1.10 },
  { symbol: 'TCS',        pct: 0.75 },
  { symbol: 'HDFCBANK',   pct: -0.32 },
  { symbol: 'INFY',       pct: 0.90 },
  { symbol: 'ITC',        pct: 0.22 },
  { symbol: 'LT',         pct: 1.55 },
  { symbol: 'BAJFINANCE', pct: -0.68 },
  { symbol: 'ADANIENT',   pct: 2.10 },
  { symbol: 'SBIN',       pct: 0.11 },
  { symbol: 'ONGC',       pct: -0.44 },
];

function Ticker({ reduced }: { reduced: boolean }) {
  const [items, setItems] = useState<TickerItem[]>(SEED_TICKER);
  useEffect(() => {
    if (reduced) return;
    const iv = setInterval(() => {
      setItems(prev => prev.map(it => ({
        ...it,
        pct: Number((it.pct + (Math.random() - 0.5) * 0.35).toFixed(2)),
      })));
    }, 2200);
    return () => clearInterval(iv);
  }, [reduced]);

  const row = items.concat(items);
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-bg to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent z-10" />
      <div
        className={`flex items-center gap-6 py-2 whitespace-nowrap ${reduced ? '' : 'sd-marquee'}`}
        style={{ animationDuration: '40s' }}
      >
        {row.map((it, idx) => {
          const up = it.pct >= 0;
          return (
            <span key={idx} className="text-[11px] tracking-wide inline-flex items-center gap-2">
              <span className="text-white/60 font-medium">{it.symbol}</span>
              <span className={`stat-num font-semibold ${up ? 'text-good' : 'text-bad'}`}>
                {up ? '+' : ''}{it.pct.toFixed(2)}%
              </span>
              <span className="text-white/15">•</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------ candlestick preview ----------------------- */
interface Candle { o: number; h: number; l: number; c: number }
function seedCandles(n: number): Candle[] {
  const out: Candle[] = [];
  let last = 100;
  for (let i = 0; i < n; i++) {
    const drift = (Math.random() - 0.5) * 2.4 + (i > n * 0.6 ? 0.6 : 0);
    const o = last;
    const c = Math.max(60, o + drift);
    const h = Math.max(o, c) + Math.random() * 1.2;
    const l = Math.min(o, c) - Math.random() * 1.2;
    out.push({ o, h, l, c });
    last = c;
  }
  return out;
}

function LiveChart({ reduced }: { reduced: boolean }) {
  const [candles, setCandles] = useState<Candle[]>(() => seedCandles(24));
  useEffect(() => {
    if (reduced) return;
    const iv = setInterval(() => {
      setCandles(prev => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1];
        const drift = (Math.random() - 0.45) * 2.6;
        const o = last.c;
        const c = Math.max(60, o + drift);
        const h = Math.max(o, c) + Math.random() * 1.2;
        const l = Math.min(o, c) - Math.random() * 1.2;
        next.push({ o, h, l, c });
        return next;
      });
    }, 1200);
    return () => clearInterval(iv);
  }, [reduced]);

  const { minY, maxY } = useMemo(() => {
    let minY = Infinity, maxY = -Infinity;
    for (const k of candles) { minY = Math.min(minY, k.l); maxY = Math.max(maxY, k.h); }
    const pad = (maxY - minY) * 0.1 || 1;
    return { minY: minY - pad, maxY: maxY + pad };
  }, [candles]);

  const W = 240, H = 120, N = candles.length;
  const cw = W / N;
  const cwBody = cw * 0.6;
  const scaleY = (v: number): number => H - ((v - minY) / (maxY - minY)) * H;

  const last = candles[N - 1];
  const first = candles[0];
  const chg = ((last.c - first.o) / first.o) * 100;

  return (
    <div className="w-[260px] h-[190px] rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/60 font-semibold">VCP breakout</span>
          <span className="px-1.5 py-[1px] rounded-md text-[9px] font-bold uppercase tracking-[0.14em] border border-good/40 text-good bg-good/10">S2</span>
        </div>
        <div className={`text-[10px] font-semibold ${chg >= 0 ? 'text-good' : 'text-bad'}`}>
          {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full h-[110px]">
        {candles.map((k, i) => {
          const x = i * cw + (cw - cwBody) / 2;
          const y1 = scaleY(k.h), y2 = scaleY(k.l);
          const yo = scaleY(k.o), yc = scaleY(k.c);
          const up = k.c >= k.o;
          const color = up ? 'rgb(74 222 128)' : 'rgb(248 113 113)';
          const bodyTop = Math.min(yo, yc);
          const bodyH = Math.max(1.5, Math.abs(yc - yo));
          return (
            <g key={i}>
              <line x1={x + cwBody / 2} x2={x + cwBody / 2} y1={y1} y2={y2} stroke={color} strokeWidth={1} />
              <rect x={x} y={bodyTop} width={cwBody} height={bodyH} fill={color} rx={0.5} />
            </g>
          );
        })}
      </svg>

      {/* footer: tiny volume ribbon + verdict hint */}
      <div className="mt-1 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-white/40 uppercase tracking-[0.14em]">RVOL</span>
          <span className="stat-num text-good font-semibold">1.9x</span>
        </div>
        <div className="flex items-center gap-1 text-good">
          <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Ready</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------- "What you get" interactive block -------------------- */

interface FeatureSpec {
  key: 'master' | 'trend' | 'vcp' | 'rvol';
  title: string;
  tagline: string;
  ring: string;   // border color
  bg: string;     // background tint
  text: string;   // accent text color
  icon: ReactNode;
  ctaLabel: string;
  onGo: () => void;
  // metric shown on the preview card
  metric: { label: string; value: string; hint: string };
  // 4 small stats shown in a 2×2 grid on the right pane
  stats: Array<{ label: string; value: string; tone?: 'good' | 'warn' | 'info' | 'accent' | 'bad' | 'muted' }>;
}

/**
 * Small canvas rendered inside the interactive preview stage.
 * Each feature has its own dynamic visual (sparkline, funnel, bars).
 */
function PreviewStage({ f, reduced }: { f: FeatureSpec; reduced: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${f.ring} ${f.bg} p-4 h-[220px]`}>
      {/* animated backdrop */}
      {!reduced && (
        <>
          <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/[0.06] blur-2xl animate-pulse" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] sd-grid" aria-hidden />
        </>
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg border ${f.ring} bg-white/[0.02] flex items-center justify-center ${f.text}`}>
            {f.icon}
          </div>
          <div className={`text-[12px] font-bold uppercase tracking-[0.14em] ${f.text}`}>{f.title}</div>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.14em] border ${f.ring} bg-white/[0.02] ${f.text}`}>
          Live
        </span>
      </div>

      {/* per-feature preview canvas */}
      <div className="relative mt-3 h-[100px]">
        {f.key === 'master'  && <PreviewMaster reduced={reduced} />}
        {f.key === 'trend'   && <PreviewTrend  reduced={reduced} />}
        {f.key === 'vcp'     && <PreviewVcp    reduced={reduced} />}
        {f.key === 'rvol'    && <PreviewRvol   reduced={reduced} />}
      </div>

      {/* footer metric */}
      <div className="relative mt-2 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{f.metric.label}</div>
          <div className={`stat-num text-xl font-semibold ${f.text}`}>{f.metric.value}</div>
        </div>
        <div className="text-[11px] text-white/40">{f.metric.hint}</div>
      </div>
    </div>
  );
}

/** Master verdict funnel — animated bar-fill by verdict class. */
function PreviewMaster({ reduced }: { reduced: boolean }) {
  const [w, setW] = useState({ ready: 0, watch: 0, setup: 0, hold: 0, skip: 0 });
  useEffect(() => {
    const target = { ready: 12, watch: 22, setup: 30, hold: 18, skip: 48 };
    if (reduced) { setW(target); return; }
    let n = 0;
    const iv = setInterval(() => {
      n += 1;
      setW({
        ready: Math.min(target.ready, n * 1.5),
        watch: Math.min(target.watch, n * 2.2),
        setup: Math.min(target.setup, n * 2.8),
        hold:  Math.min(target.hold,  n * 2.0),
        skip:  Math.min(target.skip,  n * 3.6),
      });
      if (n > 30) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [reduced]);

  const Row = ({ label, val, color }: { label: string; val: number; color: string }) => (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[10px] uppercase tracking-[0.14em] text-white/50">{label}</span>
      <div className="flex-1 h-3 rounded-md bg-white/[0.05] overflow-hidden">
        <div className={`h-full ${color} transition-[width] duration-300`} style={{ width: `${val}%` }} />
      </div>
      <span className="stat-num text-[10px] text-white/70 w-8 text-right">{Math.round(val)}</span>
    </div>
  );
  return (
    <div className="space-y-1.5">
      <Row label="Ready"  val={w.ready} color="bg-good" />
      <Row label="Watch"  val={w.watch} color="bg-info" />
      <Row label="Setup"  val={w.setup} color="bg-accent" />
      <Row label="Hold"   val={w.hold}  color="bg-warn" />
      <Row label="Skip"   val={w.skip}  color="bg-white/25" />
    </div>
  );
}

/** Trend Template — SMA lines animation. */
function PreviewTrend({ reduced }: { reduced: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reduced) { setPhase(1); return; }
    let f = 0;
    const iv = setInterval(() => {
      f = Math.min(1, f + 0.03);
      setPhase(f);
      if (f >= 1) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [reduced]);

  // Precomputed points, revealed via stroke-dasharray
  const paths = {
    price:  'M0 78 L20 72 L40 68 L60 55 L80 52 L100 42 L120 40 L140 33 L160 28 L180 22 L200 20 L220 15 L240 10',
    sma50:  'M0 74 L20 70 L40 66 L60 58 L80 52 L100 46 L120 42 L140 36 L160 32 L180 28 L200 24 L220 22 L240 20',
    sma150: 'M0 82 L40 76 L80 70 L120 62 L160 54 L200 48 L240 42',
    sma200: 'M0 84 L40 80 L80 76 L120 70 L160 64 L200 58 L240 52',
  };
  return (
    <svg viewBox="0 0 240 100" className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="tr-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(74 222 128)" stopOpacity="0.4" />
          <stop offset="1" stopColor="rgb(74 222 128)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* filled area under price */}
      <path d={`${paths.price} L240 100 L0 100 Z`} fill="url(#tr-fill)" opacity={phase} />
      <path d={paths.sma200} stroke="rgba(255,255,255,0.35)" strokeWidth={1} strokeDasharray="240" strokeDashoffset={240 - 240 * phase} />
      <path d={paths.sma150} stroke="rgba(122,168,255,0.7)"  strokeWidth={1.25} strokeDasharray="240" strokeDashoffset={240 - 240 * phase} />
      <path d={paths.sma50}  stroke="rgba(255,206,84,0.85)"  strokeWidth={1.25} strokeDasharray="240" strokeDashoffset={240 - 240 * phase} />
      <path d={paths.price}  stroke="rgb(74 222 128)"        strokeWidth={2}    strokeDasharray="260" strokeDashoffset={260 - 260 * phase} />
      {/* Stage 2 badge (drawn last so it sits on top) */}
      <g opacity={phase}>
        <rect x="196" y="4" width="40" height="14" rx="3" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.5)" />
        <text x="216" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="rgb(74 222 128)">STAGE 2</text>
      </g>
    </svg>
  );
}

/** VCP — contractions visualized as shrinking bars. */
function PreviewVcp({ reduced }: { reduced: boolean }) {
  const bars = useMemo(() => [46, 36, 28, 22, 16, 12, 20, 30], []);
  const [reveal, setReveal] = useState(0);
  useEffect(() => {
    if (reduced) { setReveal(bars.length); return; }
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setReveal(i);
      if (i >= bars.length) clearInterval(iv);
    }, 120);
    return () => clearInterval(iv);
  }, [reduced, bars.length]);

  return (
    <div className="flex items-end justify-between h-full gap-1.5 px-1">
      {bars.map((h, i) => {
        const active = i < reveal;
        const breakout = i === bars.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${
                breakout ? 'bg-good' : 'bg-purple-500/60'
              }`}
              style={{ height: `${active ? h : 4}px` }}
            />
            <div className="w-1 h-1 rounded-full bg-white/20" />
          </div>
        );
      })}
    </div>
  );
}

/** RVOL — vertical bars, last one flashes as breakout. */
function PreviewRvol({ reduced }: { reduced: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const iv = setInterval(() => setTick(t => t + 1), 900);
    return () => clearInterval(iv);
  }, [reduced]);

  const heights = useMemo(() => {
    const base = [20, 22, 18, 25, 30, 26, 22, 28, 34, 40, 48, 62, 84];
    return base.map(b => b + ((tick * 3) % 12));
  }, [tick]);

  return (
    <div className="flex items-end justify-between h-full gap-1 px-1">
      {heights.map((h, i) => {
        const hot = i === heights.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-md transition-all duration-500 ${
              hot ? 'bg-warn' : 'bg-warn/40'
            }`}
            style={{ height: `${Math.min(90, h)}px` }}
          />
        );
      })}
    </div>
  );
}

/** Feature tile on the right (click to select). */
function FeatureTile({
  spec, active, onSelect,
}: {
  spec: FeatureSpec;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onSelect}
      className={
        `text-left rounded-xl border p-3 transition-all duration-200 flex items-center gap-3 flex-1 w-full min-h-[68px] ` +
        (active
          ? `${spec.ring} ${spec.bg} shadow-lg -translate-y-0.5`
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20')
      }
    >
      <div className={`w-9 h-9 rounded-lg border ${spec.ring} bg-white/[0.02] flex items-center justify-center ${spec.text}`}>
        {spec.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[12px] font-bold uppercase tracking-[0.14em] ${spec.text}`}>{spec.title}</div>
        <div className="text-[11.5px] text-white/60 truncate">{spec.tagline}</div>
      </div>
      <div className={`transition-transform ${active ? 'translate-x-0.5' : ''}`}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3.5 h-3.5 ${active ? spec.text : 'text-white/30'}`}>
          <path d="M6 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}

function WhatYouGet({
  onGetStarted, onOpenDocs, reduced,
}: {
  onGetStarted: () => void;
  onOpenDocs: () => void;
  reduced: boolean;
}) {
  const specs: FeatureSpec[] = useMemo(() => [
    {
      key: 'master',
      title: 'Master',
      tagline: 'One verdict per stock: READY, WATCH, SETUP, HOLD or SKIP.',
      ring: 'border-accent/40', bg: 'bg-accent/10', text: 'text-accent',
      icon: <Icons.target className="w-5 h-5" />,
      ctaLabel: 'Open Master',
      onGo: onGetStarted,
      metric: { label: 'Verdict', value: 'READY', hint: '12 in view · Nifty 200' },
      stats: [
        { label: 'Ready',  value: '12', tone: 'good'   },
        { label: 'Watch',  value: '22', tone: 'info'   },
        { label: 'Setup',  value: '30', tone: 'accent' },
        { label: 'Skip',   value: '48', tone: 'muted'  },
      ],
    },
    {
      key: 'trend',
      title: 'Trend',
      tagline: 'Minervini\'s 8 rules + Weinstein stages. Only Stage 2 trades.',
      ring: 'border-info/40', bg: 'bg-info/10', text: 'text-info',
      icon: <Icons.trend className="w-5 h-5" />,
      ctaLabel: 'Learn more',
      onGo: onOpenDocs,
      metric: { label: 'Score', value: '8 / 8', hint: 'Stage 2 · RS > Bench' },
      stats: [
        { label: 'SMA50 > 150', value: '✓', tone: 'good'   },
        { label: '150 > 200',   value: '✓', tone: 'good'   },
        { label: '200 rising',  value: '✓', tone: 'good'   },
        { label: 'RS > Bench',  value: '✓', tone: 'good'   },
      ],
    },
    {
      key: 'vcp',
      title: 'VCP',
      tagline: 'Volatility contraction — tight bases with volume drying up.',
      ring: 'border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-300',
      icon: <Icons.contract className="w-5 h-5" />,
      ctaLabel: 'Learn more',
      onGo: onOpenDocs,
      metric: { label: 'Grade', value: 'A+', hint: '92 / 100 · 3 contractions' },
      stats: [
        { label: 'Contractions', value: '3',   tone: 'info'   },
        { label: 'Latest depth', value: '4%',  tone: 'good'   },
        { label: 'Vol dry-up',   value: 'Yes', tone: 'good'   },
        { label: 'Near pivot',   value: '2%',  tone: 'accent' },
      ],
    },
    {
      key: 'rvol',
      title: 'RVOL',
      tagline: 'Relative volume + Strong Start — confirmation on breakout day.',
      ring: 'border-warn/40', bg: 'bg-warn/10', text: 'text-warn',
      icon: <Icons.bolt className="w-5 h-5" />,
      ctaLabel: 'Learn more',
      onGo: onOpenDocs,
      metric: { label: 'RVOL', value: '2.4x', hint: 'Strong Start ✓ · +3.2%' },
      stats: [
        { label: 'RVOL',         value: '2.4x', tone: 'good'   },
        { label: 'Chg%',         value: '+3.2%', tone: 'good'  },
        { label: 'Strong Start', value: 'Yes',  tone: 'good'   },
        { label: '20d avg',      value: '2.1M', tone: 'muted'  },
      ],
    },
  ], [onGetStarted, onOpenDocs]);

  const [active, setActive] = useState<FeatureSpec>(specs[0]);
  const [paused, setPaused] = useState(false);

  // Auto-cycle every 3.5s unless user interacted (hover/click)
  useEffect(() => {
    if (reduced || paused) return;
    const iv = setInterval(() => {
      setActive(prev => {
        const idx = specs.findIndex(s => s.key === prev.key);
        return specs[(idx + 1) % specs.length];
      });
    }, 3500);
    return () => clearInterval(iv);
  }, [specs, paused, reduced]);

  const toneClass = (tone?: string): string => {
    switch (tone) {
      case 'good':   return 'text-good';
      case 'warn':   return 'text-warn';
      case 'bad':    return 'text-bad';
      case 'info':   return 'text-info';
      case 'accent': return 'text-accent';
      case 'muted':  return 'text-white/50';
      default:       return 'text-white/85';
    }
  };

  return (
    <section
      className="panel p-5 md:p-6 space-y-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-white">What you get</h2>
          <div className="text-[12px] text-white/45">
            Hover a card or wait — the preview auto-cycles through all four screeners.
          </div>
        </div>
        <button onClick={onOpenDocs} className="text-[12px] text-accent hover:opacity-90 inline-flex items-center gap-1">
          Read the docs
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
            <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left: live preview */}
        <div className="flex flex-col gap-3">
          <PreviewStage f={active} reduced={reduced} />

          {/* Detail row: 4 stats + CTA */}
          <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {active.stats.map((s, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 truncate">{s.label}</div>
                  <div className={`stat-num text-sm font-semibold ${toneClass(s.tone)}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-[11.5px] text-white/60 leading-snug pr-2 min-w-0">
                {active.tagline}
              </div>
              <button
                onClick={active.onGo}
                className={`shrink-0 h-8 px-3 rounded-md text-[11.5px] font-semibold border ${active.ring} ${active.bg} ${active.text} hover:brightness-110 transition inline-flex items-center gap-1`}
              >
                {active.ctaLabel}
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                  <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {specs.map(s => (
              <button
                key={s.key}
                onClick={() => setActive(s)}
                aria-label={s.title}
                className={
                  'h-1.5 rounded-full transition-all duration-300 ' +
                  (active.key === s.key ? 'w-6 bg-accent' : 'w-1.5 bg-white/20 hover:bg-white/40')
                }
              />
            ))}
          </div>
        </div>

        {/* Right: feature tiles — flex column that stretches to match left height */}
        <div className="flex flex-col gap-2">
          {specs.map(s => (
            <FeatureTile
              key={s.key}
              spec={s}
              active={active.key === s.key}
              onSelect={() => setActive(s)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- landing page --------------------------- */

export default function LandingPage({ onGetStarted, onOpenDocs, fromNav }: Props) {
  const reduced = useReducedMotion();
  const greeting = useGreeting();
  const typedTitle = useTyped('SignalDesk', 90, reduced);

  return (
    <main className="flex-1 space-y-6 max-w-[1100px] mx-auto px-2 sm:px-4">
      {/* HERO */}
      <section className="relative overflow-hidden panel p-6 md:p-10">
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-pulse" />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-info/20 blur-3xl animate-pulse"
          style={{ animationDelay: '1.2s' }}
        />
        {!reduced && <div className="pointer-events-none absolute inset-0 opacity-[0.06] sd-grid" aria-hidden />}

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 text-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              AI-driven quant desk
              <span className="text-white/40 font-normal tracking-normal normal-case ml-1">
                · {greeting}
              </span>
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight">
              Welcome to{' '}
              <span className="text-accent whitespace-nowrap">
                {typedTitle}
                {!reduced && typedTitle.length < 'SignalDesk'.length && (
                  <span className="inline-block w-[2px] h-[0.9em] align-middle bg-accent animate-pulse ml-1" />
                )}
              </span>
            </h1>
            <p className="mt-3 text-white/70 text-[14px] md:text-[15px] max-w-[640px]">
              Your AI trading co-pilot for swing trading. Trend, volatility contraction and
              relative volume — fused into one verdict per stock. The Minervini / IBD /
              Weinstein playbook, automated.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 max-w-[520px]">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-accent/30 transition">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Screens</div>
                <div className="stat-num text-white text-lg font-semibold">4</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-accent/30 transition">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Rules checked</div>
                <div className="stat-num text-white text-lg font-semibold">8 + 15</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-accent/30 transition">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Data</div>
                <div className="stat-num text-white text-lg font-semibold">Daily</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={onGetStarted}
                className="h-11 px-5 rounded-xl bg-accent text-black font-semibold text-sm shadow-glow hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition inline-flex items-center gap-2"
              >
                {fromNav ? 'Back to Master screener' : 'Open Master screener'}
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={onOpenDocs}
                className="h-11 px-4 rounded-xl border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:text-white text-sm font-medium inline-flex items-center gap-2 transition"
              >
                <Icons.book className="w-4 h-4" />
                Read the docs
              </button>
            </div>
          </div>

          <div className="hidden md:block shrink-0">
            <LiveChart reduced={reduced} />
          </div>
        </div>

        <div className="relative mt-6">
          <Ticker reduced={reduced} />
        </div>
      </section>

      {/* WHAT YOU GET — interactive preview */}
      <Reveal>
        <WhatYouGet
          onGetStarted={onGetStarted}
          onOpenDocs={onOpenDocs}
          reduced={reduced}
        />
      </Reveal>

      {/* HOW IT WORKS — 3-step summary */}
      <Reveal delay={40}>
        <section className="panel p-5 md:p-6 space-y-4">
          <h2 className="text-lg md:text-xl font-semibold text-white">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Step 1</div>
              <div className="mt-1 text-white font-semibold">Pick a universe</div>
              <div className="mt-1 text-[12.5px] text-white/70">Nifty 50 / 200 / 500 or Midcap / Smallcap. Master runs on the same daily bars.</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Step 2</div>
              <div className="mt-1 text-white font-semibold">Get one verdict per stock</div>
              <div className="mt-1 text-[12.5px] text-white/70">SignalDesk fuses Trend + VCP + RVOL into a single, actionable label.</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Step 3</div>
              <div className="mt-1 text-white font-semibold">Trade the setup</div>
              <div className="mt-1 text-[12.5px] text-white/70">Enter above the pivot with RVOL / Strong Start confirmation. Risk 1% per trade.</div>
            </div>
          </div>
          <div className="text-[11px] text-white/40">
            Full playbook →{' '}
            <button onClick={onOpenDocs} className="text-accent hover:opacity-90 underline underline-offset-2">
              How to Use
            </button>
          </div>
        </section>
      </Reveal>

      {/* Slim disclaimer */}
      <Reveal delay={60}>
        <section className="panel p-4 md:p-5 border border-warn/30 bg-warn/[0.04]">
          <div className="text-[12px] text-white/70 leading-relaxed">
            <strong className="text-warn">Disclaimer:</strong> SignalDesk is a signal generator, not investment advice.
            Not SEBI-registered. Trading equities involves risk of capital loss.{' '}
            <button onClick={onOpenDocs} className="text-accent hover:opacity-90 underline underline-offset-2">
              Read the full disclaimer
            </button>.
          </div>
        </section>
      </Reveal>

      {/* Bottom CTA */}
      <div className="text-center py-6">
        <button
          onClick={onGetStarted}
          className="h-11 px-6 rounded-xl bg-accent text-black font-semibold text-sm shadow-glow hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition inline-flex items-center gap-2"
        >
          {fromNav ? 'Back to Master screener' : 'Get started — Open Master'}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-[11px] text-white/40 mt-3">
          Revisit any time from the <strong className="text-white/60">Home</strong> pill in the top nav.
        </div>
      </div>
    </main>
  );
}