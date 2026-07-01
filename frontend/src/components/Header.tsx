interface Props {
  totalStocks: number;
}

export default function Header({ totalStocks }: Props) {
  return (
    <header className="border-b border-white/5">
      <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent shadow-glow flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-white font-semibold tracking-tight">VCP<span className="text-accent">•</span>SCAN</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mt-0.5">
              Volatility Contraction Screener
            </div>
          </div>
        </div>

        {/* Nav pills (visual only) */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white">
            Screener
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80">
            Watchlist
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80">
            Analytics
          </button>
        </nav>

        {/* Right side stats */}
        <div className="ml-auto flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Universe</div>
            <div className="stat-num text-lg text-white font-semibold">
              {totalStocks.toLocaleString()}
              <span className="text-white/40 text-xs font-normal ml-1">stocks</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Source</div>
            <div className="stat-num text-sm text-accent font-medium">Yahoo Finance</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono text-white/70">
            IN
          </div>
        </div>
      </div>
    </header>
  );
}