import { useEffect, useRef, useState } from 'react';

export type Tab = 'home' | 'help' | 'master' | 'vcp' | 'rvol' | 'trend' | 'watchlist' | 'analytics';

interface Props {
  /** Kept for backwards-compatibility with App.tsx; not rendered in the header anymore. */
  totalStocks?: number;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}

const TABS: Array<{ id: Tab; label: string; enabled: boolean }> = [
  { id: 'home',      label: 'Home',            enabled: true  },
  { id: 'master',    label: 'Master Screener', enabled: true  },
  { id: 'vcp',       label: 'VCP Screener',    enabled: true  },
  { id: 'rvol',      label: 'RVOL Screener',   enabled: true  },
  { id: 'trend',     label: 'Trend Screener',  enabled: true  },
  { id: 'help',      label: 'Docs',            enabled: true  },
  { id: 'watchlist', label: 'Watchlist',       enabled: false },
  { id: 'analytics', label: 'Analytics',       enabled: false },
];

export default function Header({ activeTab, onTabChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const activeLabel = TABS.find(t => t.id === activeTab)?.label ?? '';

  return (
    <header className="border-b border-white/5">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent shadow-glow flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="leading-none min-w-0">
            <div className="text-white font-semibold tracking-tight text-[14px] sm:text-[15px] truncate">
              Signal<span className="text-accent">Desk</span>
            </div>
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.16em] text-white/40 mt-0.5">
              Your AI trading co-pilot for swing trading
            </div>
          </div>
        </div>

        {/* Desktop nav pills */}
        <nav className="hidden md:flex items-center gap-1 ml-4 min-w-0 overflow-hidden">
          {TABS.map(t => {
            const active = activeTab === t.id;
            const clickable = t.enabled;
            return (
              <button
                key={t.id}
                onClick={() => clickable && onTabChange(t.id)}
                disabled={!clickable}
                title={clickable ? undefined : 'Coming soon'}
                className={
                  `px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap
                   ${active
                     ? 'bg-white/5 border border-white/10 text-white'
                     : clickable
                       ? 'text-white/50 hover:text-white/80'
                       : 'text-white/25 cursor-not-allowed'
                   }`
                }
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Right side (desktop) */}
        <div className="ml-auto hidden md:flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Source</div>
            <div className="stat-num text-sm text-accent font-medium">Yahoo Finance</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono text-white/70">
            IN
          </div>
        </div>

        {/* Mobile: active-tab pill + hamburger */}
        <div className="md:hidden ml-auto flex items-center gap-2 relative" ref={menuRef}>
          <span className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold border border-white/10 bg-white/5 text-white/85 whitespace-nowrap">
            {activeLabel}
          </span>
          <button
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] text-white/80 hover:text-white hover:bg-white/[0.06] flex items-center justify-center"
          >
            {menuOpen ? (
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-[220px] rounded-xl border border-white/10 bg-[#101410] shadow-xl z-40 p-1.5">
              {TABS.map(t => {
                const active = activeTab === t.id;
                const clickable = t.enabled;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (!clickable) return;
                      onTabChange(t.id);
                      setMenuOpen(false);
                    }}
                    disabled={!clickable}
                    className={
                      `w-full text-left px-3 py-2 rounded-lg text-[12.5px] transition ` +
                      (active
                        ? 'bg-accent/10 border border-accent/40 text-accent'
                        : clickable
                          ? 'text-white/80 hover:bg-white/[0.05]'
                          : 'text-white/30 cursor-not-allowed')
                    }
                  >
                    {t.label}
                    {!clickable && <span className="ml-2 text-[10px] uppercase text-white/25">Soon</span>}
                  </button>
                );
              })}
              <div className="mt-1.5 pt-2 px-3 border-t border-white/5 text-[10.5px] flex items-center justify-between text-white/40">
                <span>Source</span>
                <span className="text-accent font-medium">Yahoo · IN</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}