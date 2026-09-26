import ICAL from 'ical.js';
import { supabase } from './supabase';
import { localDateKey } from './atuAcademicCalendar';

export type CalendarEventSource = 'ical' | 'atu-academic' | 'user';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  /** Origin of the event for monthly overlays / badges */
  source?: CalendarEventSource;
  /** Category badge for ATU academic items */
  category?: string;
}

export async function saveCalendarUrl(url: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Authentication required.');

  const { error } = await supabase.auth.updateUser({
    data: { ical_url: url.trim() },
  });

  if (error) throw new Error(error.message);
}

export async function getSavedCalendarUrl(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.ical_url || null;
}

function toJsDate(time: { isDate?: boolean; zone?: { tzid?: string }; year: number; month: number; day: number; hour: number; minute: number; second: number; toJSDate: () => Date }): Date {
  // Prefer local components for floating / all-day to avoid UTC day-shift in monthly grid
  if (time.isDate || !time.zone || time.zone.tzid === 'floating') {
    return new Date(
      time.year,
      time.month - 1,
      time.day,
      time.isDate ? 12 : time.hour,
      time.isDate ? 0 : time.minute,
      time.isDate ? 0 : time.second
    );
  }
  return time.toJSDate();
}

/**
 * Expand VEVENTs (including RRULE series) into concrete occurrences
 * within [rangeStart, rangeEnd]. ATU timetables commonly use weekly RRULEs —
 * without expansion, monthly view only shows the seed instance.
 */
export function parseIcsText(
  icsData: string,
  rangeStart?: Date,
  rangeEnd?: Date
): CalendarEvent[] {
  const parsedData = ICAL.parse(icsData);
  const comp = new ICAL.Component(parsedData);
  const vevents = comp.getAllSubcomponents('vevent');

  const startBound = rangeStart || new Date(new Date().getFullYear() - 1, 0, 1);
  const endBound = rangeEnd || new Date(new Date().getFullYear() + 2, 11, 31);
  const rangeStartTime = ICAL.Time.fromJSDate(startBound, false);
  const rangeEndTime = ICAL.Time.fromJSDate(endBound, false);

  const events: CalendarEvent[] = [];

  vevents.forEach((vevent, index) => {
    const event = new ICAL.Event(vevent);
    const title = event.summary || 'Untitled Lecture / Event';
    const description = event.description || '';
    const location = event.location || '';
    const uid = event.uid || `event-${index}`;

    if (event.isRecurring()) {
      const iterator = event.iterator();
      let next: ReturnType<typeof iterator.next>;
      let guard = 0;
      while ((next = iterator.next()) && guard < 800) {
        guard += 1;
        if (next.compare(rangeEndTime) > 0) break;
        if (next.compare(rangeStartTime) < 0) continue;

        const details = event.getOccurrenceDetails(next);
        const startDate = toJsDate(details.startDate);
        const endDate = toJsDate(details.endDate);
        events.push({
          id: `${uid}-${localDateKey(startDate)}-${startDate.getTime()}`,
          title,
          description,
          location,
          startDate,
          endDate,
          source: 'ical',
        });
      }
    } else {
      const startDate = toJsDate(event.startDate);
      const endDate = toJsDate(event.endDate);
      // Keep out-of-range singles only if no range was requested; otherwise filter
      if (rangeStart && rangeEnd) {
        if (endDate < startBound || startDate > endBound) return;
      }
      events.push({
        id: uid,
        title,
        description,
        location,
        startDate,
        endDate,
        source: 'ical',
      });
    }
  });

  return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/** Events whose local calendar day matches `day`. */
export function eventsOnLocalDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const key = localDateKey(day);
  return events
    .filter((e) => localDateKey(e.startDate) === key)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/** Next upcoming class from `now` (must still be starting in the future, or ongoing). */
export function findNextClass(
  events: CalendarEvent[],
  now: Date = new Date()
): CalendarEvent | null {
  const upcoming = events
    .filter((e) => e.endDate.getTime() > now.getTime())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return upcoming[0] || null;
}

export function isClassFinished(event: CalendarEvent, now: Date, viewingDay: Date): boolean {
  const viewingPastDay =
    localDateKey(viewingDay) < localDateKey(now);
  if (viewingPastDay) return true;
  if (localDateKey(viewingDay) > localDateKey(now)) return false;
  return now.getTime() > event.endDate.getTime();
}

export function isClassOngoing(event: CalendarEvent, now: Date, viewingDay: Date): boolean {
  if (localDateKey(viewingDay) !== localDateKey(now)) return false;
  return now.getTime() >= event.startDate.getTime() && now.getTime() <= event.endDate.getTime();
}

/**
 * Fetch ATU/iCal feed via Express proxy (relative `/api` works on Vite + Vercel).
 */
export async function fetchAndParseCalendar(icalUrl: string): Promise<CalendarEvent[]> {
  const backendProxyUrl = `/api/ical-proxy?url=${encodeURIComponent(icalUrl)}`;

  const response = await fetch(backendProxyUrl);
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(errJson.error || 'Failed to fetch timetable feed from server proxy.');
  }

  const icsData = await response.text();
  const now = new Date();
  const rangeStart = new Date(now.getFullYear() - 1, 0, 1);
  const rangeEnd = new Date(now.getFullYear() + 2, 11, 31);
  return parseIcsText(icsData, rangeStart, rangeEnd);
}
