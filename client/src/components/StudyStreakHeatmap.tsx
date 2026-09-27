import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Loader2, Info } from 'lucide-react';
import { getStudyActivity, computeStreaks, type DayActivity } from '../lib/studyActivity';

/** Default visible window — ~4 months; keeps mobile width usable. */
const DEFAULT_WEEKS = 16;

const LEVEL_CLS = [
  'bg-[var(--fios-surface-2)]',
  'bg-[color-mix(in_srgb,var(--fios-accent-solid)_25%,transparent)]',
  'bg-[color-mix(in_srgb,var(--fios-accent-solid)_45%,transparent)]',
  'bg-[color-mix(in_srgb,var(--fios-accent-solid)_70%,transparent)]',
  'bg-[var(--fios-accent-solid)]',
];

/** Mon–Sun labels; show Mon/Wed/Fri on all sizes (compact), full set on sm+. */
const WEEKDAY_LABELS = [
  { short: 'M', full: 'Mon' },
  { short: '', full: '' },
  { short: 'W', full: 'Wed' },
  { short: '', full: '' },
  { short: 'F', full: 'Fri' },
  { short: '', full: '' },
  { short: '', full: '' },
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function weeksGrid(days: DayActivity[]): DayActivity[][] {
  if (!days.length) return [];
  const first = new Date(days[0].date + 'T12:00:00');
  const dow = (first.getDay() + 6) % 7; // Mon=0
  const padded: (DayActivity | null)[] = Array(dow).fill(null);
  padded.push(...days);

  const cols: DayActivity[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const col: DayActivity[] = [];
    for (let r = 0; r < 7; r++) {
      const cell = padded[i + r];
      if (cell) col.push(cell);
      else col.push({ date: '', minutes: 0, reviews: 0, level: 0 });
    }
    cols.push(col);
  }
  return cols;
}

/** Month label per week column — only when the month changes (or first col). */
function monthLabelsForCols(cols: DayActivity[][]): (string | null)[] {
  let prevMonth = -1;
  return cols.map((col) => {
    const day = col.find((c) => c.date)?.date;
    if (!day) return null;
    const d = new Date(day + 'T12:00:00');
    const m = d.getMonth();
    if (m === prevMonth) return null;
    prevMonth = m;
    return MONTH_SHORT[m];
  });
}

function formatDayTitle(cell: DayActivity): string {
  if (!cell.date) return '';
  const d = new Date(cell.date + 'T12:00:00');
  const nice = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const parts: string[] = [];
  if (cell.minutes > 0) parts.push(`${cell.minutes}m focus`);
  if (cell.reviews > 0) parts.push(`${cell.reviews} review${cell.reviews === 1 ? '' : 's'}`);
  const activity = parts.length ? parts.join(' · ') : 'No activity';
  return `${nice} — ${activity}`;
}

export const StudyStreakHeatmap: React.FC = () => {
  const [days, setDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  /** Tap-selected day for touch devices (title hover is unreliable on iOS). */
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStudyActivity(DEFAULT_WEEKS)
      .then((d) => {
        if (!cancelled) setDays(d);
      })
      .catch(() => {
        if (!cancelled) setDays([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const streaks = useMemo(() => computeStreaks(days), [days]);
  const cols = useMemo(() => weeksGrid(days), [days]);
  const monthLabels = useMemo(() => monthLabelsForCols(cols), [cols]);
  const activeDays = days.filter((d) => d.level > 0).length;
  const selected = selectedDate ? days.find((d) => d.date === selectedDate) : null;

  const onCellActivate = (cell: DayActivity) => {
    if (!cell.date) return;
    setSelectedDate((prev) => (prev === cell.date ? null : cell.date));
  };

  return (
    // min-w-0: grid/flex parents default min-width:auto and expand to ~52w content,
    // then DashboardLayout overflow-x-hidden clips the card — zero usable scroll on mobile.
    <div className="bg-[var(--fios-surface)]/60 border fios-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl min-w-0 w-full max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b fios-border pb-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-0.5 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 shrink-0" /> Study streak
          </div>
          <h3 className="text-base sm:text-lg font-black italic uppercase tracking-wide text-[var(--fios-text)] flex items-center gap-2">
            Contribution heatmap
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="p-1 rounded-md text-[var(--fios-text-muted)] hover:accent-solid-text cursor-pointer shrink-0"
              aria-label="How the contribution heatmap works"
              aria-expanded={showHelp}
              title="How this heatmap works"
            >
              <Info className="w-4 h-4" />
            </button>
          </h3>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px] sm:text-xs flex-wrap">
          <div>
            <span className="text-[var(--fios-text-muted)]">Current </span>
            <span className="font-black accent-solid-text">{streaks.current}d</span>
          </div>
          <div>
            <span className="text-[var(--fios-text-muted)]">Longest </span>
            <span className="font-black text-[var(--fios-text)]">{streaks.longest}d</span>
          </div>
          <div>
            <span className="text-[var(--fios-text-muted)]">Active </span>
            <span className="font-black text-[var(--fios-text)]">{activeDays}</span>
          </div>
        </div>
      </div>

      {showHelp && (
        <div
          role="region"
          aria-label="Heatmap help"
          className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3.5 text-[11px] font-mono text-[var(--fios-text-muted)] space-y-1.5 leading-relaxed"
        >
          <p className="font-bold text-[var(--fios-text)] uppercase tracking-wide text-[10px]">
            How contribution intensity works
          </p>
          <p>
            Each cell is a day. Intensity rises from <strong className="text-[var(--fios-text)]">focus sessions</strong>{' '}
            (Pomodoro work minutes) plus <strong className="text-[var(--fios-text)]">flashcard reviews</strong> that day.
          </p>
          <p>
            <strong className="text-[var(--fios-text)]">Current / longest</strong> streaks count consecutive days with
            any activity. Tap a cell for the date and counts (hover works on desktop).
          </p>
          <p>Showing the last {DEFAULT_WEEKS} weeks.</p>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--fios-text-muted)]" />
        </div>
      ) : cols.length === 0 ? (
        <p className="py-6 text-center text-xs font-mono text-[var(--fios-text-muted)]">
          No activity window yet — finish a focus session or rate flashcards to light up days.
        </p>
      ) : (
        <div className="min-w-0 w-full">
          {/*
            fios-h-scroll: horizontal pan on touch (do NOT use .scroll-touch — that sets pan-y only).
            Month row + grid share one scroll so labels stay aligned with weeks.
          */}
          <div className="fios-h-scroll overflow-x-auto overflow-y-hidden max-w-full pb-1 -mx-0.5 px-0.5">
            <div className="inline-block min-w-0 align-top">
              {/* Month labels — absolute text so “Sep” isn’t clipped to one cell width */}
              <div className="flex gap-0.5 mb-1.5 pl-[18px] sm:pl-[22px] relative h-3" aria-hidden>
                {monthLabels.map((label, i) => (
                  <div key={`m-${i}`} className="w-3 sm:w-[11px] shrink-0 relative">
                    {label ? (
                      <span className="absolute left-0 top-0 text-[9px] font-mono font-bold text-[var(--fios-text-muted)] leading-none whitespace-nowrap">
                        {label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="inline-flex gap-0.5 items-start">
                <div
                  className="flex flex-col gap-0.5 pr-1 shrink-0 text-[9px] font-mono font-bold text-[var(--fios-text-muted)] select-none"
                  aria-hidden
                >
                  {WEEKDAY_LABELS.map((lab, i) => (
                    <span
                      key={i}
                      className="h-3 sm:h-[11px] leading-3 sm:leading-[11px] w-3.5 sm:w-4 text-right"
                    >
                      <span className="sm:hidden">{lab.short}</span>
                      <span className="hidden sm:inline">{lab.full}</span>
                    </span>
                  ))}
                </div>

                <div className="flex gap-0.5" role="grid" aria-label="Study contribution by day">
                  {cols.map((col, ci) => (
                    <div key={ci} className="flex flex-col gap-0.5" role="row">
                      {col.map((cell, ri) => {
                        const isSelected = cell.date && cell.date === selectedDate;
                        const label = cell.date ? formatDayTitle(cell) : undefined;
                        return (
                          <button
                            key={`${ci}-${ri}`}
                            type="button"
                            role="gridcell"
                            disabled={!cell.date}
                            tabIndex={cell.date ? 0 : -1}
                            title={label}
                            aria-label={label || 'Empty'}
                            aria-pressed={isSelected || undefined}
                            onClick={() => onCellActivate(cell)}
                            className={`w-3 h-3 sm:w-[11px] sm:h-[11px] rounded-[2px] shrink-0 border transition-[box-shadow,border-color] ${
                              cell.date
                                ? `${LEVEL_CLS[cell.level]} cursor-pointer ${
                                    isSelected
                                      ? 'border-[var(--fios-accent-solid)] ring-1 ring-[var(--fios-accent-solid)]'
                                      : 'border-transparent'
                                  }`
                                : 'bg-transparent border-transparent pointer-events-none'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tap detail panel — primary date readout on touch */}
          <div
            className="mt-2 min-h-[1.25rem] text-[11px] font-mono text-[var(--fios-text-muted)]"
            aria-live="polite"
          >
            {selected ? (
              <span className="text-[var(--fios-text)]">{formatDayTitle(selected)}</span>
            ) : (
              <span className="sm:hidden">Tap a day for date & activity</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-[var(--fios-text-muted)] flex-wrap">
            <span>Less</span>
            {LEVEL_CLS.map((cls, i) => (
              <span key={i} className={`w-3 h-3 sm:w-[11px] sm:h-[11px] rounded-[2px] ${cls}`} />
            ))}
            <span>More</span>
            <span className="w-full sm:w-auto sm:ml-auto pt-1 sm:pt-0">
              Last {DEFAULT_WEEKS} weeks · focus + reviews
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyStreakHeatmap;
