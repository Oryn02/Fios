import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
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

let externalPush: ((message: string, kind?: ToastKind) => void) | null = null;

/** Imperative toast helper usable outside React trees. */
export function toast(message: string, kind: ToastKind = 'info') {
  if (externalPush) externalPush(message, kind);
  else console.info(`[toast:${kind}]`, message);
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, kind }]);
    window.setTimeout(() => dismiss(id), 3200);
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
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto flex items-start gap-2.5 rounded-xl border fios-border bg-[var(--fios-surface)] px-3.5 py-3 shadow-xl"
            >
              {iconFor(t.kind)}
              <p className="flex-1 text-xs font-medium text-[var(--fios-text)] leading-relaxed">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer p-0.5"
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
