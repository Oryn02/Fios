import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Trophy } from 'lucide-react';

export type LootBreakdown = {
  cardXp?: number;
  streakXp?: number;
  codeXp?: number;
  total: number;
  title?: string;
  subtitle?: string;
};

interface LootDropModalProps {
  open: boolean;
  loot: LootBreakdown | null;
  onClose: () => void;
}

export const LootDropModal: React.FC<LootDropModalProps> = ({ open, loot, onClose }) => {
  return (
    <AnimatePresence>
      {open && loot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Study loot"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-sm rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Loot drop
                </p>
                <h3 className="text-lg font-black italic uppercase text-[var(--fios-text)]">
                  {loot.title || 'Session complete'}
                </h3>
                {loot.subtitle && (
                  <p className="text-xs text-[var(--fios-text-muted)] mt-0.5">{loot.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg border fios-border text-[var(--fios-text-muted)] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[var(--fios-surface-2)] border fios-border p-4 space-y-2">
              {(loot.cardXp ?? 0) > 0 && (
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--fios-text-muted)]">Cards reviewed</span>
                  <span className="font-bold accent-solid-text">+{loot.cardXp} XP</span>
                </div>
              )}
              {(loot.streakXp ?? 0) > 0 && (
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--fios-text-muted)]">Streak bonus</span>
                  <span className="font-bold text-orange-400">+{loot.streakXp} XP</span>
                </div>
              )}
              {(loot.codeXp ?? 0) > 0 && (
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--fios-text-muted)]">Code challenge</span>
                  <span className="font-bold text-cyan-400">+{loot.codeXp} XP</span>
                </div>
              )}
              <div className="pt-2 border-t fios-border flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 accent-solid-text" /> Total
                </span>
                <span className="text-xl font-black accent-solid-text">+{loot.total} XP</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-11 py-3 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer"
            >
              Collect & continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LootDropModal;
