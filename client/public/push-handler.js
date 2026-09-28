/**
 * Web Push handlers imported into the Workbox-generated service worker.
 * Without these, the browser receives VAPID pushes but never shows a notification.
 */
/* eslint-disable no-restricted-globals */
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Fios',
    body: 'You have a class reminder.',
    tag: 'fios-push',
    url: '/',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = {
          title: typeof parsed.title === 'string' ? parsed.title : payload.title,
          body: typeof parsed.body === 'string' ? parsed.body : payload.body,
          tag: typeof parsed.tag === 'string' ? parsed.tag : payload.tag,
          url: typeof parsed.url === 'string' ? parsed.url : payload.url,
        };
      }
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) payload.body = text;
    } catch {
      /* keep defaults */
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (typeof client.navigate === 'function') {
            try {
              void client.navigate(targetUrl);
            } catch {
              /* ignore navigate failures */
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
