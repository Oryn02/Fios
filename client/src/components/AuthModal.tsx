import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, ShieldAlert, X } from 'lucide-react';

interface AuthModalProps {
  mode?: 'signin' | 'signup';
  onClose?: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode = 'signin', onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        // When email confirmation is enabled Supabase returns no session.
        if (!data.session) {
          setNotice('Account created. Check your email to confirm, then sign in.');
          setIsSignUp(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e]/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="w-full max-w-md bg-[#0e131f]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 relative z-10 overflow-hidden"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800/50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-emerald-500/10 border-l-2 border-emerald-400 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            Academic Command Center
          </div>
          <h1 className="text-3xl font-black italic tracking-tight text-white">
            Fios <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Studio</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            {isSignUp ? 'Create your student account to sync your work' : 'Sign in to access your modules & study tools'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full px-4 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.ie"
              className="w-full px-4 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-300 text-[11px] font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {notice && (
            <div className="p-3 bg-emerald-500/10 border-l-4 border-emerald-500 rounded-r-lg text-emerald-300 text-[11px] font-bold">
              {notice}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              <><UserPlus className="w-4 h-4" /> Create Account ↵</>
            ) : (
              <><LogIn className="w-4 h-4" /> Sign In to Dashboard ↵</>
            )}
          </motion.button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800/80">
          <button
            onClick={() => { setIsSignUp((v) => !v); setError(null); setNotice(null); }}
            className="text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;
