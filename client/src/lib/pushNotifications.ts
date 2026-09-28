/**
 * Class reminder notifications (Web Push + local scheduler).
 *
 * Strategy:
 *  - Prefer browser Notification API for lead-time alerts while the PWA/tab is open.
 *  - Register a PushSubscription with the API when VAPID is configured.
 *  - Service worker `push` / `notificationclick` live in public/push-handler.js
 *    (imported by Workbox via vite-plugin-pwa importScripts).
 */
import { apiUrl } from './apiBase';
import { resolveEventPlace } from './calendarService';
import { loadUnifiedScheduleEvents } from './scheduleService';

export type ReminderLeadMinutes = 5 | 10 | 15 | 30;

export interface ClassReminderPrefs {
  enabled: boolean;
  leadMinutes: ReminderLeadMinutes;
}

export type PushSupportStatus = {
  supported: boolean;
  /** True when Web Push can be subscribed (SW + PushManager available or expected). */
  pushCapable: boolean;
  message: string;
};

const PREFS_KEY = 'fios_class_reminders';
const FIRED_KEY = 'fios_class_reminders_fired';
const VAPID_CACHE_KEY = 'fios_vapid_public_key';
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

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ may report as MacIntel with touch
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(mq || iosStandalone);
}

/**
 * Preflight for Settings UX — permission, iOS PWA, and browser capability.
 */
export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      pushCapable: false,
      message: 'Notifications are not available in this environment.',
    };
  }

  if (!('Notification' in window)) {
    return {
      supported: false,
      pushCapable: false,
      message: 'Notifications are not supported in this browser.',
    };
  }

  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      pushCapable: false,
      message: 'This browser does not support service workers required for reminders.',
    };
  }

  if (isIosDevice() && !isStandaloneDisplay()) {
    return {
      supported: false,
      pushCapable: false,
      message:
        'On iPhone/iPad, add Fios to your Home Screen (Share → Add to Home Screen), then open it from the icon to enable notifications.',
    };
  }

  if (Notification.permission === 'denied') {
    return {
      supported: false,
      pushCapable: false,
      message:
        'Notification permission is blocked. Allow notifications for this site in your browser or system settings, then try again.',
    };
  }

  const pushCapable = 'PushManager' in window;
  return {
    supported: true,
    pushCapable,
    message: pushCapable
      ? 'Notifications are available on this device.'
      : 'Local reminders work while Fios is open. Background Web Push needs a browser with PushManager.',
  };
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
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      return (await navigator.serviceWorker.ready) || existing;
    }
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

function permissionDeniedMessage(): string {
  if (isIosDevice()) {
    return 'Notification permission was denied. Open Fios from your Home Screen icon, then allow notifications when prompted — or enable them in Settings → Notifications → Fios.';
  }
  return 'Notification permission was denied. Allow notifications for this site in your browser settings, then try again.';
}

/**
 * Request notification permission, optionally register a PushSubscription
 * with the server when VAPID is available, and persist local prefs.
 */
export async function enableClassReminders(
  leadMinutes: ReminderLeadMinutes = 15
): Promise<{ ok: boolean; message: string }> {
  const support = getPushSupportStatus();
  if (!support.supported && Notification.permission !== 'granted') {
    saveReminderPrefs({ enabled: false, leadMinutes });
    return { ok: false, message: support.message };
  }

  if (!('Notification' in window)) {
    return { ok: false, message: 'Notifications are not supported in this browser.' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      saveReminderPrefs({ enabled: false, leadMinutes });
      return {
        ok: false,
        message: 'Could not request notification permission in this browser.',
      };
    }
  }

  if (permission === 'denied') {
    saveReminderPrefs({ enabled: false, leadMinutes });
    return { ok: false, message: permissionDeniedMessage() };
  }

  if (permission !== 'granted') {
    saveReminderPrefs({ enabled: false, leadMinutes });
    return { ok: false, message: 'Notification permission was not granted.' };
  }

  saveReminderPrefs({ enabled: true, leadMinutes });
  startClassReminderScheduler();

  let pushNote = '';
  try {
    const sub = await registerPushSubscription();
    pushNote = sub
      ? ' Web Push is registered for background alerts when the server sends them.'
      : ' Local reminders are on while Fios is open; server Web Push was not available yet.';
  } catch (err) {
    console.info('Push subscription skipped (local reminders still active):', err);
    pushNote =
      ' Local reminders are on while Fios is open; server Web Push registration failed — try Send test notification later.';
  }

  return { ok: true, message: `Class reminders enabled.${pushNote}` };
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

  const cachedKey = localStorage.getItem(VAPID_CACHE_KEY);
  let sub = await reg.pushManager.getSubscription();

  // Re-subscribe when the server VAPID public key rotated (mismatch → silent push failures).
  if (sub && cachedKey && cachedKey !== publicKey) {
    try {
      await sub.unsubscribe();
    } catch {
      /* ignore */
    }
    sub = null;
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const res = await fetch(apiUrl('/api/push/subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string })?.error || `Failed to store push subscription (${res.status})`
    );
  }

  localStorage.setItem(VAPID_CACHE_KEY, publicKey);
  return sub;
}

export async function unregisterPushSubscription(): Promise<void> {
  const reg = await getServiceWorkerRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) {
    localStorage.removeItem(VAPID_CACHE_KEY);
    return;
  }
  const endpoint = sub.endpoint;
  try {
    await fetch(apiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  } finally {
    await sub.unsubscribe().catch(() => undefined);
    localStorage.removeItem(VAPID_CACHE_KEY);
  }
}

export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const support = getPushSupportStatus();
  if (Notification.permission !== 'granted') {
    if (Notification.permission === 'denied') {
      return { ok: false, message: permissionDeniedMessage() };
    }
    if (!support.supported) {
      return { ok: false, message: support.message };
    }
    return { ok: false, message: 'Enable class reminders first to grant notification permission.' };
  }

  // Ensure we have a current subscription before testing server push.
  let sub: PushSubscription | null = null;
  try {
    sub = await registerPushSubscription();
  } catch (err) {
    console.info('Could not register before test push:', err);
  }

  if (!sub) {
    const reg = await getServiceWorkerRegistration();
    sub = (await reg?.pushManager?.getSubscription()) || null;
  }

  if (!sub) {
    showLocalNotification(
      'Fios class reminder',
      'Local notifications are working. Server Web Push needs a push subscription (check network / VAPID on the API).'
    );
    return {
      ok: true,
      message: 'Local test notification shown (server push not subscribed).',
    };
  }

  const res = await fetch(apiUrl('/api/push/test'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg =
      (data as { error?: string })?.error || 'Server push test failed';

    // Stale subscription (410) — drop and show local fallback with clear copy.
    if (res.status === 410 || /gone|expired|unsubscribed/i.test(errMsg)) {
      try {
        await sub.unsubscribe();
      } catch {
        /* ignore */
      }
      localStorage.removeItem(VAPID_CACHE_KEY);
    }

    showLocalNotification(
      'Fios class reminder',
      'Local fallback — server push failed. Check that you allowed notifications and try again.'
    );
    return {
      ok: false,
      message: `${errMsg}. Showed a local notification instead.`,
    };
  }

  return {
    ok: true,
    message: 'Test push sent — you should see a notification shortly.',
  };
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
      const when = mins <= 1 ? 'in about a minute' : `in about ${mins} minutes`;
      const room = resolveEventPlace(ev.location, ev.description);
      showLocalNotification(
        room ? `Upcoming class · ${room}` : 'Upcoming class',
        `${ev.title} starts ${when}${room ? ` · ${room}` : ''}`,
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
  if (prefs.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    startClassReminderScheduler();
    // Refresh server subscription in the background (VAPID may have rotated).
    void registerPushSubscription().catch(() => undefined);
  }
}
