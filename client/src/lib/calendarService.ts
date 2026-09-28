import ICAL from 'ical.js';
import { supabase } from './supabase';
import { apiUrl } from './apiBase';
import {
  enqueueMutation,
  getSyncStatus,
  isPermanentSchemaError,
  reportPermanentSyncError,
  clearSyncError,
  shouldDeferCloudWrites,
} from './offlineQueue';

export type ScheduleMode = 'ical' | 'manual';

/** Mirrors scheduleService.ManualScheduleEvent — kept local to avoid circular imports. */
export interface ManualScheduleEventRow {
  id: string;
  title: string;
  location?: string;
  description?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  recurrence: 'none' | 'weekly';
  date?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}

/** JSON-safe event shape stored in localStorage + calendar_state.events_cache. */
export interface SerializedCalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
}

export interface CalendarStateRow {
  user_id?: string;
  ical_url: string;
  mode: ScheduleMode;
  institution_name: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  events_cache: SerializedCalendarEvent[];
  manual_events: ManualScheduleEventRow[];
  updated_at: string;
}

const LS_CALENDAR_STATE = 'fios_calendar_state';
const LS_META = 'fios_schedule_meta';
const LS_EVENTS = 'fios_manual_schedule';
const TABLE = 'calendar_state';

function nowIso(): string {
  return new Date().toISOString();
}

export function serializeEvents(events: CalendarEvent[]): SerializedCalendarEvent[] {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
  }));
}

export function deserializeEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: CalendarEvent[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const start = r.startDate ? new Date(String(r.startDate)) : null;
    const end = r.endDate ? new Date(String(r.endDate)) : null;
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) continue;
    out.push({
      id: typeof r.id === 'string' ? r.id : `evt-${out.length}`,
      title: typeof r.title === 'string' ? r.title : 'Untitled',
      description: typeof r.description === 'string' ? r.description : undefined,
      location: typeof r.location === 'string' ? r.location : undefined,
      startDate: start,
      endDate: end,
    });
  }
  return out.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function defaultState(): CalendarStateRow {
  return {
    ical_url: '',
    mode: 'ical',
    institution_name: '',
    last_synced_at: null,
    last_sync_error: null,
    events_cache: [],
    manual_events: [],
    updated_at: nowIso(),
  };
}

function readLegacyLocal(): Partial<CalendarStateRow> {
  const patch: Partial<CalendarStateRow> = {};
  try {
    const metaRaw = localStorage.getItem(LS_META);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      if (meta?.mode === 'manual' || meta?.mode === 'ical') patch.mode = meta.mode;
      if (typeof meta?.institutionName === 'string') patch.institution_name = meta.institutionName;
    }
  } catch { /* ignore */ }
  try {
    const eventsRaw = localStorage.getItem(LS_EVENTS);
    if (eventsRaw) {
      const parsed = JSON.parse(eventsRaw);
      if (Array.isArray(parsed)) patch.manual_events = parsed as ManualScheduleEventRow[];
    }
  } catch { /* ignore */ }
  return patch;
}

/** Read durable local calendar state (always available offline). */
export function loadLocalCalendarState(): CalendarStateRow {
  try {
    const raw = localStorage.getItem(LS_CALENDAR_STATE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CalendarStateRow>;
      const base = { ...defaultState(), ...parsed };
      base.events_cache = Array.isArray(parsed.events_cache)
        ? (parsed.events_cache as SerializedCalendarEvent[])
        : [];
      base.manual_events = Array.isArray(parsed.manual_events)
        ? (parsed.manual_events as ManualScheduleEventRow[])
        : [];
      base.mode = parsed.mode === 'manual' ? 'manual' : 'ical';
      base.ical_url = typeof parsed.ical_url === 'string' ? parsed.ical_url : '';
      base.institution_name = typeof parsed.institution_name === 'string' ? parsed.institution_name : '';
      return base;
    }
  } catch { /* fall through */ }

  // Migrate legacy schedule keys into the unified blob once.
  const legacy = readLegacyLocal();
  return { ...defaultState(), ...legacy, updated_at: nowIso() };
}

function mirrorLegacyKeys(state: CalendarStateRow): void {
  try {
    localStorage.setItem(
      LS_META,
      JSON.stringify({ mode: state.mode, institutionName: state.institution_name })
    );
    localStorage.setItem(LS_EVENTS, JSON.stringify(state.manual_events || []));
  } catch { /* ignore quota */ }
}

/** Persist locally first (offline-first). */
export function saveLocalCalendarState(patch: Partial<CalendarStateRow>): CalendarStateRow {
  const prev = loadLocalCalendarState();
  const next: CalendarStateRow = {
    ...prev,
    ...patch,
    updated_at: patch.updated_at || nowIso(),
  };
  if (patch.mode) next.mode = patch.mode === 'manual' ? 'manual' : 'ical';
  if (patch.events_cache) next.events_cache = patch.events_cache;
  if (patch.manual_events) next.manual_events = patch.manual_events;
  try {
    localStorage.setItem(LS_CALENDAR_STATE, JSON.stringify(next));
    mirrorLegacyKeys(next);
  } catch (err) {
    console.warn('[calendar] local persist failed', err);
  }
  return next;
}

function rowToPayload(userId: string, state: CalendarStateRow): Record<string, unknown> {
  return {
    user_id: userId,
    ical_url: state.ical_url || '',
    mode: state.mode === 'manual' ? 'manual' : 'ical',
    institution_name: state.institution_name || '',
    last_synced_at: state.last_synced_at,
    last_sync_error: state.last_sync_error,
    events_cache: state.events_cache || [],
    manual_events: state.manual_events || [],
    updated_at: state.updated_at || nowIso(),
  };
}

async function pushStateToCloud(state: CalendarStateRow): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Authentication required.');

  const payload = rowToPayload(user.id, state);

  // Keep auth metadata in sync when online (legacy readers).
  try {
    await supabase.auth.updateUser({ data: { ical_url: state.ical_url || '' } });
  } catch (err) {
    console.warn('[calendar] auth metadata update failed', err);
  }

  // Brief pause after a confirmed missing-table error — then re-probe so sync
  // recovers once SQL is applied / PostgREST reloads (no permanent dead sync).
  if (shouldDeferCloudWrites(TABLE)) {
    return;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueMutation({
      table: TABLE,
      op: 'upsert',
      payload,
      onConflict: 'user_id',
    });
    return;
  }

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'user_id' });
  if (error) {
    if (isPermanentSchemaError(error)) {
      await reportPermanentSyncError(TABLE, error);
      throw error;
    }
    // Transient network/server hiccup — coalesce into the offline queue.
    await enqueueMutation({
      table: TABLE,
      op: 'upsert',
      payload,
      onConflict: 'user_id',
    });
    throw error;
  }
  // Successful write proves schema is healthy — clear sticky pause / banner.
  if (getSyncStatus().schemaMissing || getSyncStatus().error) {
    clearSyncError();
  }
}

/**
 * Persist calendar/iCal state locally and to Supabase (or queue while offline).
 */
export async function persistCalendarState(patch: Partial<CalendarStateRow>): Promise<CalendarStateRow> {
  const next = saveLocalCalendarState(patch);
  try {
    await pushStateToCloud(next);
  } catch (err) {
    console.warn('[calendar] cloud persist deferred/queued', err);
  }
  return next;
}

function parseRemoteRow(data: Record<string, unknown> | null): CalendarStateRow | null {
  if (!data) return null;
  return {
    ical_url: typeof data.ical_url === 'string' ? data.ical_url : '',
    mode: data.mode === 'manual' ? 'manual' : 'ical',
    institution_name: typeof data.institution_name === 'string' ? data.institution_name : '',
    last_synced_at: typeof data.last_synced_at === 'string' ? data.last_synced_at : null,
    last_sync_error: typeof data.last_sync_error === 'string' ? data.last_sync_error : null,
    events_cache: Array.isArray(data.events_cache)
      ? (data.events_cache as SerializedCalendarEvent[])
      : [],
    manual_events: Array.isArray(data.manual_events)
      ? (data.manual_events as ManualScheduleEventRow[])
      : [],
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : nowIso(),
  };
}

/**
 * Pull remote calendar_state (and legacy auth metadata) and merge with local.
 * Newer updated_at wins; empty remote never clobbers a richer local URL/cache.
 */
export async function reconcileCalendarState(): Promise<CalendarStateRow> {
  const local = loadLocalCalendarState();
  if (typeof navigator !== 'undefined' && !navigator.onLine) return local;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return local;

    const metaUrl =
      typeof user.user_metadata?.ical_url === 'string' ? user.user_metadata.ical_url.trim() : '';

    // Soft probe during schema cooldown: skip the select spam briefly, keep local.
    if (shouldDeferCloudWrites(TABLE)) {
      if (metaUrl && !local.ical_url) {
        return saveLocalCalendarState({ ical_url: metaUrl });
      }
      return local;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      // Table may not exist yet — keep local + seed from auth metadata; one clear error.
      if (isPermanentSchemaError(error)) {
        await reportPermanentSyncError(TABLE, error);
      }
      if (metaUrl && !local.ical_url) {
        return saveLocalCalendarState({ ical_url: metaUrl });
      }
      return local;
    }

    // Select succeeded — schema is available; clear any sticky pause from v3.1.11.
    if (getSyncStatus().schemaMissing || getSyncStatus().error) {
      clearSyncError();
    }

    const remote = parseRemoteRow(data as Record<string, unknown> | null);
    if (!remote) {
      // Seed cloud from local (or auth metadata) when row missing.
      const seedUrl = local.ical_url || metaUrl;
      const seeded = saveLocalCalendarState({
        ical_url: seedUrl,
        ...(metaUrl && !local.ical_url ? { ical_url: metaUrl } : {}),
      });
      try {
        await pushStateToCloud(seeded);
      } catch { /* queued or deferred */ }
      return seeded;
    }

    const localTs = Date.parse(local.updated_at || '') || 0;
    const remoteTs = Date.parse(remote.updated_at || '') || 0;
    let winner: CalendarStateRow =
      remoteTs > localTs ? { ...local, ...remote } : { ...remote, ...local, updated_at: local.updated_at };

    // Prefer non-empty URL / cache / manuals when the other side is blank
    // (never let an empty newer remote wipe a populated local timetable cache).
    if (!winner.ical_url) winner.ical_url = remote.ical_url || local.ical_url || metaUrl || '';
    if (!winner.events_cache?.length) {
      winner.events_cache = remote.events_cache?.length
        ? remote.events_cache
        : local.events_cache?.length
          ? local.events_cache
          : [];
    }
    if (!winner.manual_events?.length) {
      winner.manual_events = remote.manual_events?.length
        ? remote.manual_events
        : local.manual_events?.length
          ? local.manual_events
          : [];
    }
    if (!winner.institution_name) {
      winner.institution_name = remote.institution_name || local.institution_name || '';
    }

    const saved = saveLocalCalendarState(winner);
    // If local was newer (or equal), push so cloud catches up.
    if (localTs >= remoteTs) {
      try {
        await pushStateToCloud(saved);
      } catch { /* queued */ }
    } else if (metaUrl && !saved.ical_url) {
      const withMeta = saveLocalCalendarState({ ical_url: metaUrl });
      try {
        await pushStateToCloud(withMeta);
      } catch { /* queued */ }
      return withMeta;
    }
    return saved;
  } catch (err) {
    console.warn('[calendar] reconcile failed', err);
    return local;
  }
}

export async function saveCalendarUrl(url: string): Promise<void> {
  await persistCalendarState({ ical_url: url.trim() });
}

export async function getSavedCalendarUrl(): Promise<string | null> {
  const local = loadLocalCalendarState();
  if (local.ical_url?.trim()) return local.ical_url.trim();

  // Best-effort online reconcile (no-op offline).
  try {
    const reconciled = await reconcileCalendarState();
    return reconciled.ical_url?.trim() || null;
  } catch {
    return null;
  }
}

/** Cache a successful import/sync (local + cloud / queue). */
export async function cacheSyncedEvents(
  events: CalendarEvent[],
  opts?: { icalUrl?: string; error?: string | null }
): Promise<CalendarStateRow> {
  return persistCalendarState({
    ...(opts?.icalUrl != null ? { ical_url: opts.icalUrl.trim() } : {}),
    events_cache: serializeEvents(events),
    last_synced_at: nowIso(),
    last_sync_error: opts?.error ?? null,
  });
}

export async function recordSyncFailure(message: string): Promise<void> {
  await persistCalendarState({
    last_sync_error: message,
  });
}

export function getCachedCalendarEvents(): CalendarEvent[] {
  return deserializeEvents(loadLocalCalendarState().events_cache);
}

export function parseIcsText(icsData: string): CalendarEvent[] {
  const parsedData = ICAL.parse(icsData);
  const comp = new ICAL.Component(parsedData);
  const vevents = comp.getAllSubcomponents('vevent');

  const events: CalendarEvent[] = vevents.map((vevent, index) => {
    const event = new ICAL.Event(vevent);
    return {
      id: event.uid || `event-${index}`,
      title: event.summary || 'Untitled Lecture / Event',
      description: event.description || '',
      location: event.location || '',
      startDate: event.startDate.toJSDate(),
      endDate: event.endDate.toJSDate(),
    };
  });

  return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Fetch an iCal/WebCAL feed via the Express proxy on Render (or local Vite proxy).
 * Uses VITE_API_URL when the static site and API are split services.
 * On success, caches events locally and queues/uploads to Supabase.
 */
export async function fetchAndParseCalendar(icalUrl: string): Promise<CalendarEvent[]> {
  const trimmed = icalUrl.trim();
  if (!trimmed) throw new Error('Calendar URL is required.');

  // Offline: serve last successful cache when a network fetch is impossible.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = getCachedCalendarEvents();
    if (cached.length) return cached;
    throw new Error('You are offline and no cached timetable is available yet.');
  }

  let response = await fetch(apiUrl('/api/ical-proxy'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed }),
  });

  if (response.status === 405 || response.status === 404) {
    response = await fetch(`${apiUrl('/api/ical-proxy')}?url=${encodeURIComponent(trimmed)}`, {
      method: 'GET',
    });
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({} as { error?: string }));
    const msg = errJson.error || `Timetable sync failed (HTTP ${response.status})`;
    await recordSyncFailure(msg).catch(() => {});
    // Fall back to cache if present
    const cached = getCachedCalendarEvents();
    if (cached.length) return cached;
    throw new Error(msg);
  }

  const icsData = await response.text();
  if (!icsData || !/BEGIN:VCALENDAR/i.test(icsData)) {
    const msg = 'Timetable proxy returned an empty or invalid calendar feed.';
    await recordSyncFailure(msg).catch(() => {});
    const cached = getCachedCalendarEvents();
    if (cached.length) return cached;
    throw new Error(msg);
  }

  const events = parseIcsText(icsData);
  await cacheSyncedEvents(events, { icalUrl: trimmed }).catch((err) => {
    console.warn('[calendar] cache after sync failed', err);
  });
  return events;
}
