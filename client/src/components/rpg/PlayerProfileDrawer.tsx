import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, X, Flame, Sparkles } from 'lucide-react';
import { RpgProgressPanel } from './RpgProgressPanel';
import { PlayerCard } from './PlayerCard';
import { useRpgStatus } from '../../hooks/useRpgStatus';
import { usePreferredName } from '../../context/ProfileContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface PlayerProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const PlayerProfileDrawer: React.FC<PlayerProfileDrawerProps> = ({
  open,
  onClose,
  onOpenSettings,
}) => {
  const { status } = useRpgStatus();
  const name = usePreferredName();
  // Allow nested drawer scroll under body lock (critical on iOS / PWA).
  useBodyScrollLock(open, '[data-profile-drawer-scroll]');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[min(100vw,22rem)] bg-[var(--fios-surface)]/90 backdrop-blur-xl border-l fios-border flex flex-col safe-top safe-bottom shadow-2xl"
            aria-label="User profile"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-2 p-4 border-b fios-border shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> User Profile
                </p>
                <h2 className="text-sm font-black uppercase truncate text-[var(--fios-text)]">{name}</h2>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="touch-target p-2 rounded-lg border fios-border text-[var(--fios-text-muted)] cursor-pointer"
                  aria-label="Open account settings"
                  title="Account settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="touch-target p-2 rounded-lg border fios-border text-[var(--fios-text-muted)] cursor-pointer"
                  aria-label="Close profile"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              data-profile-drawer-scroll
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scroll-touch"
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
            >
              <PlayerCard status={status} name={name} />
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-[var(--fios-text-muted)]">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Progress, badges & unlocks
              </div>
              <RpgProgressPanel />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default PlayerProfileDrawer;
