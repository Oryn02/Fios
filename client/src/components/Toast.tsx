import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toasts: ToastItem[];
  push: (message: string, kind?: ToastKind) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 2000;

let externalPush: ((message: string, kind?: ToastKind) => void) | null = null;

/** Imperative toast helper usable outside React trees. */
export function toast(message: string, kind: ToastKind = 'info') {
  if (externalPush) externalPush(message, kind);
  else console.info(`[toast:${kind}]`, message);
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Singleton banner: replace any visible toast so stacks never pile up over chrome.
    setToasts([{ id, message, kind }]);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  externalPush = push;

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  const iconFor = (kind: ToastKind) => {
    if (kind === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (kind === 'error') return <AlertCircle className="w-4 h-4 text-rose-400" />;
    return <Info className="w-4 h-4 accent-solid-text" />;
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Mobile: top under header; desktop: same top band, never covers bottom nav */}
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none safe-top"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence mode="wait">
          {toasts.slice(0, 1).map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto flex items-start gap-2.5 rounded-xl border fios-border bg-[var(--fios-surface)] px-3.5 py-3 shadow-xl"
            >
              {iconFor(t.kind)}
              <p className="flex-1 text-xs font-medium text-[var(--fios-text)] leading-relaxed">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="touch-target text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer p-0.5 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
