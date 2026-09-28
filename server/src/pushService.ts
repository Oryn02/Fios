/**
 * Web Push (VAPID) helpers for class reminders.
 * Subscriptions are kept in an in-memory Map (ephemeral on free Render).
 * Optional Supabase table SQL is documented in supabase/schema.sql.
 *
 * Required env (Render dashboard, sync: false):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
 */
import webpush from 'web-push';

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

/** endpoint → subscription */
const subscriptions = new Map<string, PushSubscriptionJSON>();

let vapidConfigured = false;

export function configureVapid(): { ok: boolean; reason?: string } {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || '').trim();

  if (!publicKey || !privateKey || !subject) {
    vapidConfigured = false;
    return {
      ok: false,
      reason:
        'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT (mailto:) on the Render Web Service to enable server Web Push.',
    };
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return { ok: true };
  } catch (err: any) {
    vapidConfigured = false;
    return { ok: false, reason: err?.message || 'Invalid VAPID configuration' };
  }
}

export function getVapidPublicKey(): string | null {
  const key = (process.env.VAPID_PUBLIC_KEY || '').trim();
  return key || null;
}

export function isVapidReady(): boolean {
  if (!vapidConfigured) configureVapid();
  return vapidConfigured;
}

export function saveSubscription(sub: PushSubscriptionJSON): void {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    throw new Error('Invalid push subscription payload');
  }
  subscriptions.set(sub.endpoint, sub);
}

export function removeSubscription(endpoint: string): boolean {
  return subscriptions.delete(endpoint);
}

export function listSubscriptions(): PushSubscriptionJSON[] {
  return Array.from(subscriptions.values());
}

export async function sendPushToSubscription(
  sub: PushSubscriptionJSON,
  payload: { title: string; body: string; tag?: string; url?: string }
): Promise<void> {
  if (!isVapidReady()) {
    throw new Error('VAPID keys are not configured on the server');
  }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    throw new Error('Invalid push subscription payload');
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys,
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        tag: payload.tag || 'fios-push',
        url: payload.url || '/',
      })
    );
  } catch (err: any) {
    const status = err?.statusCode || err?.status;
    // Gone / Not Found → drop stale endpoint so the next subscribe can replace it.
    if (status === 404 || status === 410) {
      removeSubscription(sub.endpoint);
      const gone = new Error(
        'Push subscription expired or was revoked. Disable and re-enable Class Reminders, then try again.'
      );
      (gone as any).statusCode = status;
      throw gone;
    }
    if (status === 403 || /VAPID|unauthorized|JWT/i.test(String(err?.message || ''))) {
      throw new Error(
        'Push rejected by the browser push service (VAPID key mismatch or unauthorized). Re-enable Class Reminders after confirming VAPID keys on the API host.'
      );
    }
    throw new Error(err?.message || 'Failed to send push notification');
  }
}

export async function sendTestPush(sub: PushSubscriptionJSON): Promise<void> {
  await sendPushToSubscription(sub, {
    title: 'Fios class reminder',
    body: 'Push notifications are working. Upcoming classes can alert you before they start.',
    tag: 'fios-push-test',
  });
}
