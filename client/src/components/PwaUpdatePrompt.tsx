/**
 * In-app prompt when a new service worker / deploy is ready.
 * Uses vite-plugin-pwa `useRegisterSW` (registerType: 'prompt').
 * Works for installed PWA and regular browser tabs.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useReducedMotion, AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export const PwaUpdatePrompt: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Periodic check so long-lived tabs / installed PWAs notice deploys
      if (!registration) return;
      const hour = 60 * 60 * 1000;
      window.setInterval(() => {
        void registration.update();
      }, hour);
    },
    onRegisterError(error) {
      console.warn('[fios] SW registration failed', error);
    },
  });

  useEffect(() => {
    if (needRefresh) setDismissed(false);
  }, [needRefresh]);

  const visible = needRefresh && !dismissed;

  const onReload = useCallback(() => {
    void updateServiceWorker(true);
  }, [updateServiceWorker]);

  const onDismiss = useCallback(() => {
    setDismissed(true);
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label="Update available"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
          className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-[80] w-[min(100%-1.5rem,22rem)] safe-bottom pointer-events-auto"
        >
          <div className="rounded-xl border accent-border bg-[var(--fios-surface)]/95 backdrop-blur-md shadow-xl px-3.5 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-wider accent-solid-text font-mono">
                Update available
              </p>
              <p className="text-[11px] font-mono text-[var(--fios-text-muted)] leading-snug mt-0.5">
                A newer Fios build is ready. Reload to apply.
              </p>
            </div>
            <button
              type="button"
              onClick={onReload}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg accent-bg text-slate-950 text-[11px] font-black uppercase tracking-wide cursor-pointer active:opacity-90"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />
              Reload
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 p-2 rounded-lg text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer"
              aria-label="Dismiss update prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaUpdatePrompt;
