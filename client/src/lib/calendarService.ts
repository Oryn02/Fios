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

function toJsDate(time: {
  isDate?: boolean;
  zone?: { tzid?: string };
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  toJSDate: () => Date;
}): Date {
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
  if (!icsData || !/BEGIN:VCALENDAR/i.test(icsData)) {
    throw new Error('Not a valid iCalendar file (missing BEGIN:VCALENDAR).');
  }

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

/** Next upcoming class from `now` (still ongoing or not yet started). */
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
  const viewingPastDay = localDateKey(viewingDay) < localDateKey(now);
  if (viewingPastDay) return true;
  if (localDateKey(viewingDay) > localDateKey(now)) return false;
  return now.getTime() > event.endDate.getTime();
}

export function isClassOngoing(event: CalendarEvent, now: Date, viewingDay: Date): boolean {
  if (localDateKey(viewingDay) !== localDateKey(now)) return false;
  return now.getTime() >= event.startDate.getTime() && now.getTime() <= event.endDate.getTime();
}

/** Client-side URL sanity check before calling the proxy. */
export function validateClientIcalUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = String(raw || '').trim().replace(/^webcal:\/\//i, 'https://');
  if (!trimmed) return { ok: false, error: 'Paste your ATU iCal URL first.' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URL. Expected https://timetables.atu.ie/Ical/StudentSet?studentSetID=…' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Use an https:// or webcal:// timetable link.' };
  }
  if (parsed.hostname.toLowerCase().endsWith('atu.ie')) {
    if (!/Ical\/StudentSet/i.test(parsed.pathname)) {
      return {
        ok: false,
        error: 'ATU link should look like /Ical/StudentSet?studentSetID=…. Open Timetables → Subscribe / iCal.',
      };
    }
    if (!parsed.searchParams.get('studentSetID')) {
      return { ok: false, error: 'Missing studentSetID in the ATU URL.' };
    }
  }
  return { ok: true, url: parsed.toString() };
}

/**
 * Fetch ATU/iCal feed via Express `/api/ical-proxy` (never call ATU from the browser —
 * that hits CORS and shows a bare "Failed to fetch").
 */
export async function fetchAndParseCalendar(icalUrl: string): Promise<CalendarEvent[]> {
  const checked = validateClientIcalUrl(icalUrl);
  if (!checked.ok) throw new Error(checked.error);

  let response: Response;
  try {
    // Prefer POST so long StudentSet URLs never hit query-string limits;
    // GET kept as fallback for older proxies.
    response = await fetch('/api/ical-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/calendar, text/plain, application/json' },
      body: JSON.stringify({ url: checked.url }),
    });
  } catch {
    // Retry GET once (some gateways only expose GET)
    try {
      response = await fetch(`/api/ical-proxy?url=${encodeURIComponent(checked.url)}`, {
        method: 'GET',
        headers: { Accept: 'text/calendar, text/plain, application/json' },
      });
    } catch {
      throw new Error(
        'Could not reach the timetable proxy (network error). ' +
          'Locally: run the Express server on port 5000. ' +
          'On Vercel: ensure /api/ical-proxy is deployed (api/index.ts bridge).'
      );
    }
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const bodyText = await response.text();
  const looksJson = bodyText.trim().startsWith('{');
  const looksHtml = /<!doctype html|<html/i.test(bodyText);

  if (!response.ok) {
    if (looksJson) {
      try {
        const err = JSON.parse(bodyText) as { error?: string };
        throw new Error(err.error || `Timetable proxy error (${response.status}).`);
      } catch (e: any) {
        if (e?.message && !e.message.includes('JSON')) throw e;
      }
    }
    if (response.status === 404 || looksHtml) {
      throw new Error(
        'Timetable proxy not found (404). The /api/ical-proxy route is unreachable — deploy the Express bridge or run `npm run dev` in server/.'
      );
    }
    throw new Error(`Timetable sync failed (HTTP ${response.status}).`);
  }

  if (looksHtml || (looksJson && !/BEGIN:VCALENDAR/i.test(bodyText))) {
    throw new Error(
      'Proxy returned a non-calendar response. Check that /api/ical-proxy is wired to Express, not the SPA.'
    );
  }

  if (!contentType.includes('calendar') && !contentType.includes('text') && !/BEGIN:VCALENDAR/i.test(bodyText)) {
    throw new Error('Unexpected content type from timetable proxy.');
  }

  try {
    const now = new Date();
    const rangeStart = new Date(now.getFullYear() - 1, 0, 1);
    const rangeEnd = new Date(now.getFullYear() + 2, 11, 31);
    const events = parseIcsText(bodyText, rangeStart, rangeEnd);
    if (events.length === 0) {
      throw new Error('Calendar parsed but contained no events in the visible date range.');
    }
    return events;
  } catch (err: any) {
    if (err?.message?.includes('BEGIN:VCALENDAR') || err?.message?.includes('no events')) throw err;
    throw new Error(`Could not parse iCalendar data: ${err?.message || 'unknown parse error'}`);
  }
}
