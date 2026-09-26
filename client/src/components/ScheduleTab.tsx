import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, MapPin, Link2, RefreshCw,
  Upload, ChevronLeft, ChevronRight, Check, Play, Coffee, GraduationCap,
} from 'lucide-react';
import {
  saveCalendarUrl, getSavedCalendarUrl, fetchAndParseCalendar,
  parseIcsText, CalendarEvent, eventsOnLocalDay, findNextClass,
  isClassFinished, isClassOngoing, validateClientIcalUrl,
} from '../lib/calendarService';
import {
  ATU_ACADEMIC_EVENTS, ATU_CATEGORY_STYLES, atuEventsOnDay, localDateKey,
  type AtuAcademicEvent,
} from '../lib/atuAcademicCalendar';

type ViewMode = 'day' | 'week' | 'month';

export interface BreakData {
  id: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
}

interface TimetableItem {
  type: 'event' | 'break';
  data: CalendarEvent | BreakData;
}

const ScheduleTabInner: React.FC = () => {
  const [icalUrl, setIcalUrl] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());
  const [showAtuOverlay, setShowAtuOverlay] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadSavedFeed() {
      try {
        const savedUrl = await getSavedCalendarUrl();
        if (savedUrl) {
          setIcalUrl(savedUrl);
          void loadEvents(savedUrl);
        }
      } catch (err) {
        console.error('Failed to load saved calendar feed:', err);
      }
    }
    void loadSavedFeed();
  }, []);

  const loadEvents = async (urlToFetch: string) => {
    if (!urlToFetch.trim()) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const parsedEvents = await fetchAndParseCalendar(urlToFetch);
      setEvents(parsedEvents);
      setStatusMessage({
        type: 'success',
        text: `Synced ${parsedEvents.length} sessions · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error fetching calendar feed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icalUrl.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      await loadEvents(icalUrl.trim());
      saveCalendarUrl(icalUrl.trim()).catch((err) => {
        console.error('Background save failed:', err);
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch calendar feed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const rawText = await file.text();
      const rangeStart = new Date(new Date().getFullYear() - 1, 0, 1);
      const rangeEnd = new Date(new Date().getFullYear() + 2, 11, 31);
      const parsedEvents = parseIcsText(rawText, rangeStart, rangeEnd);
      setEvents(parsedEvents);
      setStatusMessage({ type: 'success', text: `Loaded ${parsedEvents.length} events from file (recurring expanded).` });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to parse .ics file.' });
    } finally {
      setLoading(false);
    }
  };

  const buildDayTimeline = useCallback((targetDate: Date): TimetableItem[] => {
    const dayClasses = eventsOnLocalDay(events, targetDate);
    const items: TimetableItem[] = [];

    for (let i = 0; i < dayClasses.length; i++) {
      const current = dayClasses[i];
      items.push({ type: 'event', data: current });

      if (i < dayClasses.length - 1) {
        const next = dayClasses[i + 1];
        const gapMs = next.startDate.getTime() - current.endDate.getTime();
        const gapMinutes = Math.round(gapMs / (1000 * 60));

        if (gapMinutes >= 15) {
          items.push({
            type: 'break',
            data: {
              id: `break-${localDateKey(targetDate)}-${i}`,
              startDate: current.endDate,
              endDate: next.startDate,
              durationMinutes: gapMinutes,
            },
          });
        }
      }
    }

    return items;
  }, [events]);

  const singleDayTimeline = useMemo(
    () => buildDayTimeline(selectedDate),
    [buildDayTimeline, selectedDate]
  );

  const nextClass = useMemo(() => findNextClass(events, now), [events, now]);

  const nextUpEventId = useMemo(() => {
    if (localDateKey(selectedDate) !== localDateKey(now)) return null;
    const upcoming = eventsOnLocalDay(events, selectedDate).find((e) => e.startDate > now);
    return upcoming?.id ?? null;
  }, [events, selectedDate, now]);

  const weekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const dayOfWeek = curr.getDay();
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMon);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  const formattedInputDate = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month, day] = e.target.value.split('-').map(Number);
    setSelectedDate(new Date(year, month - 1, day));
  };

  const changeDate = (delta: number) => {
    const nextDate = new Date(selectedDate);
    if (viewMode === 'day') nextDate.setDate(nextDate.getDate() + delta);
    if (viewMode === 'week') nextDate.setDate(nextDate.getDate() + delta * 7);
    if (viewMode === 'month') nextDate.setMonth(nextDate.getMonth() + delta);
    setSelectedDate(nextDate);
  };

  const resetToToday = () => setSelectedDate(new Date());

  const formatTimeRange = (start: Date, end: Date) => {
    const formatTime = (d: Date) =>
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${formatTime(start)}–${formatTime(end)}`;
  };

  const formatBreakDuration = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m break` : `${hours}h break`;
    }
    return `${mins}m break`;
  };

  const monthAtuByDay = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const map = new Map<string, AtuAcademicEvent[]>();
    for (const ev of ATU_ACADEMIC_EVENTS) {
      const [y, m] = ev.dateKey.split('-').map(Number);
      if (y === year && m === month + 1) {
        const list = map.get(ev.dateKey) || [];
        list.push(ev);
        map.set(ev.dateKey, list);
      }
    }
    return map;
  }, [selectedDate]);

  const renderClassCard = (event: CalendarEvent, viewingDay: Date, compact = false) => {
    const finished = isClassFinished(event, now, viewingDay);
    const ongoing = isClassOngoing(event, now, viewingDay);
    const isNextUp = event.id === nextUpEventId || (nextClass?.id === event.id && localDateKey(viewingDay) === localDateKey(now));

    return (
      <div
        key={event.id}
        className={`bg-[var(--fios-surface)] border rounded-xl ${compact ? 'p-4' : 'p-5'} flex flex-col sm:flex-row items-start gap-4 sm:gap-6 transition-all ${
          ongoing
            ? 'border-emerald-400 border-l-8 border-l-emerald-400 bg-emerald-500/10 shadow-[var(--fios-shadow-md)]'
            : isNextUp && !finished
            ? 'border-cyan-500/60 border-l-4 border-l-cyan-400 bg-cyan-500/5'
            : finished
            ? 'border-[var(--fios-border)] opacity-45 border-l-4 border-l-slate-500'
            : 'fios-border border-l-4 border-l-emerald-400/50 hover:accent-border'
        }`}
      >
        <div className={`w-28 sm:w-32 shrink-0 font-mono ${compact ? 'text-xs' : 'text-sm'} font-black pt-0.5 ${
          finished ? 'text-[var(--fios-text-muted)]' : 'text-[var(--fios-text)]'
        }`}>
          {formatTimeRange(event.startDate, event.endDate)}
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`${compact ? 'text-sm' : 'text-base'} font-black tracking-wide ${
              finished ? 'line-through text-[var(--fios-text-muted)]' : 'text-[var(--fios-text)]'
            }`}>
              {event.title}
            </h3>

            {ongoing && (
              <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-emerald-400/50 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                In progress
              </span>
            )}

            {isNextUp && !finished && !ongoing && (
              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-cyan-400/50 flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-cyan-300" />
                Next
              </span>
            )}

            {finished && (
              <span className="bg-[var(--fios-surface-2)] text-[var(--fios-text-muted)] text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border fios-border flex items-center gap-1">
                <Check className="w-3 h-3" />
                Completed
              </span>
            )}
          </div>

          {event.location && (
            <p className={`text-xs font-mono flex items-center gap-1.5 font-bold ${finished ? 'text-[var(--fios-text-muted)]' : 'text-cyan-400'}`}>
              <MapPin className="w-3.5 h-3.5 shrink-0" /> {event.location}
            </p>
          )}

          {!compact && event.description && (
            <p className="text-xs text-[var(--fios-text-muted)] font-mono leading-relaxed pt-1 whitespace-pre-line">
              {event.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-[var(--fios-text)]">
      <header className="space-y-1">
        <div className="flex items-center gap-2 accent-solid-text text-xs font-mono font-black uppercase tracking-widest">
          <CalendarIcon className="w-3.5 h-3.5" />
          Timetable connected
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-[var(--fios-text)]">
          College Timetable
        </h1>
      </header>

      {/* Next Class — prominent */}
      {nextClass && (
        <button
          type="button"
          onClick={() => {
            setSelectedDate(new Date(nextClass.startDate));
            setViewMode('day');
          }}
          className="w-full text-left rounded-2xl border accent-border bg-[var(--fios-surface)] p-5 sm:p-6 shadow-[var(--fios-shadow-md)] space-y-3 cursor-pointer hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-black uppercase tracking-widest accent-solid-text">
              <Play className="w-3.5 h-3.5 fill-current" />
              Next class
            </span>
            <span className="text-xs font-mono font-bold text-[var(--fios-text-muted)]">
              {nextClass.startDate.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
              {' · '}
              {formatTimeRange(nextClass.startDate, nextClass.endDate)}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--fios-text)]">
            {nextClass.title}
          </h2>
          {nextClass.location && (
            <p className="text-sm font-mono text-cyan-400 flex items-center gap-1.5 font-bold">
              <MapPin className="w-4 h-4" /> {nextClass.location}
            </p>
          )}
          {isClassOngoing(nextClass, now, nextClass.startDate) && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded border border-emerald-400/50 bg-emerald-400/15 text-emerald-300">
              Happening now
            </span>
          )}
        </button>
      )}

      {/* Sync Control */}
      <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 shadow-[var(--fios-shadow-sm)] space-y-3">
        <form onSubmit={(e) => void handleSaveAndFetch(e)} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Link2 className="w-4 h-4 text-[var(--fios-text-muted)] absolute left-3 top-2.5" />
            <input
              type="url"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="https://timetables.atu.ie/Ical/StudentSet?studentSetID=..."
              className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-[var(--fios-text)] placeholder:opacity-50 focus:outline-none focus:accent-border transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !icalUrl.trim()}
            className="w-full sm:w-auto px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Sync'}
          </button>

          <label className="w-full sm:w-auto px-4 py-2 bg-[var(--fios-surface-2)] border fios-border hover:accent-border text-[var(--fios-text)] text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shrink-0">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            Import .ics
            <input type="file" accept=".ics" onChange={(e) => void handleFileUpload(e)} className="hidden" />
          </label>
        </form>

        {statusMessage && (
          <p className={`text-[11px] font-mono ${statusMessage.type === 'success' ? 'text-[var(--fios-text-muted)]' : 'text-rose-400'}`}>
            {statusMessage.text}
          </p>
        )}
      </div>

      {/* Date Header & View Selector */}
      <div className="flex flex-col items-center justify-center space-y-4 py-2">
        <h2 className="text-2xl font-black italic uppercase tracking-wide text-[var(--fios-text)] text-center">
          {viewMode === 'day' && selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {viewMode === 'week' && `Week of ${weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          {viewMode === 'month' && selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center bg-[var(--fios-surface-2)] border fios-border rounded-lg p-1 gap-1">
            <button type="button" onClick={() => changeDate(-1)} className="p-1.5 hover:opacity-80 text-[var(--fios-text)] rounded-md transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={resetToToday} className="px-3 py-1 text-xs font-mono font-bold uppercase text-[var(--fios-text)] hover:opacity-80 rounded-md transition-colors cursor-pointer">
              Today
            </button>
            <button type="button" onClick={() => changeDate(1)} className="p-1.5 hover:opacity-80 text-[var(--fios-text)] rounded-md transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex items-center bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-cyan-400 mr-2 shrink-0 pointer-events-none" />
            <input
              type="date"
              value={formattedInputDate}
              onChange={handleDateChange}
              className="bg-transparent text-xs font-mono font-bold text-[var(--fios-text)] focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center bg-[var(--fios-surface-2)] border fios-border rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'accent-bg text-slate-950 font-black shadow-md'
                    : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {viewMode === 'month' && (
            <label className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAtuOverlay}
                onChange={(e) => setShowAtuOverlay(e.target.checked)}
                className="accent-[var(--fios-accent-solid)]"
              />
              <GraduationCap className="w-3.5 h-3.5 accent-solid-text" />
              ATU key dates
            </label>
          )}
        </div>
      </div>

      {/* Views */}
      {events.length === 0 && !loading && viewMode !== 'month' ? (
        <div className="bg-[var(--fios-surface)]/50 border fios-border rounded-xl p-12 text-center space-y-2">
          <CalendarIcon className="w-8 h-8 text-[var(--fios-text-muted)] mx-auto opacity-50" />
          <p className="text-xs font-bold text-[var(--fios-text-muted)] uppercase">No timetable synced</p>
          <p className="text-[11px] font-mono text-[var(--fios-text-muted)]">Paste your ATU iCal URL above, or open Month to see academic key dates.</p>
        </div>
      ) : viewMode === 'day' ? (
        <div className="space-y-3">
          {showAtuOverlay && atuEventsOnDay(selectedDate).map((atu) => (
            <div
              key={atu.id}
              className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 flex items-start gap-3 border-l-4 border-l-amber-400/70"
            >
              <GraduationCap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-[var(--fios-text)]">{atu.title}</h3>
                  <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${ATU_CATEGORY_STYLES[atu.category]}`}>
                    ATU · {atu.category}
                  </span>
                </div>
                <p className="text-xs text-[var(--fios-text-muted)]">{atu.description}</p>
              </div>
            </div>
          ))}

          {singleDayTimeline.length === 0 ? (
            <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-10 text-center text-[var(--fios-text-muted)] text-xs font-mono font-bold uppercase">
              No classes scheduled for this day.
            </div>
          ) : (
            singleDayTimeline.map((item) => {
              if (item.type === 'break') {
                const breakData = item.data as BreakData;
                return (
                  <div key={breakData.id} className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t fios-border opacity-60" /></div>
                    <span className="relative bg-[var(--fios-surface-2)] px-4 py-1 border fios-border rounded-full text-[11px] font-mono font-bold text-[var(--fios-text-muted)] flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-400" />
                      {formatBreakDuration(breakData.durationMinutes)}
                    </span>
                  </div>
                );
              }
              return renderClassCard(item.data as CalendarEvent, selectedDate);
            })
          )}
        </div>
      ) : viewMode === 'week' ? (
        <div className="space-y-8">
          {weekDays.map((day) => {
            const timeline = buildDayTimeline(day);
            const isToday = localDateKey(day) === localDateKey(now);
            const atuDay = showAtuOverlay ? atuEventsOnDay(day) : [];

            return (
              <div key={day.toDateString()} className="space-y-3">
                <div className="border-b fios-border pb-2">
                  <h3 className={`text-sm font-black italic uppercase tracking-wider ${isToday ? 'accent-solid-text' : 'text-[var(--fios-text)]'}`}>
                    {day.toLocaleDateString('en-GB', { weekday: 'long' })}
                  </h3>
                  <p className="text-xs font-mono text-[var(--fios-text-muted)]">
                    {day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {atuDay.map((atu) => (
                  <div key={atu.id} className="text-xs font-mono px-3 py-2 rounded-lg border fios-border bg-[var(--fios-surface)] flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-[var(--fios-text)]">{atu.title}</span>
                    <span className={`ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded border ${ATU_CATEGORY_STYLES[atu.category]}`}>
                      {atu.category}
                    </span>
                  </div>
                ))}

                {timeline.length === 0 && atuDay.length === 0 ? (
                  <p className="text-xs font-mono text-[var(--fios-text-muted)] py-2 opacity-70">No classes</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((item) => {
                      if (item.type === 'break') {
                        const breakData = item.data as BreakData;
                        return (
                          <div key={breakData.id} className="relative flex items-center justify-center my-3">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t fios-border opacity-50" /></div>
                            <span className="relative bg-[var(--fios-surface-2)] px-3 text-[11px] font-mono text-[var(--fios-text-muted)] font-bold">
                              {formatBreakDuration(breakData.durationMinutes)}
                            </span>
                          </div>
                        );
                      }
                      return renderClassCard(item.data as CalendarEvent, day, true);
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Monthly view — iCal (expanded) + ATU academic overlay */
        <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 sm:p-6 space-y-4 shadow-[var(--fios-shadow-sm)]">
          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono text-[var(--fios-text-muted)]">
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Timetable</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" /> ATU academic</span>
            </span>
            <span>{events.length} synced sessions · {monthAtuByDay.size} ATU days this month</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center font-mono text-[11px] font-black uppercase text-[var(--fios-text-muted)] pb-2 border-b fios-border">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth();
              const firstDayOfMonth = new Date(year, month, 1);
              const lastDayOfMonth = new Date(year, month + 1, 0);

              let startDayIndex = firstDayOfMonth.getDay() - 1;
              if (startDayIndex === -1) startDayIndex = 6;

              const daysInMonth = lastDayOfMonth.getDate();
              const calendarCells = [];

              for (let i = 0; i < startDayIndex; i++) {
                calendarCells.push(
                  <div key={`pad-${i}`} className="min-h-24 bg-[var(--fios-surface-2)]/40 border fios-border rounded-lg opacity-30" />
                );
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const currentDate = new Date(year, month, day);
                const key = localDateKey(currentDate);
                const dayEvents = eventsOnLocalDay(events, currentDate);
                const atuDay = showAtuOverlay ? (monthAtuByDay.get(key) || []) : [];
                const isTodayCell = key === localDateKey(now);
                const isSelectedCell = key === localDateKey(selectedDate);
                const isPastDay = key < localDateKey(now);
                const chips = [
                  ...dayEvents.map((ev) => ({
                    id: ev.id,
                    label: ev.title,
                    kind: 'ical' as const,
                    finished: isClassFinished(ev, now, currentDate),
                  })),
                  ...atuDay.map((ev) => ({
                    id: ev.id,
                    label: ev.title,
                    kind: 'atu' as const,
                    finished: isPastDay,
                  })),
                ];

                calendarCells.push(
                  <div
                    key={`day-${day}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedDate(currentDate);
                      setViewMode('day');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedDate(currentDate);
                        setViewMode('day');
                      }
                    }}
                    className={`min-h-28 bg-[var(--fios-surface-2)] border rounded-lg p-2 flex flex-col gap-1 cursor-pointer transition-all hover:accent-border ${
                      isSelectedCell ? 'border-emerald-400 ring-1 ring-emerald-400/40' : 'fios-border'
                    } ${isPastDay ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-mono font-bold ${
                        isTodayCell
                          ? 'bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded-full'
                          : 'text-[var(--fios-text)]'
                      }`}>
                        {day}
                      </span>
                      {chips.length > 0 && (
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          {chips.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 overflow-hidden flex-1">
                      {chips.slice(0, 3).map((chip) => (
                        <div
                          key={chip.id}
                          className={`text-[9px] font-mono truncate px-1 py-0.5 rounded border ${
                            chip.kind === 'atu'
                              ? 'text-amber-300 bg-amber-500/10 border-amber-500/25'
                              : chip.finished
                              ? 'text-[var(--fios-text-muted)] bg-[var(--fios-surface)]/60 border-transparent line-through opacity-70'
                              : 'text-[var(--fios-text-muted)] bg-[var(--fios-surface)]/80 border-transparent'
                          }`}
                          title={chip.label}
                        >
                          {chip.kind === 'atu' ? 'ATU · ' : ''}{chip.label}
                        </div>
                      ))}
                      {chips.length > 3 && (
                        <div className="text-[9px] font-mono text-[var(--fios-text-muted)] italic">
                          +{chips.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return calendarCells;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export const ScheduleTab = React.memo(ScheduleTabInner);
export default ScheduleTab;
