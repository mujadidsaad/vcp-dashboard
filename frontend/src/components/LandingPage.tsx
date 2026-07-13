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
    <div className="w-[260px] h-[160px] rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Live sample · SD/INR</div>
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
    </div>
  );
}

/* --------------------------- feature card --------------------------- */
function FeatureCard({
  icon, title, tagline, ring, bg, text, onGo, ctaLabel,
}: {
  icon: ReactNode;
  title: string;
  tagline: string;
  ring: string;
  bg: string;
  text: string;
  onGo: () => void;
  ctaLabel: string;
}) {
  return (
    <div className={`group rounded-2xl border ${ring} ${bg} p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl border ${ring} bg-white/[0.02] flex items-center justify-center ${text} transition-transform duration-300 group-hover:rotate-6`}>
          {icon}
        </div>
        <div className={`text-[13px] font-bold uppercase tracking-[0.14em] ${text}`}>{title}</div>
      </div>
      <div className="text-[13px] text-white/70 leading-relaxed">{tagline}</div>
      <button
        onClick={onGo}
        className={`mt-auto self-start text-[12px] font-semibold ${text} hover:opacity-90 inline-flex items-center gap-1`}
      >
        {ctaLabel}
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5">
          <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
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

      {/* WHAT YOU GET — feature grid */}
      <Reveal>
        <section className="panel p-5 md:p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-white">What you get</h2>
            <button onClick={onOpenDocs} className="text-[12px] text-accent hover:opacity-90 inline-flex items-center gap-1">
              Read the docs
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureCard
              icon={<Icons.target className="w-5 h-5" />} title="Master"
              tagline="One verdict per stock: READY, WATCH, SETUP, HOLD or SKIP. Start here."
              ring="border-accent/40" bg="bg-accent/10" text="text-accent"
              onGo={onGetStarted} ctaLabel="Open Master"
            />
            <FeatureCard
              icon={<Icons.trend className="w-5 h-5" />} title="Trend Template"
              tagline="Minervini's 8 rules + Weinstein stages. Trade only Stage 2 advances."
              ring="border-info/40" bg="bg-info/10" text="text-info"
              onGo={onOpenDocs} ctaLabel="Learn more"
            />
            <FeatureCard
              icon={<Icons.contract className="w-5 h-5" />} title="VCP"
              tagline="Volatility Contraction Pattern — tight bases with volume drying up before a breakout."
              ring="border-purple-500/40" bg="bg-purple-500/10" text="text-purple-300"
              onGo={onOpenDocs} ctaLabel="Learn more"
            />
            <FeatureCard
              icon={<Icons.bolt className="w-5 h-5" />} title="RVOL"
              tagline="Relative volume + Strong Start — confirmation filter on breakout day."
              ring="border-warn/40" bg="bg-warn/10" text="text-warn"
              onGo={onOpenDocs} ctaLabel="Learn more"
            />
          </div>
        </section>
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