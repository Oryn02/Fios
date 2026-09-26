/**
 * Unified agenda — chronologically merge classes + timed tasks for Overview/Schedule.
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
  location?: string;
  completed?: boolean;
  moduleCode?: string | null;
  colorKey: string;
  state: ClassVisualState;
  /** Original task or event id */
  sourceId: string;
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
  modules?: { code: string; color: string }[];
  /** Max items after sort (compact widgets). */
  limit?: number;
  /** Only include items whose start is on this local day. */
  day?: Date;
  /** Exclude completed tasks. */
  hideCompletedTasks?: boolean;
}): AgendaItem[] {
  const now = opts.now ?? new Date();
  const items: AgendaItem[] = [];

  for (const ev of opts.classes) {
    if (opts.day) {
      if (
        ev.startDate.getFullYear() !== opts.day.getFullYear() ||
        ev.startDate.getMonth() !== opts.day.getMonth() ||
        ev.startDate.getDate() !== opts.day.getDate()
      ) {
        continue;
      }
    }
    const colorKey = resolveSubjectColorKey(ev.title, opts.modules);
    items.push({
      id: `class-${ev.id}`,
      kind: 'class',
      title: ev.title,
      start: ev.startDate,
      end: ev.endDate,
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
    if (opts.day) {
      if (
        win.start.getFullYear() !== opts.day.getFullYear() ||
        win.start.getMonth() !== opts.day.getMonth() ||
        win.start.getDate() !== opts.day.getDate()
      ) {
        continue;
      }
    }
    const colorKey = resolveSubjectColorKey(task.module_code || task.title, opts.modules);
    items.push({
      id: `task-${task.id}`,
      kind: 'task',
      title: task.title,
      start: win.start,
      end: win.end,
      completed: task.completed,
      moduleCode: task.module_code,
      colorKey,
      state: classVisualState(win.start, win.end, {
        day: opts.day ?? win.start,
        now,
        isNext: false,
      }),
      sourceId: task.id,
    });
  }

  items.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Mark immediate next upcoming (not finished) on the same day as now
  const upcomingIdx = items.findIndex(
    (it) => it.start.getTime() > now.getTime() && it.state !== 'finished' && it.state !== 'past-day'
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

export function formatAgendaWhen(start: Date, end: Date): string {
  const day = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${fmt(start)}–${fmt(end)}`;
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
