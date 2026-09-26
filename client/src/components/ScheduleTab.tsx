import React, { useState, useEffect, useMemo, startTransition, useDeferredValue } from 'react';
import {
  Calendar as CalendarIcon, MapPin, Link2, RefreshCw,
  Upload, ChevronLeft, ChevronRight, Check, Play, Coffee,
} from 'lucide-react';
import { 
  saveCalendarUrl, getSavedCalendarUrl, fetchAndParseCalendar, 
  parseIcsText, CalendarEvent 
} from '../lib/calendarService';
import {
  loadUnifiedScheduleEvents,
  loadScheduleMeta,
  saveScheduleMeta,
  type ScheduleMode,
} from '../lib/scheduleService';
import { getUserModules, type DBModule } from '../lib/moduleService';
import { MOD_BADGE_CLASS, MOD_PILL_CLASS, resolveSubjectColorKey } from '../lib/moduleColors';
import {
  classStateCardClass,
  classVisualState,
  findNextUpcomingIndex,
  isSameLocalDay,
} from '../lib/scheduleTime';

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
  /* ==========================================================================
     1. STATE MANAGEMENT
     ========================================================================== */
  const [icalUrl, setIcalUrl] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modules, setModules] = useState<DBModule[]>([]);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('ical');
  const [institutionName, setInstitutionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Controls
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Real-time clock for status calculations
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  /* ==========================================================================
     2. INITIAL LOAD HANDLER
     ========================================================================== */
  useEffect(() => {
    async function bootstrap() {
      try {
        const meta = loadScheduleMeta();
        setScheduleMode(meta.mode);
        setInstitutionName(meta.institutionName);
        const mods = await getUserModules();
        setModules(mods);
        const savedUrl = await getSavedCalendarUrl();
        if (savedUrl) setIcalUrl(savedUrl);
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        const end = new Date();
        end.setMonth(end.getMonth() + 3);
        setLoading(true);
        const { events: unified, mode, institutionName: inst } = await loadUnifiedScheduleEvents(start, end);
        setEvents(unified);
        setScheduleMode(mode);
        setInstitutionName(inst);
      } catch (err: any) {
        console.error('Failed to load schedule:', err);
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, []);

  /* ==========================================================================
     3. EVENT PARSING & SYNC HANDLERS
     ========================================================================== */
  const loadEvents = async (urlToFetch: string) => {
    if (!urlToFetch.trim()) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const parsedEvents = await fetchAndParseCalendar(urlToFetch);
      setEvents(parsedEvents);
      setStatusMessage({ 
        type: 'success', 
        text: `Last successful sync: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
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
      // Immediately load and parse the calendar feed
      await loadEvents(icalUrl.trim());
      
      // Save the URL to Supabase in the background without blocking the UI
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
      const parsedEvents = parseIcsText(rawText);
      setEvents(parsedEvents);
      setStatusMessage({ type: 'success', text: `Loaded ${parsedEvents.length} events directly from file!` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to parse .ics file.' });
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================================
     4. DATE & TIMELINE COMPUTATIONS
     ========================================================================== */
  const deferredEvents = useDeferredValue(events);
  const eventsForViews = deferredEvents;

  const buildDayTimeline = (targetDate: Date, source: CalendarEvent[] = eventsForViews): TimetableItem[] => {
    const dayClasses = source
      .filter(e => isSameLocalDay(e.startDate, targetDate))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

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
              id: `break-${targetDate.toDateString()}-${i}`,
              startDate: current.endDate,
              endDate: next.startDate,
              durationMinutes: gapMinutes,
            },
          });
        }
      }
    }

    return items;
  };

  const singleDayTimeline = useMemo(
    () => buildDayTimeline(selectedDate, deferredEvents),
    [deferredEvents, selectedDate]
  );

  const nextUpIndex = useMemo(() => {
    if (!isSameLocalDay(selectedDate, now)) return -1;
    const dayEvents = singleDayTimeline
      .filter((item) => item.type === 'event')
      .map((item) => item.data as CalendarEvent);
    const idxInDay = findNextUpcomingIndex(dayEvents, now);
    if (idxInDay < 0) return -1;
    const targetId = dayEvents[idxInDay]?.id;
    return singleDayTimeline.findIndex(
      (item) => item.type === 'event' && (item.data as CalendarEvent).id === targetId
    );
  }, [singleDayTimeline, selectedDate, now]);

  const subjectColor = (title: string) => resolveSubjectColorKey(title, modules);

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
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-slate-100">
      
      {/* Header Banner */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-black uppercase tracking-widest">
          <CalendarIcon className="w-3.5 h-3.5" />
          {scheduleMode === 'manual' ? 'MANUAL SCHEDULE' : 'TIMETABLE CONNECTED'}
        </div>
        <h1 className="text-3xl font-black italic uppercase text-white tracking-tight">College Timetable</h1>
        {institutionName && (
          <p className="text-xs font-mono text-slate-400">{institutionName}</p>
        )}
      </header>

      {/* Sync Control Card */}
      <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['ical', 'manual'] as ScheduleMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setScheduleMode(mode);
                saveScheduleMeta({ mode, institutionName });
                void (async () => {
                  const start = new Date();
                  start.setMonth(start.getMonth() - 1);
                  const end = new Date();
                  end.setMonth(end.getMonth() + 3);
                  setLoading(true);
                  try {
                    const { events: unified } = await loadUnifiedScheduleEvents(start, end);
                    setEvents(unified);
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase border cursor-pointer ${
                scheduleMode === mode ? 'accent-bg text-slate-950 border-transparent' : 'border-slate-800 text-slate-400'
              }`}
            >
              {mode === 'ical' ? 'iCal sync' : 'Manual'}
            </button>
          ))}
          <input
            type="text"
            value={institutionName}
            onChange={(e) => {
              const v = e.target.value;
              setInstitutionName(v);
              saveScheduleMeta({ mode: scheduleMode, institutionName: v });
            }}
            placeholder="Institution (optional)"
            className="w-full sm:flex-1 sm:min-w-[10rem] bg-[#07090e] border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:accent-border"
          />
        </div>
        <form onSubmit={handleSaveAndFetch} className={`flex flex-col sm:flex-row items-center gap-3 ${scheduleMode === 'manual' ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="relative flex-1 w-full">
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="url"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="https://timetables.atu.ie/Ical/StudentSet?studentSetID=..."
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !icalUrl.trim()}
            className="w-full sm:w-auto px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Sync'}
          </button>
          
          <label className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shrink-0">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            Import .ics
            <input type="file" accept=".ics" onChange={handleFileUpload} className="hidden" />
          </label>
        </form>

        {statusMessage && (
          <p className={`text-[11px] font-mono ${statusMessage.type === 'success' ? 'text-slate-400' : 'text-rose-400'}`}>
            {statusMessage.text}
          </p>
        )}
      </div>

      {/* Date Header & View Selector */}
      <div className="flex flex-col items-center justify-center space-y-4 py-2">
        <h2 className="text-2xl font-black italic uppercase text-white tracking-wide">
          {viewMode === 'day' && selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {viewMode === 'week' && `Week of ${weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          {viewMode === 'month' && selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </h2>

        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          
          {/* Day Arrows & Today */}
          <div className="flex items-center bg-[#07090e] border border-slate-800 rounded-lg p-1 gap-1">
            <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-md transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={resetToToday} className="px-3 py-1 text-xs font-mono font-bold uppercase text-slate-200 hover:bg-slate-800 rounded-md transition-colors">
              Today
            </button>
            <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-md transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative flex items-center bg-[#07090e] border border-slate-800 rounded-lg px-3 py-1.5 hover:border-slate-700 transition-colors">
            <CalendarIcon className="w-3.5 h-3.5 text-cyan-400 mr-2 shrink-0 pointer-events-none" />
            <input
              type="date"
              value={formattedInputDate}
              onChange={handleDateChange}
              className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none cursor-pointer scheme-dark"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#07090e] border border-slate-800 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => startTransition(() => setViewMode(mode))}
                className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-all ${
                  viewMode === mode
                    ? 'bg-emerald-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timetable Events Container */}
      {events.length === 0 && !loading ? (
        <div className="bg-[#0e131f]/50 border border-slate-800 rounded-xl p-12 text-center space-y-2">
          <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase">No Timetable Synced</p>
        </div>
      ) : viewMode === 'day' ? (
        <div className="space-y-3">
          {singleDayTimeline.length === 0 ? (
            <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-10 text-center text-slate-400 text-xs font-mono font-bold uppercase">
              No classes scheduled for this day.
            </div>
          ) : (
            singleDayTimeline.map((item, index) => {
              if (item.type === 'break') {
                const breakData = item.data as BreakData;
                return (
                  <div key={breakData.id} className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/80"></div></div>
                    <span className="relative bg-[#07090e] px-4 py-1 border border-slate-800 rounded-full text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-400" />
                      {formatBreakDuration(breakData.durationMinutes)}
                    </span>
                  </div>
                );
              }

              const event = item.data as CalendarEvent;
              const isNextUp = index === nextUpIndex;
              const state = classVisualState(event.startDate, event.endDate, {
                day: selectedDate,
                now,
                isNext: isNextUp,
              });
              const colorKey = subjectColor(event.title);
              const muted = state === 'finished' || state === 'past-day';

              return (
                <div
                  key={event.id}
                  data-mod-color={colorKey}
                  className={`bg-[#0e131f] border rounded-xl p-5 flex flex-col sm:flex-row items-start gap-6 transition-all ${classStateCardClass(state)} ${
                    state === 'next' ? 'ring-1 ring-[color-mix(in_srgb,var(--mod-solid)_45%,transparent)] scale-[1.01]' : ''
                  }`}
                >
                  <div className={`w-32 shrink-0 font-mono text-sm font-black pt-0.5 ${muted ? 'text-slate-500' : 'text-slate-100'}`}>
                    {formatTimeRange(event.startDate, event.endDate)}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base font-black tracking-wide ${muted ? 'text-slate-500 line-through decoration-slate-600' : 'text-white'}`}>
                        {event.title}
                      </h3>
                      <span data-mod-color={colorKey} className={MOD_PILL_CLASS}>
                        {event.title.split(/[\s·|—-]/)[0]?.slice(0, 12) || 'Class'}
                      </span>

                      {state === 'ongoing' && (
                        <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-emerald-400/50 animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          IN PROGRESS
                        </span>
                      )}

                      {state === 'next' && (
                        <span data-mod-color={colorKey} className={`${MOD_BADGE_CLASS} !text-[10px] flex items-center gap-1`}>
                          <Play className="w-2.5 h-2.5 fill-current" />
                          NEXT UP
                        </span>
                      )}

                      {muted && (
                        <span className="bg-slate-800 text-slate-400 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          FINISHED
                        </span>
                      )}
                    </div>

                    {event.location && (
                      <p className={`text-xs font-mono flex items-center gap-1.5 font-bold ${muted ? 'text-slate-600' : 'mod-text'}`} data-mod-color={colorKey}>
                        <MapPin className="w-3.5 h-3.5" /> {event.location}
                      </p>
                    )}

                    {event.description && (
                      <p className={`text-xs font-mono leading-relaxed pt-1 whitespace-pre-line ${muted ? 'text-slate-600' : 'text-slate-400'}`}>
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : viewMode === 'week' ? (
        <div className="space-y-8">
          {weekDays.map((day) => {
            const timeline = buildDayTimeline(day);
            const isToday = isSameLocalDay(day, now);

            return (
              <div key={day.toDateString()} className="space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className={`text-sm font-black italic uppercase tracking-wider ${isToday ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {day.toLocaleDateString('en-GB', { weekday: 'long' })}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {timeline.length === 0 ? (
                  <p className="text-xs font-mono text-slate-600 py-2">No classes</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((item) => {
                      if (item.type === 'break') {
                        const breakData = item.data as BreakData;
                        return (
                          <div key={breakData.id} className="relative flex items-center justify-center my-3">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/80"></div></div>
                            <span className="relative bg-[#07090e] px-3 text-[11px] font-mono text-slate-500 font-bold">
                              {formatBreakDuration(breakData.durationMinutes)}
                            </span>
                          </div>
                        );
                      }

                      const event = item.data as CalendarEvent;
                      const dayEvents = timeline
                        .filter((t) => t.type === 'event')
                        .map((t) => t.data as CalendarEvent);
                      const nextIdx = isToday ? findNextUpcomingIndex(dayEvents, now) : -1;
                      const isNext = nextIdx >= 0 && dayEvents[nextIdx]?.id === event.id;
                      const state = classVisualState(event.startDate, event.endDate, {
                        day,
                        now,
                        isNext,
                      });
                      const colorKey = subjectColor(event.title);
                      const muted = state === 'finished' || state === 'past-day';

                      return (
                        <div
                          key={event.id}
                          data-mod-color={colorKey}
                          className={`bg-[#0e131f] border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 ${classStateCardClass(state)}`}
                        >
                          <div className={`w-32 shrink-0 font-mono text-xs font-bold pt-0.5 ${muted ? 'text-slate-500' : 'text-white'}`}>
                            {formatTimeRange(event.startDate, event.endDate)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-sm font-bold ${muted ? 'text-slate-500 line-through' : 'text-white'}`}>{event.title}</h4>
                              <span data-mod-color={colorKey} className={MOD_PILL_CLASS}>
                                {event.title.split(/[\s·|—-]/)[0]?.slice(0, 10) || 'Class'}
                              </span>
                              {state === 'next' && (
                                <span data-mod-color={colorKey} className={MOD_BADGE_CLASS}>NEXT</span>
                              )}
                              {muted && (
                                <span className="text-[9px] font-mono uppercase text-slate-500">Done</span>
                              )}
                            </div>
                            {event.location && (
                              <p className={`text-xs font-mono flex items-center gap-1 font-bold ${muted ? 'text-slate-600' : 'mod-text'}`} data-mod-color={colorKey}>
                                <MapPin className="w-3 h-3" /> {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className={`text-xs font-mono line-clamp-2 ${muted ? 'text-slate-600' : 'text-slate-400'}`}>{event.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center font-mono text-[11px] font-black uppercase text-slate-500 pb-2 border-b border-slate-800">
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
                calendarCells.push(<div key={`pad-${i}`} className="h-24 bg-[#07090e]/30 border border-slate-900 rounded-lg opacity-20" />);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const currentDate = new Date(year, month, day);
                const dayEvents = eventsForViews.filter(e => isSameLocalDay(e.startDate, currentDate));
                const isTodayCell = isSameLocalDay(currentDate, now);
                const isSelectedCell = isSameLocalDay(currentDate, selectedDate);

                calendarCells.push(
                  <div
                    key={`day-${day}`}
                    onClick={() => {
                      setSelectedDate(currentDate);
                      setViewMode('day');
                    }}
                    className={`h-24 bg-[#07090e] border rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all hover:border-emerald-400/50 ${
                      isSelectedCell ? 'border-emerald-400 ring-1 ring-emerald-400/50' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${isTodayCell ? 'bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded-full' : 'text-slate-300'}`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, idx) => {
                        const ck = subjectColor(ev.title);
                        const st = classVisualState(ev.startDate, ev.endDate, { day: currentDate, now });
                        const muted = st === 'finished' || st === 'past-day';
                        return (
                          <div
                            key={idx}
                            data-mod-color={ck}
                            className={`${MOD_PILL_CLASS} w-full ${muted ? 'opacity-45 line-through' : ''}`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] font-mono text-slate-500 italic">
                          +{dayEvents.length - 2} more
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