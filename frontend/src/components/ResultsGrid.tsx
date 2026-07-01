import type { VCPResult } from '../types';
import StockCard from './StockCard';

interface Props {
  results: VCPResult[];
  minScore: number;
  gradeFilter: string[];
}

export default function ResultsGrid({ results, minScore, gradeFilter }: Props) {
  const visible = results
    .filter(r => r.vcpScore >= minScore && (gradeFilter.length === 0 || gradeFilter.includes(r.setupGrade)))
    .sort((a, b) => b.vcpScore - a.vcpScore);

  const totalReceived = results.length;
  const hiddenCount = totalReceived - visible.length;

  if (!visible.length) {
    return (
      <div className="panel px-8 py-14 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <circle cx="11" cy="11" r="7" strokeLinecap="round"/>
            <path d="M20 20l-3.5-3.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="text-white/70 text-sm font-medium">
          {totalReceived === 0
            ? 'No results yet — start a scan'
            : `${totalReceived} stock${totalReceived === 1 ? '' : 's'} scanned, but none match the current filters`}
        </div>
        {totalReceived > 0 && (
          <div className="text-white/40 text-xs mt-2 leading-relaxed">
            Try lowering the min score below <span className="stat-num text-white/60">{minScore}</span>{' '}
            or enabling more grades (currently: {gradeFilter.length ? gradeFilter.join(', ') : 'none'}).
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Showing</div>
          <span className="stat-num text-sm text-white font-semibold">
            {visible.length}
            <span className="text-white/40 font-normal"> / {totalReceived}</span>
          </span>
          {hiddenCount > 0 && (
            <span className="text-[11px] text-white/40">
              ({hiddenCount} filtered out)
            </span>
          )}
        </div>
        <div className="text-[11px] text-white/40">
          Sorted by score · min <span className="stat-num text-white/70">{minScore}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {visible.map(r => (
          <StockCard key={r.symbol} r={r} />
        ))}
      </div>
    </div>
  );
}
