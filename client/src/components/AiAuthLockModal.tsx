import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GitBranch, Lock, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IS_DEMO, disableDemo } from '../lib/demo';
import { toast } from '../lib/toast';

interface AiAuthLockModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Non-intrusive lock for live-demo guests attempting cloud AI / uploads.
 * CTA starts Supabase GitHub OAuth (same redirect flow as Settings / AuthModal).
 */
export const AiAuthLockModal: React.FC<AiAuthLockModalProps> = ({ open, onClose }) => {
  const [busy, setBusy] = useState(false);

  const signInWithGithub = async () => {
    setBusy(true);
    try {
      if (IS_DEMO) disableDemo();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
          scopes: 'gist',
        },
      });
      if (error) {
        toast(error.message || 'GitHub sign-in failed', 'error');
        setBusy(false);
      }
      // On success the browser navigates away; keep busy state if redirecting.
    } catch (err: any) {
      toast(err?.message || 'GitHub sign-in failed', 'error');
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Dismiss"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-auth-lock-title"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-md rounded-2xl border fios-border bg-[var(--fios-surface)] shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] accent-bg opacity-80" />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 pt-7 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl accent-bg flex items-center justify-center text-slate-950 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
                    <Sparkles className="w-3 h-3" /> Live demo · locked
                  </div>
                  <h2 id="ai-auth-lock-title" className="text-base font-black text-[var(--fios-text)] leading-snug">
                    AI features need an account
                  </h2>
                </div>
              </div>

              <p className="text-sm text-[var(--fios-text-muted)] leading-relaxed">
                AI features and cloud generation are locked in the live demo view. Please sign up or log in with GitHub to unlock full access to Fios v2.2.0.
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => void signInWithGithub()}
                className="w-full py-3 px-4 rounded-xl accent-bg text-slate-950 text-xs font-black uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99] transition-transform"
              >
                {busy ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GitBranch className="w-4 h-4" />
                )}
                Sign In with GitHub
              </button>

              <p className="text-[11px] font-mono text-[var(--fios-text-muted)] text-center">
                Browse the dashboard freely — cloud AI stays off until you sign in.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AiAuthLockModal;
