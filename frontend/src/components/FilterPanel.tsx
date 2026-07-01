import type { FilterConfig, Timeframe } from '../types';

interface Props {
  filters: FilterConfig;
  onFilters: (f: FilterConfig) => void;
  timeframe: Timeframe;
  onTimeframe: (t: Timeframe) => void;
  timeframes: string[];
  grades: string[];
  presets: Record<string, Partial<FilterConfig>>;
  onPreset: (name: string) => void;
  totalStocks: number;
  universes: { name: string; count: number }[];
  selectedUniverse: string;
  onUniverseChange: (name: string) => void;
}

const TIMEFRAMES: Timeframe[] = ['5m', '15m', '30m', '1h', '4h', '1d', '1wk', '1mo'];

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
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

export default function FilterPanel(p: Props) {
  const c = p.filters;
  const setMinScore = (v: number) => p.onFilters({ ...c, minScore: v });

  const toggleGrade = (g: string) => {
    const set = new Set(c.gradeFilter);
    if (set.has(g)) set.delete(g); else set.add(g);
    p.onFilters({ ...c, gradeFilter: Array.from(set) });
  };

  const toggleCheck = (key: string) => {
    const ch = { ...c.checks, [key]: { ...c.checks[key], enabled: !c.checks[key].enabled } };
    p.onFilters({ ...c, checks: ch });
  };

  return (
    <aside className="w-full lg:w-[320px] shrink-0 panel p-5 space-y-5 self-start">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <div className="text-xs text-white/70 font-medium">Scanner Configuration</div>
      </div>

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

      <Section title="Timeframe">
        <div className="grid grid-cols-4 gap-1.5">
          {(p.timeframes.length ? p.timeframes : TIMEFRAMES).map(tf => {
            const active = p.timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => p.onTimeframe(tf as Timeframe)}
                className={`h-8 text-[11px] rounded-md font-medium transition
                  ${active
                    ? 'bg-accent text-black shadow-glow'
                    : 'bg-white/[0.03] border border-white/5 text-white/50 hover:text-white hover:bg-white/[0.06]'
                  }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Presets">
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(p.presets).map(name => (
            <button
              key={name}
              onClick={() => p.onPreset(name)}
              className="px-2.5 h-7 text-[11px] rounded-md border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-accent/50"
            >
              {name}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Min Score"
        right={<span className="stat-num text-sm text-accent font-semibold">{c.minScore}</span>}
      >
        <input
          type="range" min={0} max={100} step={5}
          value={c.minScore}
          onChange={e => setMinScore(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>0</span><span>50</span><span>100</span>
        </div>
      </Section>

      <Section title="Grade Filter">
        <div className="space-y-1">
          {p.grades.map(g => {
            const on = c.gradeFilter.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGrade(g)}
                className={`w-full flex items-center justify-between px-2.5 h-8 rounded-md text-[12px] transition
                  ${on
                    ? 'bg-accent/10 border border-accent/30 text-accent'
                    : 'bg-white/[0.02] border border-white/5 text-white/50 hover:text-white/80'
                  }`}
              >
                <span>{g}</span>
                <span className={`w-3.5 h-3.5 rounded-sm border ${on ? 'bg-accent border-accent' : 'border-white/20'}`}>
                  {on && <svg viewBox="0 0 12 12" className="w-full h-full text-black"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Enabled Checks">
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1 -mr-1">
          {Object.entries(c.checks).map(([key, cfg]) => (
            <label key={key} className="flex items-center gap-2 text-[12px] text-white/70 cursor-pointer hover:text-white py-0.5">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={() => toggleCheck(key)}
                className="accent-accent w-3.5 h-3.5"
              />
              <span className="flex-1 truncate">{key}</span>
              <span className="kbd">{cfg.points}</span>
            </label>
          ))}
        </div>
      </Section>

      <div className="hr-soft" />

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/40">Universe</span>
        <span className="stat-num text-accent font-semibold">{p.totalStocks.toLocaleString()} stocks</span>
      </div>
    </aside>
  );
}