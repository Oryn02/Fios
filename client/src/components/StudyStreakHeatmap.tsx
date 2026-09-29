import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Flame, Loader2, Info, RefreshCw } from 'lucide-react';
import { getStudyActivity, computeStreaks, type DayActivity } from '../lib/studyActivity';
import { supabase } from '../lib/supabase';
import { usePomodoroState } from '../context/PomodoroContext';

/** Default visible window — ~4 months; fits a phone card when cells are fluid. */
const DEFAULT_WEEKS = 16;

/** Mobile cell size bounds (px). Fluid fill prefers larger taps. */
const CELL_MIN = 11;
const CELL_MAX_MOBILE = 18;
const CELL_DESKTOP = 11;
const GAP = 2;
const LABEL_COL = 18;

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

function preferReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const StudyStreakHeatmap: React.FC = () => {
  const [days, setDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  /** Tap-selected day for touch devices (title hover is unreliable on iOS). */
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cellPx, setCellPx] = useState(CELL_DESKTOP);
  const [needsScroll, setNeedsScroll] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { completedSessions } = usePomodoroState();

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const d = await getStudyActivity(DEFAULT_WEEKS);
      setDays(d);
      if (!d.length) {
        setLoadError('Could not build the activity window. Pull to refresh or try again.');
      } else if (opts?.quiet) {
        setLoadError(null);
      }
    } catch {
      setDays([]);
      setLoadError('Could not load study activity. Check your connection and try again.');
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initialDone = false;

    const safeLoad = (quiet?: boolean) => {
      if (!cancelled) void load(quiet ? { quiet: true } : undefined);
    };

    safeLoad();

    // PWA / mobile cold start: first paint can race ahead of session restore.
    // Also re-fetch after sign-in so focus_sessions RLS can return rows.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') {
        // Quiet re-fetch once session is restored (avoids empty first paint sticking).
        if (!initialDone) {
          initialDone = true;
          safeLoad(true);
        }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        safeLoad(true);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [load]);

  // Refresh when a Pomodoro work block completes (local + cloud log).
  useEffect(() => {
    if (completedSessions <= 0) return;
    void load({ quiet: true });
  }, [completedSessions, load]);

  const streaks = useMemo(() => computeStreaks(days), [days]);
  const cols = useMemo(() => weeksGrid(days), [days]);
  const monthLabels = useMemo(() => monthLabelsForCols(cols), [cols]);
  const activeDays = days.filter((d) => d.level > 0).length;
  const selected = selectedDate ? days.find((d) => d.date === selectedDate) : null;
  const allQuiet = !loading && !loadError && cols.length > 0 && activeDays === 0;

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el || cols.length === 0) return;
    const width = el.clientWidth;
    if (width <= 0) return;

    const n = cols.length;
    const usable = Math.max(0, width - LABEL_COL);
    const ideal = Math.floor((usable - (n - 1) * GAP) / n);
    // Prefer viewport breakpoint (not card width): on lg the heatmap sits in a
    // ~half column that is still <640px wide, but desktop should keep 11px cells.
    let isNarrow = true;
    try {
      isNarrow = !window.matchMedia('(min-width: 640px)').matches;
    } catch {
      isNarrow = width < 640;
    }

    if (isNarrow) {
      // Prefer fitting the whole strip so overflow-x-hidden parents cannot clip it,
      // and taps do not fight horizontal pan on tiny fixed cells.
      const size = Math.max(CELL_MIN, Math.min(CELL_MAX_MOBILE, ideal));
      setCellPx(size);
      setNeedsScroll(ideal < CELL_MIN);
    } else {
      setCellPx(CELL_DESKTOP);
      setNeedsScroll(ideal < CELL_DESKTOP);
    }
  }, [cols.length]);

  useLayoutEffect(() => {
    measure();
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // When the strip still overflows, start at the most recent weeks (right edge).
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (!sc || !needsScroll || loading) return;
    const jump = () => {
      sc.scrollLeft = sc.scrollWidth;
    };
    jump();
    if (!preferReducedMotion()) {
      requestAnimationFrame(jump);
    }
  }, [needsScroll, loading, cols.length, cellPx]);

  const onCellActivate = (cell: DayActivity) => {
    if (!cell.date) return;
    setSelectedDate((prev) => (prev === cell.date ? null : cell.date));
  };

  const cellStyle = { width: cellPx, height: cellPx } as const;
  const gapStyle = { gap: GAP } as const;

  return (
    // min-w-0: grid/flex parents default min-width:auto and expand to content width,
    // then DashboardLayout overflow-x-hidden clips the card — zero usable scroll on mobile.
    <div className="bg-[var(--fios-surface)] border fios-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm dark:shadow-none min-w-0 w-full max-w-full overflow-hidden">
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
      ) : loadError && cols.length === 0 ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-mono text-[var(--fios-text-muted)] max-w-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border fios-border text-[11px] font-mono font-bold text-[var(--fios-text)] cursor-pointer active:opacity-80"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : cols.length === 0 ? (
        <p className="py-6 text-center text-xs font-mono text-[var(--fios-text-muted)]">
          No activity window yet — finish a focus session or rate flashcards to light up days.
        </p>
      ) : (
        <div className="min-w-0 w-full max-w-full" ref={viewportRef}>
          {/*
            Fluid cell sizing on phones so the strip fits the card (no clip).
            fios-h-scroll only when measurement says we still overflow.
            Cells use manipulation (tap) — not pan-x — so iOS/PWA registers presses.
          */}
          <div
            ref={scrollRef}
            className={`${needsScroll ? 'fios-h-scroll overflow-x-auto' : 'overflow-x-hidden'} overflow-y-hidden max-w-full pb-1 -mx-0.5 px-0.5`}
          >
            <div className="inline-block align-top" style={{ minWidth: needsScroll ? undefined : '100%' }}>
              {/* Month labels — absolute text so “Sep” isn’t clipped to one cell width */}
              <div
                className="flex mb-1.5 relative h-3"
                style={{ ...gapStyle, paddingLeft: LABEL_COL }}
                aria-hidden
              >
                {monthLabels.map((label, i) => (
                  <div key={`m-${i}`} className="shrink-0 relative" style={{ width: cellPx }}>
                    {label ? (
                      <span className="absolute left-0 top-0 text-[9px] font-mono font-bold text-[var(--fios-text-muted)] leading-none whitespace-nowrap">
                        {label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="inline-flex items-start" style={gapStyle}>
                <div
                  className="flex flex-col shrink-0 text-[9px] font-mono font-bold text-[var(--fios-text-muted)] select-none"
                  style={{ ...gapStyle, width: LABEL_COL - GAP, paddingRight: GAP }}
                  aria-hidden
                >
                  {WEEKDAY_LABELS.map((lab, i) => (
                    <span
                      key={i}
                      className="leading-none text-right flex items-center justify-end"
                      style={{ height: cellPx }}
                    >
                      <span className="sm:hidden">{lab.short}</span>
                      <span className="hidden sm:inline">{lab.full}</span>
                    </span>
                  ))}
                </div>

                <div className="flex" style={gapStyle} role="grid" aria-label="Study contribution by day">
                  {cols.map((col, ci) => (
                    <div key={ci} className="flex flex-col" style={gapStyle} role="row">
                      {col.map((cell, ri) => {
                        const isSelected = Boolean(cell.date && cell.date === selectedDate);
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
                            className={`fios-heatmap-cell relative rounded-[2px] shrink-0 border transition-[box-shadow,border-color] ${
                              cell.date
                                ? `${LEVEL_CLS[cell.level]} cursor-pointer ${
                                    isSelected
                                      ? 'border-[var(--fios-accent-solid)] ring-1 ring-[var(--fios-accent-solid)]'
                                      : 'border-[color-mix(in_srgb,var(--fios-border)_80%,transparent)]'
                                  }`
                                : 'bg-transparent border-transparent pointer-events-none'
                            }`}
                            style={cellStyle}
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
            ) : allQuiet ? (
              <span>No focus or reviews in this window yet — tap any day for its date.</span>
            ) : (
              <span className="sm:hidden">Tap a day for date & activity</span>
            )}
          </div>

          {loadError && (
            <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-amber-400/90">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="underline cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-[var(--fios-text-muted)] flex-wrap">
            <span>Less</span>
            {LEVEL_CLS.map((cls, i) => (
              <span
                key={i}
                className={`rounded-[2px] border border-[color-mix(in_srgb,var(--fios-border)_80%,transparent)] ${cls}`}
                style={{ width: Math.min(cellPx, 12), height: Math.min(cellPx, 12) }}
              />
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
