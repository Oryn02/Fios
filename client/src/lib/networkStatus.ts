import { useEffect, useState } from 'react';
import { listQueuedCount } from './offlineQueue';

export function useOnlineStatus(): { online: boolean; queued: number } {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const refreshQueue = () => {
      void listQueuedCount().then(setQueued).catch(() => setQueued(0));
    };
    const onOnline = () => {
      setOnline(true);
      refreshQueue();
    };
    const onOffline = () => {
      setOnline(false);
      refreshQueue();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refreshQueue();
    const id = window.setInterval(refreshQueue, 8000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(id);
    };
  }, []);

  return { online, queued };
}
