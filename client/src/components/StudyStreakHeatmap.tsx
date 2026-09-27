import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { getStudyActivity, computeStreaks, type DayActivity } from '../lib/studyActivity';

const LEVEL_CLS = [
  'bg-[var(--fios-surface-2)]',
  'bg-[color-mix(in_srgb,var(--fios-accent-solid)_25%,transparent)]',
  'bg-[color-mix(in_srgb,var(--fios-accent-solid)_45%,transparent)]',
  'bg-[color-mix(in_srgb,var(--fios-accent-solid)_70%,transparent)]',
  'bg-[var(--fios-accent-solid)]',
];

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function weeksGrid(days: DayActivity[]): DayActivity[][] {
  // Pad so first column starts on Monday
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

export const StudyStreakHeatmap: React.FC = () => {
  const [days, setDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getStudyActivity(52)
      .then((d) => { if (!cancelled) setDays(d); })
      .catch(() => { if (!cancelled) setDays([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const streaks = useMemo(() => computeStreaks(days), [days]);
  const cols = useMemo(() => weeksGrid(days), [days]);
  const activeDays = days.filter((d) => d.level > 0).length;

  return (
    <div className="bg-[var(--fios-surface)]/60 border fios-border rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b fios-border pb-3">
        <div>
          <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-0.5 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Study streak
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-wide text-[var(--fios-text)]">
            Contribution heatmap
          </h3>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs">
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

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--fios-text-muted)]" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex gap-0.5 min-w-0">
            <div className="flex flex-col gap-0.5 pr-1.5 pt-0 justify-between text-[9px] font-mono text-[var(--fios-text-muted)]">
              {WEEKDAYS.map((label, i) => (
                <span key={i} className="h-[11px] leading-[11px]">{label}</span>
              ))}
            </div>
            <div className="flex gap-0.5">
              {cols.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-0.5">
                  {col.map((cell, ri) => (
                    <div
                      key={`${ci}-${ri}`}
                      title={
                        cell.date
                          ? `${cell.date}: ${cell.minutes}m focus · ${cell.reviews} reviews`
                          : undefined
                      }
                      className={`w-[11px] h-[11px] rounded-[2px] ${cell.date ? LEVEL_CLS[cell.level] : 'bg-transparent'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-mono text-[var(--fios-text-muted)]">
            <span>Less</span>
            {LEVEL_CLS.map((cls, i) => (
              <span key={i} className={`w-[11px] h-[11px] rounded-[2px] ${cls}`} />
            ))}
            <span>More</span>
            <span className="ml-auto">Focus sessions + flashcard reviews</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyStreakHeatmap;
