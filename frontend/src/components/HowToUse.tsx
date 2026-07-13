/**
 * Landing / help page shown on first visit and reachable from the header.
 * Explains the four screeners, how to trade with them, and shows a legal
 * disclaimer. Dismissing the page marks it "seen" in localStorage.
 *
 * Redesigned: animated hero, colorful SVG section icons, quick-nav chips,
 * responsive grid layout, and richer step-by-step trade playbook.
 */

import type { ReactNode } from 'react';

interface Props {
  /** Called when the user clicks "Take me to the Master screener". */
  onGetStarted: () => void;
  /** Whether this page was reached via the header pill (vs. first-visit landing). */
  fromNav?: boolean;
}

/* ---------- tiny SVG icon set (no emojis) ---------- */

type IconProps = { className?: string };

const Icons = {
  target: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
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
  briefcase: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M3 12h18" />
    </svg>
  ),
  ban: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5l13 13" strokeLinecap="round" />
    </svg>
  ),
  clock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  ),
  warn: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
      <path d="M12 10v5" strokeLinecap="round" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={p.className}>
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  eye: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  cog: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" strokeLinecap="round" />
    </svg>
  ),
  pause: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={p.className}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ),
};

/* ---------- data ---------- */

type SectionId = 'master' | 'trend' | 'vcp' | 'rvol' | 'trade' | 'donts' | 'routine';

interface QuickChip {
  id: SectionId;
  label: string;
  color: string; // tailwind color name for accent
}

const QUICK_CHIPS: QuickChip[] = [
  { id: 'master',  label: 'Master',      color: 'accent'  },
  { id: 'trend',   label: 'Trend',       color: 'info'    },
  { id: 'vcp',     label: 'VCP',         color: 'purple'  },
  { id: 'rvol',    label: 'RVOL',        color: 'warn'    },
  { id: 'trade',   label: 'Trade rules', color: 'good'    },
  { id: 'donts',   label: 'Don\'ts',     color: 'bad'     },
  { id: 'routine', label: 'Routine',     color: 'info'    },
];

const chipClasses = (color: string): string => {
  switch (color) {
    case 'accent': return 'border-accent/40 text-accent hover:bg-accent/10';
    case 'info':   return 'border-info/40   text-info   hover:bg-info/10';
    case 'purple': return 'border-purple-500/40 text-purple-300 hover:bg-purple-500/10';
    case 'warn':   return 'border-warn/40   text-warn   hover:bg-warn/10';
    case 'good':   return 'border-good/40   text-good   hover:bg-good/10';
    case 'bad':    return 'border-bad/40    text-bad    hover:bg-bad/10';
    default:       return 'border-white/15  text-white/70';
  }
};

/* ---------- reusable sub-components ---------- */

function Section({
  id,
  icon,
  title,
  subtitle,
  ring,
  bg,
  children,
}: {
  id: SectionId;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  ring: string;
  bg: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="panel p-5 md:p-6 space-y-3 scroll-mt-24"
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border ${ring} ${bg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-semibold text-white leading-tight">
            {title}
          </h2>
          {subtitle && (
            <div className="text-[12px] text-white/50 mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
      <div className="text-[13px] text-white/70 leading-relaxed space-y-3 pt-1">
        {children}
      </div>
    </section>
  );
}

function VerdictCard({
  icon,
  label,
  desc,
  ring,
  bg,
  text,
}: {
  icon: ReactNode;
  label: string;
  desc: string;
  ring: string;
  bg: string;
  text: string;
}) {
  return (
    <div className={`rounded-xl border ${ring} ${bg} p-3 flex items-start gap-3`}>
      <div className={`shrink-0 w-8 h-8 rounded-lg border ${ring} bg-white/[0.02] flex items-center justify-center ${text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-[12px] font-bold uppercase tracking-[0.14em] ${text}`}>{label}</div>
        <div className="text-[12px] text-white/70 mt-0.5 leading-snug">{desc}</div>
      </div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1.5 last:border-none">
      <span className="text-white/50">{label}</span>
      <span className="text-white/90 stat-num text-right">{value}</span>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/40 text-accent flex items-center justify-center text-[12px] font-bold stat-num">
          {n}
        </div>
        <div className="text-white font-semibold text-[13px]">{title}</div>
      </div>
      <div className="text-[12.5px] text-white/70 leading-relaxed">{children}</div>
    </div>
  );
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- main page ---------- */

export default function HowToUse({ onGetStarted, fromNav }: Props) {
  return (
    <main className="flex-1 space-y-6 max-w-[1100px] mx-auto px-2 sm:px-4">
      {/* HERO */}
      <section className="relative overflow-hidden panel p-6 md:p-10">
        {/* animated gradient blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-pulse" />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-info/20 blur-3xl animate-pulse"
          style={{ animationDelay: '1.2s' }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 text-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              AI-driven quant desk
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight">
              Welcome to <span className="text-accent">SignalDesk</span>
            </h1>
            <p className="mt-3 text-white/70 text-[14px] md:text-[15px] max-w-[640px]">
              Your AI trading desk for Indian markets. Trend, volatility contraction and relative
              volume — fused into one verdict per stock. The Minervini / IBD / Weinstein playbook,
              automated.
            </p>

            {/* hero stats */}
            <div className="mt-5 grid grid-cols-3 gap-2 max-w-[520px]">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Screens</div>
                <div className="stat-num text-white text-lg font-semibold">4</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Rules checked</div>
                <div className="stat-num text-white text-lg font-semibold">8 + 15</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Data</div>
                <div className="stat-num text-white text-lg font-semibold">Daily</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={onGetStarted}
                className="h-11 px-5 rounded-xl bg-accent text-black font-semibold text-sm shadow-glow hover:brightness-110 inline-flex items-center gap-2"
              >
                {fromNav ? 'Back to Master screener' : 'Open Master screener'}
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <a
                href="#trade"
                onClick={(e) => { e.preventDefault(); scrollTo('trade'); }}
                className="h-11 px-4 rounded-xl border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:text-white text-sm font-medium inline-flex items-center gap-2"
              >
                How to place a trade
              </a>
            </div>
          </div>

          {/* decorative mini-chart on md+ */}
          <div className="hidden md:block shrink-0">
            <div className="w-[260px] h-[160px] rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Sample setup</div>
                <div className="text-[10px] text-good font-semibold">READY</div>
              </div>
              <svg viewBox="0 0 240 90" className="mt-3 w-full h-[100px]" fill="none">
                <defs>
                  <linearGradient id="sd-g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="rgb(74 222 128)" stopOpacity="0.4" />
                    <stop offset="1" stopColor="rgb(74 222 128)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 70 L20 60 L40 66 L60 55 L80 58 L100 45 L120 50 L140 35 L160 40 L180 25 L200 30 L220 15 L240 20 L240 90 L0 90 Z"
                  fill="url(#sd-g)"
                />
                <path
                  d="M0 70 L20 60 L40 66 L60 55 L80 58 L100 45 L120 50 L140 35 L160 40 L180 25 L200 30 L220 15 L240 20"
                  stroke="rgb(74 222 128)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* quick-nav chips */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {QUICK_CHIPS.map(c => (
            <button
              key={c.id}
              onClick={() => scrollTo(c.id)}
              className={`px-3 h-8 rounded-full text-[11px] font-semibold border bg-white/[0.02] transition ${chipClasses(c.color)}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* MASTER */}
      <Section
        id="master"
        title="Master Screener"
        subtitle="Trend + VCP + RVOL fused into one verdict per stock"
        icon={<Icons.target className="w-6 h-6 text-accent" />}
        ring="border-accent/40"
        bg="bg-accent/10"
      >
        <p>
          Runs all three screeners against the same daily bars and gives you
          <strong className="text-white"> one verdict per stock</strong>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <VerdictCard
            icon={<Icons.check className="w-4 h-4" />}
            label="Ready to trade"
            desc="Everything aligned, breakout live"
            ring="border-good/40"
            bg="bg-good/10"
            text="text-good"
          />
          <VerdictCard
            icon={<Icons.eye className="w-4 h-4" />}
            label="Watchlist"
            desc="Setup near, waiting on volume"
            ring="border-info/40"
            bg="bg-info/10"
            text="text-info"
          />
          <VerdictCard
            icon={<Icons.cog className="w-4 h-4" />}
            label="Setup forming"
            desc="Base building, not yet actionable"
            ring="border-accent/40"
            bg="bg-accent/10"
            text="text-accent"
          />
          <VerdictCard
            icon={<Icons.pause className="w-4 h-4" />}
            label="Hold off"
            desc="Stage 3 (topping), skip"
            ring="border-warn/40"
            bg="bg-warn/10"
            text="text-warn"
          />
        </div>
        <p className="text-white/50">
          <strong className="text-white/80">Start here.</strong> This is the fastest way to see what's actually
          tradeable today across your chosen universe.
        </p>
      </Section>

      {/* TREND */}
      <Section
        id="trend"
        title="Trend Template"
        subtitle="Minervini's 8 rules + Weinstein stages"
        icon={<Icons.trend className="w-6 h-6 text-info" />}
        ring="border-info/40"
        bg="bg-info/10"
      >
        <p>
          Mark Minervini's 8-rule uptrend check + Stan Weinstein's 4 stages of a market cycle.
          Tells you which stocks are in a{' '}
          <strong className="text-good">Stage 2 advance</strong> — the only stage where breakouts
          really work.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 font-mono text-[12px] text-white/70">
          <div>c1 · close &gt; SMA150 AND SMA200</div>
          <div>c2 · SMA150 &gt; SMA200</div>
          <div>c3 · SMA200 rising for ≥ 1 month</div>
          <div>c4 · SMA50 &gt; SMA150 &gt; SMA200</div>
          <div>c5 · close &gt; SMA50</div>
          <div>c6 · close ≥ 52-week low × 1.30</div>
          <div>c7 · close within 25% of 52-week high</div>
          <div>c8 · 6-month return beats benchmark</div>
        </div>
        <p className="text-white/50">
          Score 7-8/8 in Stage 2 = healthy uptrend. Anything else = probably not worth watching yet.
        </p>
      </Section>

      {/* VCP */}
      <Section
        id="vcp"
        title="VCP Screener"
        subtitle="Volatility Contraction Pattern — Minervini's entry setup"
        icon={<Icons.contract className="w-6 h-6 text-purple-300" />}
        ring="border-purple-500/40"
        bg="bg-purple-500/10"
      >
        <p>
          <strong className="text-white">Volatility Contraction Pattern</strong> finds stocks forming
          tight, staircase-style bases with volume drying up, right before a breakout.
        </p>
        <p>Weighted 15-check scoring out of 100:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-[12px] text-white/70">
          <RuleRow label="Prior uptrend"         value="+12" />
          <RuleRow label="Above MA50 / MA200"     value="+18" />
          <RuleRow label="EMA stack"              value="+10" />
          <RuleRow label="Near 52w high"          value="+10" />
          <RuleRow label="≥ 2 contractions"       value="+12" />
          <RuleRow label="Contractions improving" value="+10" />
          <RuleRow label="Volatility tightening"  value="+14" />
          <RuleRow label="Volume drying up"       value="+8"  />
          <RuleRow label="RSI 50-75"              value="+5"  />
          <RuleRow label="Near breakout ≤ 5%"     value="+5"  />
          <RuleRow label="Breakout confirmed"     value="+8"  />
        </div>
        <p className="text-white/50">
          <strong className="text-good">Grade A+</strong> = confirmed breakout ·{' '}
          <strong className="text-info">A / B Watchlist</strong> = imminent ·{' '}
          <strong className="text-white/60">C</strong> = early.
        </p>
      </Section>

      {/* RVOL */}
      <Section
        id="rvol"
        title="RVOL Screener"
        subtitle="Relative volume — the confirmation filter on breakout day"
        icon={<Icons.bolt className="w-6 h-6 text-warn" />}
        ring="border-warn/40"
        bg="bg-warn/10"
      >
        <p>
          <strong className="text-white">Relative Volume</strong> — today's volume vs the 20-day
          average. Real breakouts require buyers showing up in size. This is your{' '}
          <strong className="text-good">confirmation filter</strong> on breakout day.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[12px] text-white/70">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            RVOL &lt; 1.0x → below avg <span className="text-white/40">(skip)</span>
          </div>
          <div className="rounded-lg border border-warn/20 bg-warn/[0.05] px-3 py-2 text-warn/90">
            RVOL 1.0-1.5x → normal (watch)
          </div>
          <div className="rounded-lg border border-info/25 bg-info/[0.05] px-3 py-2 text-info/90">
            RVOL 1.5-2.0x → elevated (worth entering)
          </div>
          <div className="rounded-lg border border-good/25 bg-good/[0.05] px-3 py-2 text-good/90">
            RVOL &gt; 2.0x → high conviction
          </div>
        </div>
        <p className="text-white/50">
          Look for <span className="text-good font-semibold">★ Strong Start</span> — open above prev
          close AND day-low held prev close × 0.995. No morning weakness = clean breakout.
        </p>
      </Section>

      {/* TRADE PLAYBOOK */}
      <Section
        id="trade"
        title="How to actually place a trade"
        subtitle="A repeatable 8-step playbook"
        icon={<Icons.briefcase className="w-6 h-6 text-good" />}
        ring="border-good/40"
        bg="bg-good/10"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Step n={1} title="Run Master on Nifty 200">
            Start with a healthy universe. Master fuses Trend + VCP + RVOL into one verdict per stock.
          </Step>
          <Step n={2} title="Filter to READY & WATCH">
            Only trade <strong className="text-good">READY</strong> and{' '}
            <strong className="text-info">WATCH</strong>. Ignore the rest.
          </Step>
          <Step n={3} title="Mark the pivot">
            Pivot = highest high of the last contraction. Alert at pivot; enter above it on a green candle.
          </Step>
          <Step n={4} title="Confirm entry">
            RVOL ≥ 1.5x · Chg% {'>'} +2% · <span className="text-good">★ Strong Start</span>.
          </Step>
          <Step n={5} title="Stop-loss">
            2% below pivot OR below low of breakout day — whichever is tighter.
          </Step>
          <Step n={6} title="Position size">
            Risk max 1% of account.
            <div className="mt-1 font-mono text-[11.5px] text-white/60">
              size = (account × 0.01) / (buy − stop)
            </div>
          </Step>
          <Step n={7} title="Target">
            +8-10% → sell half. Trail the rest with the 21 EMA.
          </Step>
          <Step n={8} title="Hit the stop?">
            <strong className="text-bad">Sell. No thinking.</strong>
          </Step>
        </div>
      </Section>

      {/* DON'TS */}
      <Section
        id="donts"
        title="What not to do"
        subtitle="The most common (and expensive) mistakes"
        icon={<Icons.ban className="w-6 h-6 text-bad" />}
        ring="border-bad/40"
        bg="bg-bad/10"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-white/70 text-[13px]">
          <li>Don't trade Stage 3 or Stage 4 stocks — even if the VCP looks perfect.</li>
          <li>Don't buy without checking RVOL on the day.</li>
          <li>Don't average down on losers.</li>
          <li>Don't chase after a stock has already run &gt; 5% above pivot.</li>
          <li>Don't trade without a written stop.</li>
          <li>Don't ignore market breadth (Stage 2 count in Trend tab).</li>
        </ul>
      </Section>

      {/* ROUTINE */}
      <Section
        id="routine"
        title="Daily 10-minute routine"
        subtitle="Consistency beats intensity"
        icon={<Icons.clock className="w-6 h-6 text-info" />}
        ring="border-info/40"
        bg="bg-info/10"
      >
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 list-decimal list-inside text-white/70 text-[13px]">
          <li>End of day: run <strong className="text-accent">Master</strong> on Nifty 500 — glance at breadth (Stage-2 count).</li>
          <li>Sort by <strong>RS vs Bench</strong> — jot the top 10.</li>
          <li>Next morning: check <strong className="text-warn">RVOL</strong> for names above pivot.</li>
          <li>Enter only when RVOL, Chg%, and Strong Start all confirm.</li>
          <li>Evening: update stops on open trades (trail with 21 EMA once at +5%).</li>
          <li>Log outcomes. Review weekly.</li>
        </ol>
      </Section>

      {/* DISCLAIMER */}
      <section className="panel p-5 md:p-6 border-2 border-warn/40 bg-warn/[0.06] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl border border-warn/40 bg-warn/15 text-warn flex items-center justify-center">
            <Icons.warn className="w-6 h-6" />
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-white">Important Disclaimer</h2>
        </div>
        <div className="text-[13px] text-white/80 leading-relaxed space-y-2">
          <p>
            <strong className="text-warn">Do your own research before trading.</strong>{' '}
            SignalDesk is a signal generator — not investment advice. Every signal shown here is
            a <em>starting point</em> for your own analysis, not a recommendation to buy or sell.
          </p>
          <p>
            This app was <strong>developed by a hobbyist techie</strong> and is{' '}
            <strong className="text-warn">NOT SEBI registered</strong>. The developer:
          </p>
          <ul className="list-disc list-inside ml-2 text-white/70 space-y-1">
            <li>Is not a SEBI-registered investment advisor or research analyst.</li>
            <li>Does not provide personalised investment advice or portfolio management services.</li>
            <li>Makes no guarantees about the accuracy or timeliness of the data (sourced from Yahoo Finance, which can lag or contain errors).</li>
            <li>Is not liable for any trading losses arising from use of this tool.</li>
          </ul>
          <p>
            <strong className="text-white">Trading equities involves the risk of loss of capital.</strong>{' '}
            Past performance and screener signals are not indicators of future returns.
            Never risk money you can't afford to lose. Consult a SEBI-registered advisor
            for personalised investment advice.
          </p>
          <p className="text-white/50 text-[12px] pt-2 border-t border-white/10">
            By using this tool you acknowledge that all trading decisions are your own and that
            neither the developer nor this software has any fiduciary responsibility to you.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center py-6">
        <button
          onClick={onGetStarted}
          className="h-11 px-6 rounded-xl bg-accent text-black font-semibold text-sm shadow-glow hover:brightness-110 inline-flex items-center gap-2"
        >
          {fromNav ? 'Back to Master screener' : 'Got it — take me to Master'}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M4 10h11m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-[11px] text-white/40 mt-3">
          Revisit this page any time from the <strong className="text-white/60">How to Use</strong> pill in the top nav.
        </div>
      </div>
    </main>
  );
}