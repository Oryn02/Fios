import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon, ExternalLink, GraduationCap, Clock, BookOpen,
  ChevronLeft, ChevronRight, Link2,
} from 'lucide-react';
import {
  ATU_ACADEMIC_EVENTS, ATU_CATEGORY_STYLES, localDateKey,
  type AtuEventCategory,
} from '../lib/atuAcademicCalendar';
import {
  CalendarEvent, eventsOnLocalDay, fetchAndParseCalendar, getSavedCalendarUrl,
} from '../lib/calendarService';

type ViewMode = 'list' | 'month';

export const ATUCalendarView: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [now] = useState(() => new Date());
  const [timetable, setTimetable] = useState<CalendarEvent[]>([]);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getSavedCalendarUrl();
        if (!url) {
          setSyncNote('No ATU iCal URL saved — show academic key dates only. Sync a feed in Schedule / Settings.');
          return;
        }
        const events = await fetchAndParseCalendar(url);
        if (!cancelled) {
          setTimetable(events);
          setSyncNote(`Overlaying ${events.length} timetable sessions from your synced ATU iCal.`);
        }
      } catch (err: any) {
        if (!cancelled) setSyncNote(err?.message || 'Could not load synced timetable.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredDates = useMemo(
    () => (filter === 'all'
      ? ATU_ACADEMIC_EVENTS
      : ATU_ACADEMIC_EVENTS.filter((d) => d.category === filter)),
    [filter]
  );

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    let startPad = first.getDay() - 1;
    if (startPad === -1) startPad = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; date?: Date }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(year, month, d) });
    }
    return cells;
  }, [cursor]);

  const academicByKey = useMemo(() => {
    const map = new Map<string, typeof ATU_ACADEMIC_EVENTS>();
    for (const ev of ATU_ACADEMIC_EVENTS) {
      const list = map.get(ev.dateKey) || [];
      list.push(ev);
      map.set(ev.dateKey, list);
    }
    return map;
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-[var(--fios-text)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b fios-border pb-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2 text-[var(--fios-text)]">
            <GraduationCap className="w-6 h-6 accent-solid-text" /> ATU Academic Calendar
          </h2>
          <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
            Atlantic Technological University · Key dates (2026–27) + synced iCal timetable overlay.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[var(--fios-surface-2)] border fios-border rounded-lg p-1">
            {(['month', 'list'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase cursor-pointer ${
                  viewMode === m ? 'accent-bg text-slate-950' : 'text-[var(--fios-text-muted)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <a
            href="https://studenthub.atu.ie/GalwayMayo/getgoing"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[var(--fios-surface)] border fios-border text-xs font-mono font-bold text-[var(--fios-text)] rounded-xl hover:accent-border transition-colors inline-flex items-center gap-1.5"
          >
            ATU Student Hub <ExternalLink className="w-3.5 h-3.5 text-[var(--fios-text-muted)]" />
          </a>
          <a
            href="https://studenthub.atu.ie/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[var(--fios-surface)] border fios-border text-xs font-mono font-bold accent-solid-text rounded-xl hover:border-emerald-500/50 transition-colors inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" /> ATU Galway-Mayo VLE <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {syncNote && (
        <p className="text-[11px] font-mono text-[var(--fios-text-muted)] flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 accent-solid-text shrink-0" /> {syncNote}
        </p>
      )}

      {viewMode === 'list' ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['all', 'term', 'exam', 'repeat', 'deadline', 'holiday'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors cursor-pointer shrink-0 ${
                  filter === cat
                    ? 'accent-bg text-slate-950'
                    : 'bg-[var(--fios-surface)] border fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)]'
                }`}
              >
                {cat === 'all' ? 'All Key Dates' : cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredDates.map((item, idx) => {
              const past = item.dateKey < localDateKey(now);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-4 rounded-xl bg-[var(--fios-surface)] border fios-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    past ? 'opacity-50' : 'hover:accent-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text shrink-0">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-bold ${past ? 'line-through text-[var(--fios-text-muted)]' : 'text-[var(--fios-text)]'}`}>
                          {item.title}
                        </h4>
                        <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${ATU_CATEGORY_STYLES[item.category as AtuEventCategory]}`}>
                          {item.category}
                        </span>
                        {past && (
                          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border fios-border text-[var(--fios-text-muted)]">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--fios-text-muted)]">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-[var(--fios-text)] shrink-0 bg-[var(--fios-surface-2)] border fios-border px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-fit">
                    <Clock className="w-3.5 h-3.5 accent-solid-text" />
                    {item.dateKey}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 sm:p-6 space-y-4 shadow-[var(--fios-shadow-sm)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-black italic uppercase text-[var(--fios-text)]">
              {cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center bg-[var(--fios-surface-2)] border fios-border rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-1.5 text-[var(--fios-text)] cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                className="px-3 py-1 text-xs font-mono font-bold uppercase text-[var(--fios-text)] cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-1.5 text-[var(--fios-text)] cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--fios-text-muted)]">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" /> Academic</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Timetable</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center font-mono text-[11px] font-black uppercase text-[var(--fios-text-muted)] pb-2 border-b fios-border">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell, idx) => {
              if (!cell.date || cell.day == null) {
                return <div key={`pad-${idx}`} className="min-h-24 rounded-lg bg-[var(--fios-surface-2)]/30 border fios-border opacity-30" />;
              }
              const key = localDateKey(cell.date);
              const academic = academicByKey.get(key) || [];
              const classes = eventsOnLocalDay(timetable, cell.date);
              const isToday = key === localDateKey(now);
              const past = key < localDateKey(now);

              return (
                <div
                  key={key}
                  className={`min-h-28 rounded-lg border fios-border bg-[var(--fios-surface-2)] p-2 flex flex-col gap-1 ${
                    past ? 'opacity-70' : ''
                  } ${isToday ? 'ring-1 ring-emerald-400/50 border-emerald-400' : ''}`}
                >
                  <span className={`text-xs font-mono font-bold w-fit ${
                    isToday ? 'bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded-full' : 'text-[var(--fios-text)]'
                  }`}>
                    {cell.day}
                  </span>
                  <div className="space-y-0.5 overflow-hidden flex-1">
                    {academic.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        title={ev.title}
                        className={`text-[9px] font-mono truncate px-1 py-0.5 rounded border ${ATU_CATEGORY_STYLES[ev.category]} ${
                          past ? 'line-through opacity-70' : ''
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {classes.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        title={ev.title}
                        className={`text-[9px] font-mono truncate px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 ${
                          past ? 'line-through opacity-60' : ''
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {academic.length + classes.length > 3 && (
                      <div className="text-[9px] font-mono text-[var(--fios-text-muted)] italic">
                        +{academic.length + classes.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ATUCalendarView;
