/**
 * Landing / help page shown on first visit and reachable from the header.
 * Explains the four screeners, how to trade with them, and shows a legal
 * disclaimer. Dismissing the page marks it "seen" in localStorage.
 */

interface Props {
  /** Called when the user clicks "Take me to the Master screener". */
  onGetStarted: () => void;
  /** Whether this page was reached via the header pill (vs. first-visit landing). */
  fromNav?: boolean;
}

function Section({
  icon,
  title,
  color,
  children,
}: {
  icon: string;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-6 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${color}`}
        >
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="text-[13px] text-white/70 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

function RuleRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1.5 last:border-none">
      <span className="text-white/50">{label}</span>
      <span className="text-white/90 stat-num text-right">{value}</span>
    </div>
  );
}

export default function HowToUse({ onGetStarted, fromNav }: Props) {
  return (
    <main className="flex-1 space-y-6 max-w-[900px] mx-auto">
      {/* Hero */}
      <div className="panel p-8 space-y-4 text-center">
        <div className="text-4xl">Help</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Welcome to <span className="text-accent">SignalDesk</span>
        </h1>
        <p className="text-white/60 text-sm max-w-[600px] mx-auto">
          Your AI trading desk for Indian markets — a four-screen system for
          finding stocks that are trending up, consolidating tight, and breaking
          out on real volume. The Minervini / IBD / Weinstein playbook, automated.
        </p>
        <button
          onClick={onGetStarted}
          className="mt-2 h-11 px-6 rounded-xl bg-accent text-white font-semibold text-sm shadow-glow hover:brightness-110 inline-flex items-center gap-2"
        >
          {fromNav ? 'Back to the Master screener' : 'Take me to the Master screener'}
        </button>
      </div>

      {/* Master */}
      <Section icon="M" title="Master Screener" color="bg-accent/20 text-accent">
        <p>
          Runs all three screeners against the same daily bars and gives you
          <strong className="text-white"> one verdict per stock</strong>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div className="rounded-md border border-good/40 bg-good/10 px-3 py-2 text-good">
            <strong>READY TO TRADE</strong> — everything aligned, breakout live
          </div>
          <div className="rounded-md border border-info/40 bg-info/10 px-3 py-2 text-info">
            <strong>WATCHLIST</strong> — setup near, waiting on volume
          </div>
          <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-accent">
            <strong>SETUP FORMING</strong> — base building, not yet actionable
          </div>
          <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-warn">
            <strong>HOLD OFF</strong> — Stage 3 (topping), skip
          </div>
        </div>
        <p className="text-white/50 mt-3">
          <strong className="text-white/80">Start here.</strong> This is the fastest way to see what's actually
          tradeable today across your chosen universe.
        </p>
      </Section>

      {/* Trend Template */}
      <Section icon="TT" title="Trend Template" color="bg-info/20 text-info">
        <p>
          Mark Minervini's 8-rule uptrend check + Stan Weinstein's 4 stages of a
          market cycle. Tells you which stocks are in a{' '}
          <strong className="text-good">Stage 2 advance</strong> — the only stage where
          breakouts really work.
        </p>
        <div className="mt-3 space-y-1 font-mono text-[12px] text-white/70">
          <div>c1 · close &gt; SMA150 AND SMA200</div>
          <div>c2 · SMA150 &gt; SMA200</div>
          <div>c3 · SMA200 rising for ≥ 1 month</div>
          <div>c4 · SMA50 &gt; SMA150 &gt; SMA200 (full stack)</div>
          <div>c5 · close &gt; SMA50</div>
          <div>c6 · close ≥ 52-week low × 1.30</div>
          <div>c7 · close within 25% of 52-week high</div>
          <div>c8 · 6-month return &gt; benchmark's 6-month return</div>
        </div>
        <p className="text-white/50 mt-3">
          Score 7-8/8 in Stage 2 = healthy uptrend. Anything else = probably not worth watching yet.
        </p>
      </Section>

      {/* VCP */}
      <Section icon="VCP" title="VCP Screener" color="bg-purple-500/20 text-purple-300">
        <p>
          <strong className="text-white">Volatility Contraction Pattern</strong> — Minervini's
          entry setup. Finds stocks forming tight, staircase-style bases with volume drying up,
          right before a breakout.
        </p>
        <p className="mt-2">
          Weighted 15-check scoring out of 100:
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 text-[12px] text-white/70">
          <RuleRow label="Prior uptrend" value="+12" />
          <RuleRow label="Above MA50 / MA200" value="+18" />
          <RuleRow label="EMA stack" value="+10" />
          <RuleRow label="Near 52w high" value="+10" />
          <RuleRow label="≥ 2 contractions" value="+12" />
          <RuleRow label="Contractions improving" value="+10" />
          <RuleRow label="Volatility tightening" value="+14" />
          <RuleRow label="Volume drying up" value="+8" />
          <RuleRow label="RSI 50-75" value="+5" />
          <RuleRow label="Near breakout ≤ 5%" value="+5" />
          <RuleRow label="Breakout confirmed" value="+8" />
        </div>
        <p className="text-white/50 mt-3">
          <strong className="text-good">Grade A+</strong> = confirmed breakout · <strong className="text-info">A / B Watchlist</strong> = imminent · <strong className="text-white/60">C</strong> = early.
        </p>
      </Section>

      {/* RVOL */}
      <Section icon="RVOL" title="RVOL Screener" color="bg-warn/20 text-warn">
        <p>
          <strong className="text-white">Relative Volume</strong> — today's volume vs the 20-day average.
          Real breakouts require buyers showing up in size. This is your{' '}
          <strong className="text-good">confirmation filter</strong> on breakout day.
        </p>
        <div className="mt-2 space-y-1 font-mono text-[12px] text-white/70">
          <div>RVOL &lt; 1.0x → below average — <span className="text-white/40">skip</span></div>
          <div>RVOL 1.0-1.5x → normal — <span className="text-warn">watch</span></div>
          <div>RVOL 1.5-2.0x → elevated — <span className="text-info">worth entering</span></div>
          <div>RVOL &gt; 2.0x → high conviction — <span className="text-good">strong buy signal</span></div>
        </div>
        <p className="text-white/50 mt-3">
          Look for <span className="text-good">* Strong Start</span> — open above prev close AND day-low held prev close × 0.995. No morning weakness = clean breakout.
        </p>
      </Section>

      {/* The trade rules */}
      <Section icon="Trade" title="How to actually place a trade" color="bg-good/20 text-good">
        <ol className="list-decimal list-inside space-y-2 text-white/80">
          <li>Run the <strong className="text-accent">Master</strong> screener on <strong>Nifty 200</strong>.</li>
          <li>Only trade <strong className="text-good">READY</strong> and <strong className="text-info">WATCH</strong> verdicts. Ignore the rest.</li>
          <li>
            Pick a stock. <strong>Pivot</strong> = highest high of the last contraction.
            <br />Alert at pivot. Enter <em>above</em> the pivot on a green candle.
          </li>
          <li>
            Confirm entry with:
            <div className="ml-4 mt-1 text-[12px] text-white/60">
              • RVOL ≥ 1.5x &nbsp;• Chg% {'>'} +2% &nbsp;• Strong Start *
            </div>
          </li>
          <li>
            <strong className="text-warn">Stop-loss</strong>: 2% below pivot OR below low of breakout day (whichever is tighter).
          </li>
          <li>
            <strong className="text-white">Position size</strong>: risk max 1% of account per trade.
            <div className="ml-4 mt-1 text-[12px] text-white/60 font-mono">
              size = (account × 0.01) / (buy − stop)
            </div>
          </li>
          <li>
            <strong className="text-good">Target</strong>: +8-10% → sell half, trail the rest with 21 EMA.
          </li>
          <li>Hit the stop? <strong className="text-bad">Sell. No thinking.</strong></li>
        </ol>
      </Section>

      {/* What NOT to do */}
      <Section icon="No" title="What not to do" color="bg-bad/20 text-bad">
        <ul className="list-disc list-inside space-y-1 text-white/70 text-[13px]">
          <li>Don't trade Stage 3 or Stage 4 stocks — even if the VCP looks perfect.</li>
          <li>Don't buy without checking RVOL on the day.</li>
          <li>Don't average down on losers.</li>
          <li>Don't chase after a stock has already run &gt; 5% above pivot.</li>
          <li>Don't trade without a written stop.</li>
          <li>Don't ignore market breadth (Stage 2 count in Trend tab).</li>
        </ul>
      </Section>

      {/* Daily routine */}
      <Section icon="Time" title="Daily 10-minute routine" color="bg-info/20 text-info">
        <ol className="list-decimal list-inside space-y-1 text-white/70 text-[13px]">
          <li>End of day: run <strong className="text-accent">Master</strong> on Nifty 500 — glance at the breadth (Stage-2 count).</li>
          <li>Sort by <strong>RS vs Bench</strong> — jot the top 10.</li>
          <li>Next morning: check <strong className="text-warn">RVOL</strong> for any names above pivot.</li>
          <li>Enter only when RVOL, Chg%, and Strong Start all confirm.</li>
          <li>Evening: update stops on open trades (trail with 21 EMA once at +5%).</li>
        </ol>
      </Section>

      {/* Disclaimer */}
      <section className="panel p-6 border-2 border-warn/40 bg-warn/[0.06] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-warn/25 text-warn">
            !
          </div>
          <h2 className="text-lg font-semibold text-white">Important Disclaimer</h2>
        </div>
        <div className="text-[13px] text-white/80 leading-relaxed space-y-2">
          <p>
            <strong className="text-warn">Do your own research before trading.</strong>{' '}
            This tool is a signal generator — not investment advice. Every signal shown here is
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
      <div className="text-center py-4">
        <button
          onClick={onGetStarted}
          className="h-11 px-6 rounded-xl bg-accent text-white font-semibold text-sm shadow-glow hover:brightness-110 inline-flex items-center gap-2"
        >
          {fromNav ? 'Back to the Master screener' : 'Got it — take me to the Master screener'}
        </button>
        <div className="text-[11px] text-white/40 mt-3">
          You can revisit this page any time from the <strong className="text-white/60">How to Use</strong> pill in the top nav.
        </div>
      </div>
    </main>
  );
}
