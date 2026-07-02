interface Props {
  scanning: boolean;
  progress: number;
  total: number;
  currentSymbol: string;
  errors: number;
  matches: number;
  recentSymbols: string[];
  onStart: () => void;
  onStop: () => void;
  onDownload: () => void;
  canDownload: boolean;
}

function Stat({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'accent' }) {
  const toneCls =
    tone === 'good'   ? 'text-good' :
    tone === 'warn'   ? 'text-warn' :
    tone === 'accent' ? 'text-accent' :
                        'text-white';
  return (
    <div className="flex flex-col items-start">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className={`stat-num text-xl font-semibold mt-0.5 ${toneCls}`}>{value}</div>
    </div>
  );
}

export default function ScanControls(p: Props) {
  const pct = p.total > 0 ? Math.round((p.progress / p.total) * 100) : 0;

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 flex-wrap">
          {p.scanning ? (
            <button
              onClick={p.onStop}
              className="h-11 px-5 rounded-xl bg-bad/15 border border-bad/40 text-bad font-semibold text-sm hover:bg-bad/25 transition inline-flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 bg-bad rounded-sm" />
              Stop Scan
            </button>
          ) : (
            <button
              onClick={p.onStart}
              className="h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm shadow-glow hover:shadow-[0_0_36px_rgba(255,107,122,0.35)] transition inline-flex items-center gap-2"
            >
              <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 1l9 5-9 5V1z" fill="currentColor"/></svg>
              Start Scan
            </button>
          )}

          <button
            onClick={p.onDownload}
            disabled={!p.canDownload || p.scanning}
            title={
              p.scanning
                ? 'Wait for the scan to finish'
                : !p.canDownload
                  ? 'Run a scan first'
                  : 'Download filtered results as CSV (opens in Excel)'
            }
            className="h-11 px-4 rounded-xl border border-white/15 bg-white/[0.04] text-white/85 font-semibold text-sm hover:bg-white/[0.09] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download CSV
          </button>

          {/* HUGE progress counter - always visible */}
          <div className="flex items-baseline gap-1">
            <div className="stat-num text-4xl font-bold text-white leading-none">
              {p.progress}
            </div>
            <div className="stat-num text-lg text-white/40 leading-none">
              / {p.total}
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 ml-2 leading-none">
              scanned
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <Stat label="Matches" value={p.matches} tone="accent" />
          <Stat label="Errors" value={p.errors} tone={p.errors > 0 ? 'warn' : 'default'} />
          <Stat label="Complete" value={<>{pct}<span className="text-white/30 text-sm">%</span></>} tone="good" />
        </div>
      </div>

      {/* Live status ribbon */}
      {p.scanning && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.04] px-4 py-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <div className="text-[13px] text-white/70">
            Scanning <span className="font-mono font-semibold text-white">{p.currentSymbol || '…'}</span>
          </div>
          <div className="ml-auto flex items-center gap-1 overflow-hidden">
            {p.recentSymbols.slice(-6).slice(0, -1).reverse().map((s, i) => (
              <span key={i} className="kbd whitespace-nowrap opacity-70">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="relative h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%`, boxShadow: '0 0 12px rgba(255,107,122,0.55)' }}
        />
      </div>
    </div>
  );
}
