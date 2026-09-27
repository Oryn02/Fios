/**
 * NetworkStatusBanner — subtle offline / queue indicator via navigator.onLine.
 */
import React from 'react';
import { WifiOff, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '../lib/networkStatus';

export const NetworkStatusBanner: React.FC = () => {
  const { online, queued } = useOnlineStatus();

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
          Syncing {queued} offline change{queued === 1 ? '' : 's'}…
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
