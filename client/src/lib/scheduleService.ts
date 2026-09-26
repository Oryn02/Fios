import type { CalendarEvent } from './calendarService';
import { fetchAndParseCalendar, getSavedCalendarUrl } from './calendarService';

export type ScheduleMode = 'ical' | 'manual';

export type ManualRecurrence = 'none' | 'weekly';

export interface ManualScheduleEvent {
  id: string;
  title: string;
  location?: string;
  description?: string;
  /** HH:mm local */
  startTime: string;
  /** HH:mm local */
  endTime: string;
  /** 0=Sun … 6=Sat when recurrence is weekly; ignored for one-off */
  daysOfWeek: number[];
  recurrence: ManualRecurrence;
  /** YYYY-MM-DD for one-off events */
  date?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

const LS_EVENTS = 'fios_manual_schedule';
const LS_META = 'fios_schedule_meta';

export interface ScheduleMeta {
  mode: ScheduleMode;
  institutionName: string;
}

const DEFAULT_META: ScheduleMeta = {
  mode: 'ical',
  institutionName: '',
};

function uid(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadScheduleMeta(): ScheduleMeta {
  try {
    const raw = localStorage.getItem(LS_META);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === 'manual' ? 'manual' : 'ical',
      institutionName: typeof parsed.institutionName === 'string' ? parsed.institutionName : '',
    };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function saveScheduleMeta(meta: ScheduleMeta): void {
  localStorage.setItem(LS_META, JSON.stringify(meta));
}

export function loadManualEvents(): ManualScheduleEvent[] {
  try {
    const raw = localStorage.getItem(LS_EVENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveManualEvents(events: ManualScheduleEvent[]): void {
  localStorage.setItem(LS_EVENTS, JSON.stringify(events));
}

export function createManualEvent(
  input: Omit<ManualScheduleEvent, 'id' | 'createdAt' | 'updatedAt'>
): ManualScheduleEvent {
  const now = new Date().toISOString();
  const event: ManualScheduleEvent = {
    ...input,
    id: uid(),
    title: input.title.trim() || 'Untitled class',
    createdAt: now,
    updatedAt: now,
  };
  const all = loadManualEvents();
  all.push(event);
  saveManualEvents(all);
  return event;
}

export function updateManualEvent(
  id: string,
  patch: Partial<Omit<ManualScheduleEvent, 'id' | 'createdAt'>>
): ManualScheduleEvent | null {
  const all = loadManualEvents();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const next = {
    ...all[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = next;
  saveManualEvents(all);
  return next;
}

export function deleteManualEvent(id: string): void {
  saveManualEvents(loadManualEvents().filter((e) => e.id !== id));
}

function parseHm(hm: string, on: Date): Date {
  const [h, m] = (hm || '09:00').split(':').map((n) => Number(n) || 0);
  const d = new Date(on);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Expand manual templates into concrete CalendarEvent instances in [rangeStart, rangeEnd]. */
export function expandManualEvents(
  manuals: ManualScheduleEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const startDay = new Date(rangeStart);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(rangeEnd);
  endDay.setHours(23, 59, 59, 999);

  for (const ev of manuals) {
    if (ev.recurrence === 'none' && ev.date) {
      const [y, mo, da] = ev.date.split('-').map(Number);
      const day = new Date(y, (mo || 1) - 1, da || 1);
      if (day >= startDay && day <= endDay) {
        out.push({
          id: `${ev.id}-${ev.date}`,
          title: ev.title,
          location: ev.location,
          description: ev.description,
          startDate: parseHm(ev.startTime, day),
          endDate: parseHm(ev.endTime, day),
        });
      }
      continue;
    }

    if (ev.recurrence === 'weekly' && ev.daysOfWeek?.length) {
      const cursor = new Date(startDay);
      while (cursor <= endDay) {
        if (ev.daysOfWeek.includes(cursor.getDay())) {
          const day = new Date(cursor);
          out.push({
            id: `${ev.id}-${day.toISOString().slice(0, 10)}`,
            title: ev.title,
            location: ev.location,
            description: ev.description,
            startDate: parseHm(ev.startTime, day),
            endDate: parseHm(ev.endTime, day),
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  return out.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Unified schedule loader for Overview / Schedule / widgets.
 * Manual mode never requires iCal; iCal mode still works when a feed URL exists.
 */
export async function loadUnifiedScheduleEvents(
  rangeStart: Date,
  rangeEnd: Date
): Promise<{ events: CalendarEvent[]; mode: ScheduleMode; institutionName: string }> {
  const meta = loadScheduleMeta();
  if (meta.mode === 'manual') {
    return {
      events: expandManualEvents(loadManualEvents(), rangeStart, rangeEnd),
      mode: 'manual',
      institutionName: meta.institutionName,
    };
  }

  try {
    const url = await getSavedCalendarUrl();
    if (url) {
      const events = await fetchAndParseCalendar(url);
      return { events, mode: 'ical', institutionName: meta.institutionName };
    }
  } catch (err) {
    console.error('iCal schedule load failed:', err);
  }

  // Fallback: still surface any manual events so the UI isn’t empty after a feed failure
  return {
    events: expandManualEvents(loadManualEvents(), rangeStart, rangeEnd),
    mode: 'ical',
    institutionName: meta.institutionName,
  };
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
