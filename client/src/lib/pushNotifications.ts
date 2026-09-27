/**
 * Class reminder notifications (Web Push + local scheduler).
 *
 * Strategy:
 *  - Prefer browser Notification API for lead-time alerts while the PWA/tab is open.
 *  - Register a PushSubscription with the API when VAPID is configured (future server push).
 *  - Full Service Worker `push` event delivery requires VAPID_* env vars on the Render
 *    Web Service (`npx web-push generate-vapid-keys`). vite-plugin-pwa generateSW does
 *    not include a custom push handler; injectManifest can be added later if needed.
 */
import { apiUrl } from './apiBase';
import { loadUnifiedScheduleEvents } from './scheduleService';

export type ReminderLeadMinutes = 5 | 10 | 15 | 30;

export interface ClassReminderPrefs {
  enabled: boolean;
  leadMinutes: ReminderLeadMinutes;
}

const PREFS_KEY = 'fios_class_reminders';
const FIRED_KEY = 'fios_class_reminders_fired';
const LEAD_OPTIONS: ReminderLeadMinutes[] = [5, 10, 15, 30];

let schedulerTimer: number | null = null;
let started = false;

export function getLeadOptions(): ReminderLeadMinutes[] {
  return [...LEAD_OPTIONS];
}

export function loadReminderPrefs(): ClassReminderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { enabled: false, leadMinutes: 15 };
    const parsed = JSON.parse(raw) as Partial<ClassReminderPrefs>;
    const lead = Number(parsed.leadMinutes);
    const leadMinutes = (LEAD_OPTIONS.includes(lead as ReminderLeadMinutes)
      ? lead
      : 15) as ReminderLeadMinutes;
    return { enabled: Boolean(parsed.enabled), leadMinutes };
  } catch {
    return { enabled: false, leadMinutes: 15 };
  }
}

export function saveReminderPrefs(prefs: ClassReminderPrefs): void {
  const leadMinutes = (LEAD_OPTIONS.includes(prefs.leadMinutes)
    ? prefs.leadMinutes
    : 15) as ReminderLeadMinutes;
  localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({ enabled: Boolean(prefs.enabled), leadMinutes })
  );
}

function loadFiredIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(FIRED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markFired(id: string): void {
  const set = loadFiredIds();
  set.add(id);
  // Cap size so sessionStorage stays small
  const arr = Array.from(set).slice(-80);
  sessionStorage.setItem(FIRED_KEY, JSON.stringify(arr));
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl('/api/push/vapid-public-key'));
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.publicKey === 'string' ? data.publicKey : null;
  } catch {
    return null;
  }
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Request notification permission, optionally register a PushSubscription
 * with the server when VAPID is available, and persist local prefs.
 */
export async function enableClassReminders(
  leadMinutes: ReminderLeadMinutes = 15
): Promise<{ ok: boolean; message: string }> {
  if (!('Notification' in window)) {
    return { ok: false, message: 'Notifications are not supported in this browser.' };
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    saveReminderPrefs({ enabled: false, leadMinutes });
    return { ok: false, message: 'Notification permission was denied.' };
  }

  saveReminderPrefs({ enabled: true, leadMinutes });
  startClassReminderScheduler();

  // Best-effort server subscription for future SW push (requires VAPID on Render).
  try {
    await registerPushSubscription();
  } catch (err) {
    console.info('Push subscription skipped (local reminders still active):', err);
  }

  return { ok: true, message: 'Class reminders enabled.' };
}

export async function disableClassReminders(): Promise<void> {
  const prefs = loadReminderPrefs();
  saveReminderPrefs({ ...prefs, enabled: false });
  stopClassReminderScheduler();
  try {
    await unregisterPushSubscription();
  } catch {
    /* ignore */
  }
}

export async function registerPushSubscription(): Promise<PushSubscription | null> {
  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return null;

  const reg = await getServiceWorkerRegistration();
  if (!reg?.pushManager) return null;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  await fetch(apiUrl('/api/push/subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json),
  });
  return sub;
}

export async function unregisterPushSubscription(): Promise<void> {
  const reg = await getServiceWorkerRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try {
    await fetch(apiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  } finally {
    await sub.unsubscribe().catch(() => undefined);
  }
}

export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const reg = await getServiceWorkerRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) {
    // Fall back to local Notification so Settings still gives feedback without VAPID.
    showLocalNotification('Fios class reminder', 'Local notifications are working. Server push needs VAPID keys on Render.');
    return { ok: true, message: 'Local test notification shown (server push not subscribed).' };
  }
  const res = await fetch(apiUrl('/api/push/test'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showLocalNotification('Fios class reminder', 'Local fallback — server push failed or VAPID unset.');
    return {
      ok: false,
      message: data?.error || 'Server push test failed; showed a local notification instead.',
    };
  }
  return { ok: true, message: 'Test push sent.' };
}

function showLocalNotification(title: string, body: string, tag?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const regPromise = getServiceWorkerRegistration();
    void regPromise.then((reg) => {
      if (reg?.showNotification) {
        void reg.showNotification(title, {
          body,
          tag: tag || 'fios-class-reminder',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      } else {
        // eslint-disable-next-line no-new
        new Notification(title, { body, tag: tag || 'fios-class-reminder', icon: '/icon-192.png' });
      }
    });
  } catch {
    try {
      // eslint-disable-next-line no-new
      new Notification(title, { body, tag: tag || 'fios-class-reminder' });
    } catch {
      /* ignore */
    }
  }
}

async function checkUpcomingClasses(): Promise<void> {
  const prefs = loadReminderPrefs();
  if (!prefs.enabled || Notification.permission !== 'granted') return;

  const now = Date.now();
  const leadMs = prefs.leadMinutes * 60 * 1000;
  const rangeEnd = new Date(now + leadMs + 60 * 60 * 1000);
  const rangeStart = new Date(now - 5 * 60 * 1000);

  try {
    const { events } = await loadUnifiedScheduleEvents(rangeStart, rangeEnd);
    const fired = loadFiredIds();

    for (const ev of events) {
      const start = ev.startDate.getTime();
      const delta = start - now;
      if (delta < 0 || delta > leadMs) continue;

      const fireId = `${ev.id}|${start}|${prefs.leadMinutes}`;
      if (fired.has(fireId)) continue;

      const mins = Math.max(1, Math.round(delta / 60000));
      const when =
        mins <= 1 ? 'in about a minute' : `in about ${mins} minutes`;
      showLocalNotification(
        'Upcoming class',
        `${ev.title} starts ${when}${ev.location ? ` · ${ev.location}` : ''}`,
        fireId
      );
      markFired(fireId);
    }
  } catch (err) {
    console.warn('Class reminder check failed:', err);
  }
}

export function startClassReminderScheduler(): void {
  const prefs = loadReminderPrefs();
  if (!prefs.enabled) return;
  if (schedulerTimer != null) return;

  void checkUpcomingClasses();
  schedulerTimer = window.setInterval(() => {
    void checkUpcomingClasses();
  }, 60_000);
  started = true;
}

export function stopClassReminderScheduler(): void {
  if (schedulerTimer != null) {
    window.clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  started = false;
}

/** Call once from the dashboard shell to resume reminders after refresh. */
export function bootstrapClassReminders(): void {
  if (started) return;
  const prefs = loadReminderPrefs();
  if (prefs.enabled && Notification.permission === 'granted') {
    startClassReminderScheduler();
  }
}
