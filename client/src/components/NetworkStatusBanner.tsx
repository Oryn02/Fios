/**
 * NetworkStatusBanner — offline / queue / sync-error indicator.
 */
import React from 'react';
import { WifiOff, CloudUpload, CloudOff } from 'lucide-react';
import { useOnlineStatus } from '../lib/networkStatus';

export const NetworkStatusBanner: React.FC = () => {
  const { online, queued, syncError, syncing } = useOnlineStatus();

  // Prefer a stable error message over a spinning “Syncing N…” zombie.
  if (online && syncError && queued === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[75] max-w-[min(92vw,28rem)] px-3.5 py-2 rounded-full border shadow-lg text-[11px] font-mono font-bold flex items-center gap-2 pointer-events-none safe-bottom bg-[var(--fios-surface)]/95 border-rose-500/45 text-rose-300"
      >
        <CloudOff className="w-3.5 h-3.5 shrink-0" />
        <span className="leading-snug">{syncError}</span>
      </div>
    );
  }

  if (online && queued === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[75] px-3.5 py-2 rounded-full border shadow-lg text-[11px] font-mono font-bold flex items-center gap-2 pointer-events-none safe-bottom ${
        online
          ? 'bg-[var(--fios-surface)]/95 border-cyan-500/40 text-cyan-300'
          : 'bg-[var(--fios-surface)]/95 border-amber-500/50 text-amber-300'
      }`}
    >
      {online ? (
        <>
          <CloudUpload className="w-3.5 h-3.5" />
          {syncing
            ? `Syncing ${queued} offline change${queued === 1 ? '' : 's'}…`
            : `${queued} offline change${queued === 1 ? '' : 's'} pending`}
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          Offline{queued > 0 ? ` · ${queued} queued` : ''}
        </>
      )}
    </div>
  );
};

export default NetworkStatusBanner;
