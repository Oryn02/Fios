import { useEffect, useState } from 'react';
import {
  getSyncStatus,
  listQueuedCount,
  subscribeSyncStatus,
  type SyncStatus,
} from './offlineQueue';

export function useOnlineStatus(): {
  online: boolean;
  queued: number;
  syncError: string | null;
  syncing: boolean;
  schemaMissing: boolean;
} {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queued, setQueued] = useState(() => getSyncStatus().pending);
  const [syncError, setSyncError] = useState<string | null>(() => getSyncStatus().error);
  const [syncing, setSyncing] = useState(() => getSyncStatus().phase === 'syncing');
  const [schemaMissing, setSchemaMissing] = useState(() => getSyncStatus().schemaMissing);

  useEffect(() => {
    const applyStatus = (status: SyncStatus) => {
      setQueued(status.pending);
      setSyncError(status.error);
      setSyncing(status.phase === 'syncing');
      setSchemaMissing(status.schemaMissing);
    };

    const unsub = subscribeSyncStatus(applyStatus);

    const refreshQueue = () => {
      void listQueuedCount()
        .then((n) => {
          // Prefer live IDB count when status listeners haven't fired yet.
          const status = getSyncStatus();
          if (n !== status.pending) {
            setQueued(n);
          }
        })
        .catch(() => setQueued(0));
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
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(id);
    };
  }, []);

  return { online, queued, syncError, syncing, schemaMissing };
}
