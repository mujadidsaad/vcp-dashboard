interface Props {
  value?: string;
  onChange: (value?: string) => void;
  compact?: boolean;
}

/** yyyy-mm-dd in local time. */
function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function today(): string {
  return toDateInputValue(new Date());
}

function fiveYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return toDateInputValue(d);
}

/** If user chooses Sat/Sun, snap to previous Friday. */
function snapWeekendToFriday(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() - 1); // Saturday -> Friday
  if (day === 0) d.setDate(d.getDate() - 2); // Sunday -> Friday
  return toDateInputValue(d);
}

export default function AsOfPicker({ value, onChange, compact }: Props) {
  const isBacktest = Boolean(value);

  return (
    <label className={compact ? 'flex flex-col gap-1' : 'flex flex-col gap-1 min-w-[150px]'}>
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-medium">
        As-of date
      </span>
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={value ?? ''}
          min={fiveYearsAgo()}
          max={today()}
          onChange={e => onChange(e.target.value ? snapWeekendToFriday(e.target.value) : undefined)}
          className={
            `h-9 px-2 rounded-md bg-white/[0.03] border text-[12px] text-white ` +
            `focus:outline-none focus:border-accent/50 stat-num ` +
            (isBacktest ? 'border-accent/50 bg-accent/[0.05]' : 'border-white/10')
          }
          title="Optional. Pick a past date to run the screener as if today were that date. Leave empty for latest data."
        />
        {isBacktest && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="h-9 px-2 rounded-md text-[11px] border border-white/10 text-white/55 hover:text-white hover:border-white/25"
            title="Return to latest data"
          >
            Latest
          </button>
        )}
      </div>
      {isBacktest && (
        <span className="text-[10px] text-accent/90">
          Backtest mode · using data up to {value}
        </span>
      )}
    </label>
  );
}