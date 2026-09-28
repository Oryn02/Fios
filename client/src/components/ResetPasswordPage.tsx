import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FiosLogo } from './FiosLogo';

export type ResetPasswordStatus = 'waiting' | 'ready' | 'invalid';

interface ResetPasswordPageProps {
  /**
   * `ready` — Supabase emitted PASSWORD_RECOVERY (genuine reset link).
   * `waiting` — still resolving the redirect / recovery event.
   * `invalid` — path or link without a recovery session (expired, already used, or normal login).
   */
  status: ResetPasswordStatus;
  onDone: () => void;
  onRequestNewLink?: () => void;
  /** Leave `/reset-password` and return to landing or the signed-in app. */
  onBackToApp?: () => void;
}

/**
 * Completes Supabase password recovery after redirect to `/reset-password`.
 * The set-password form is shown only when `status === 'ready'` (PASSWORD_RECOVERY).
 */
export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  status,
  onDone,
  onRequestNewLink,
  onBackToApp,
}) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      window.setTimeout(() => onDone(), 900);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const subtitle = done
    ? 'Password updated — opening your dashboard…'
    : status === 'ready'
      ? 'Choose a new password for your account'
      : status === 'invalid'
        ? 'This reset link is invalid or expired'
        : 'Confirming your reset link…';

  return (
    <div className="min-h-dvh bg-[#07090e] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="w-full max-w-md bg-[#0e131f]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-5 relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <FiosLogo size="lg" withWordmark fixedEmerald />
          </div>
          <p className="text-slate-400 text-xs font-medium">{subtitle}</p>
        </div>

        {status === 'waiting' && !done && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg text-amber-200 text-[11px] font-bold leading-relaxed flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin shrink-0" />
              Waiting for a valid reset link from your email…
            </div>
          </div>
        )}

        {status === 'invalid' && !done && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-200 text-[11px] font-bold leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This password-reset link is missing, expired, or already used. Request a new link, or go back
                to Fios without changing your password.
              </span>
            </div>
            {onRequestNewLink && (
              <button
                type="button"
                onClick={onRequestNewLink}
                className="w-full py-3 rounded-xl border border-slate-800 bg-[#07090e]/90 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Request a new reset link
              </button>
            )}
            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black italic uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Fios
              </button>
            )}
          </div>
        )}

        {status === 'ready' && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className="w-full pl-4 pr-10 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Confirm password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-300 text-[11px] font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Save new password
                </>
              )}
            </motion.button>
          </form>
        )}

        {done && (
          <div className="p-3 bg-emerald-500/10 border-l-4 border-emerald-500 rounded-r-lg text-emerald-300 text-[11px] font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Password updated successfully.
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
