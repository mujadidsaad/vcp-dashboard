/**
 * Shared side panel for Master / RVOL / Trend screener pages.
 *
 * Mirrors the outer dimensions of the VCP `FilterPanel` (w-full lg:w-[320px]
 * shrink-0 panel p-5 self-start) so the three screener layouts stay in sync
 * with VCP's two-column layout.
 *
 * Intentionally lean: universe picker, as-of date, small summary stats, and
 * primary actions (Reset). Screener-specific config lives in the top controls
 * bar of each screener; the sidebar here is for the persistent settings that
 * are common across screeners.
 */

import AsOfPicker from './AsOfPicker';
import type { UniverseInfo } from '../api';

export interface SidebarStat {
  label: string;
  value: string | number;
  tone?: 'good' | 'warn' | 'bad' | 'info' | 'accent' | 'muted';
}

interface Props {
  title: string;
  subtitle?: string;

  universes: UniverseInfo[];
  selectedUniverse: string;
  onUniverseChange: (name: string) => void;

  asOf?: string;
  onAsOfChange: (v?: string) => void;

  totalStocks: number;
  stats?: SidebarStat[];

  onClear?: () => void;
  scanning?: boolean;

  /** Optional footer content (e.g. benchmark ribbon summary) */
  footer?: React.ReactNode;
}

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

const toneClass = (tone: SidebarStat['tone']): string => {
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

export default function ScreenerSidebar(p: Props) {
  return (
    <aside className="w-full lg:w-[320px] shrink-0 panel p-5 space-y-5 self-start">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <div className="text-xs text-white/70 font-medium">{p.title}</div>
      </div>
      {p.subtitle && (
        <div className="text-[11px] text-white/45 -mt-3">{p.subtitle}</div>
      )}

      {/* Universe */}
      <Section title="Universe">
        <select
          value={p.selectedUniverse}
          onChange={e => p.onUniverseChange(e.target.value)}
          className="w-full h-9 px-2.5 rounded-md bg-white/[0.03] border border-white/10 text-[12px] text-white focus:outline-none focus:border-accent/50"
        >
          {p.universes.map(u => (
            <option key={u.name} value={u.name} className="bg-bg text-white">
              {u.name} · {u.count.toLocaleString()}
            </option>
          ))}
        </select>
      </Section>

      {/* As-of date */}
      <AsOfPicker value={p.asOf} onChange={p.onAsOfChange} />

      {/* Summary stats */}
      {p.stats && p.stats.length > 0 && (
        <Section title="Summary">
          <div className="grid grid-cols-2 gap-2">
            {p.stats.map((s, i) => (
              <div key={i} className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{s.label}</div>
                <div className={`stat-num text-sm font-semibold ${toneClass(s.tone)}`}>
                  {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="hr-soft" />

      {/* Universe count footer */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/40">Universe</span>
        <span className="stat-num text-accent font-semibold">
          {p.totalStocks.toLocaleString()} stocks
        </span>
      </div>

      {/* Optional footer slot */}
      {p.footer}

      {/* Reset */}
      {p.onClear && (
        <button
          onClick={p.onClear}
          disabled={p.scanning}
          className="w-full h-8 rounded-md text-[11px] font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear results
        </button>
      )}
    </aside>
  );
}