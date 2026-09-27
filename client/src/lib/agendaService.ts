/**
 * Unified agenda — chronologically merge classes + timed tasks for Overview/Schedule.
 * Classes sort by start; tasks sort/appear by due date. Compact views group by calendar day.
 */
import type { CalendarEvent } from './calendarService';
import type { Task } from '../types/db';
import { classVisualState, type ClassVisualState } from './scheduleTime';
import { resolveSubjectColorKey } from './moduleColors';

export type AgendaKind = 'class' | 'task';

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  title: string;
  start: Date;
  end: Date;
  /**
   * Calendar / sort anchor — class start, or task due (end).
   * Used for day filtering, chronological order, and date headers.
   */
  anchor: Date;
  location?: string;
  completed?: boolean;
  moduleCode?: string | null;
  colorKey: string;
  state: ClassVisualState;
  /** Original task or event id */
  sourceId: string;
}

export interface AgendaDayGroup {
  /** Local YYYY-MM-DD key */
  key: string;
  date: Date;
  label: string;
  items: AgendaItem[];
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function localDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Parse task due/start into Dates. Supports ISO `due_at`/`start_at` and legacy `due_date` labels. */
export function resolveTaskWindow(task: Task, now: Date = new Date()): { start: Date; end: Date } | null {
  if (task.due_at) {
    const end = new Date(task.due_at);
    if (Number.isNaN(end.getTime())) return null;
    const start = task.start_at ? new Date(task.start_at) : new Date(end.getTime() - 30 * 60 * 1000);
    if (Number.isNaN(start.getTime())) return { start: end, end };
    return { start, end };
  }

  // Legacy free-text due_date → best-effort local day at 09:00–09:30
  const label = (task.due_date || '').trim().toLowerCase();
  if (!label) return null;

  const day = new Date(now);
  day.setHours(9, 0, 0, 0);

  if (label === 'today') {
    /* keep today 09:00 */
  } else if (label === 'tomorrow') {
    day.setDate(day.getDate() + 1);
  } else if (/^\d{4}-\d{2}-\d{2}/.test(label)) {
    const d = new Date(label);
    if (Number.isNaN(d.getTime())) return null;
    return {
      start: d,
      end: new Date(d.getTime() + 30 * 60 * 1000),
    };
  } else if (label.includes('friday')) {
    const target = 5;
    const delta = (target - day.getDay() + 7) % 7 || 7;
    day.setDate(day.getDate() + delta);
  } else {
    // Unknown label — skip from timed agenda (still shows in task list)
    return null;
  }

  const end = new Date(day.getTime() + 30 * 60 * 1000);
  return { start: day, end };
}

export function buildUnifiedAgenda(opts: {
  classes: CalendarEvent[];
  tasks: Task[];
  now?: Date;
  modules?: { code: string; color: string; name?: string }[];
  /** Max items after sort (compact widgets). */
  limit?: number;
  /** Only include items whose calendar anchor is on this local day. */
  day?: Date;
  /** Exclude completed tasks. */
  hideCompletedTasks?: boolean;
}): AgendaItem[] {
  const now = opts.now ?? new Date();
  const items: AgendaItem[] = [];

  for (const ev of opts.classes) {
    if (opts.day && !sameLocalDay(ev.startDate, opts.day)) continue;
    const colorKey = resolveSubjectColorKey(ev.title, opts.modules);
    items.push({
      id: `class-${ev.id}`,
      kind: 'class',
      title: ev.title,
      start: ev.startDate,
      end: ev.endDate,
      anchor: ev.startDate,
      location: ev.location,
      colorKey,
      state: classVisualState(ev.startDate, ev.endDate, { day: opts.day ?? ev.startDate, now }),
      sourceId: ev.id,
    });
  }

  for (const task of opts.tasks) {
    if (opts.hideCompletedTasks && task.completed) continue;
    const win = resolveTaskWindow(task, now);
    if (!win) continue;
    // Tasks appear on their due date (not start date)
    if (opts.day && !sameLocalDay(win.end, opts.day)) continue;
    const colorKey = resolveSubjectColorKey(task.module_code || task.title, opts.modules);
    const mod = opts.modules?.find((m) => m.code === task.module_code);
    items.push({
      id: `task-${task.id}`,
      kind: 'task',
      title: task.title,
      start: win.start,
      end: win.end,
      anchor: win.end,
      completed: task.completed,
      moduleCode: (mod?.name || '').trim() || task.module_code,
      colorKey,
      state: classVisualState(win.start, win.end, {
        day: opts.day ?? win.end,
        now,
        isNext: false,
      }),
      sourceId: task.id,
    });
  }

  // Chronological by calendar anchor (class start / task due)
  items.sort((a, b) => a.anchor.getTime() - b.anchor.getTime());

  // Mark immediate next upcoming (not finished) relative to now
  const upcomingIdx = items.findIndex(
    (it) => it.anchor.getTime() > now.getTime() && it.state !== 'finished' && it.state !== 'past-day'
  );
  if (upcomingIdx >= 0) {
    const it = items[upcomingIdx];
    if (it.state === 'upcoming') {
      items[upcomingIdx] = { ...it, state: 'next' };
    }
  }

  if (opts.limit != null) return items.slice(0, opts.limit);
  return items;
}

/** Group agenda items under calendar day headers (Today / Tomorrow / weekday date). */
export function groupAgendaByDay(items: AgendaItem[], now: Date = new Date()): AgendaDayGroup[] {
  const today = startOfLocalDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const map = new Map<string, AgendaDayGroup>();

  for (const item of items) {
    const key = localDayKey(item.anchor);
    let group = map.get(key);
    if (!group) {
      const day = startOfLocalDay(item.anchor);
      let label: string;
      if (sameLocalDay(day, today)) {
        label = `Today · ${day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
      } else if (sameLocalDay(day, tomorrow)) {
        label = `Tomorrow · ${day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
      } else {
        label = day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      group = { key, date: day, label, items: [] };
      map.set(key, group);
    }
    group.items.push(item);
  }

  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function formatAgendaWhen(item: AgendaItem): string {
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (item.kind === 'task') {
    return `Due · ${fmt(item.end)}`;
  }
  return `${fmt(item.start)}–${fmt(item.end)}`;
}

/** @deprecated Prefer formatAgendaWhen(item) — kept for any external callers. */
export function formatAgendaWhenRange(start: Date, end: Date): string {
  const day = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${fmt(start)}–${fmt(end)}`;
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse `datetime-local` values as *local* wall time.
 * `new Date("YYYY-MM-DDTHH:mm")` is treated as UTC in some mobile browsers
 * (Safari / Chrome Android), which shifts tasks by the timezone offset.
 */
export function fromDatetimeLocalValue(raw: string): Date | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim());
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const h = Number(m[4]);
    const mi = Number(m[5]);
    const s = m[6] ? Number(m[6]) : 0;
    const local = new Date(y, mo, d, h, mi, s, 0);
    return Number.isNaN(local.getTime()) ? null : local;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
