import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, ShieldAlert, X, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { FiosLogo } from './FiosLogo';

interface AuthModalProps {
  mode?: 'signin' | 'signup';
  onClose?: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode = 'signin', onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Failed to authenticate with ${provider}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice('Password reset link sent! Check your email inbox.');
      } else if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice('Account created. Check your email to confirm, then sign in.');
          setIsSignUp(false);
          return;
        }
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
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
        className="w-full max-w-md bg-[#0e131f]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-5 relative z-10 overflow-hidden"
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

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <FiosLogo size="lg" withWordmark fixedEmerald />
          </div>
          <p className="text-slate-400 text-xs font-medium">
            {isForgotPassword
              ? 'Enter your registered email to reset password'
              : isSignUp
              ? 'Create your student account to sync your work'
              : 'Sign in to access your modules & study tools'}
          </p>
        </div>

        {!isForgotPassword && (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#07090e]/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#07090e]/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.16-1.9-14.48-6.1-3.23-2.63-7.16-7.27-11.8-13.92-5.45-7.73-9.87-16.5-13.26-26.3-3.39-9.81-5.09-19.38-5.09-28.72 0-13.43 3.39-24.51 10.18-33.22 6.78-8.71 15.26-13.19 25.43-13.43 4.58 0 9.77 1.2 15.57 3.59 5.8 2.4 9.87 3.6 12.21 3.6 1.95 0 6.02-1.2 12.21-3.6 6.19-2.39 11.16-3.47 14.93-3.23 9.42.5 17.5 4.12 24.23 11.87-8.52 5.15-12.63 12.44-12.33 21.87.3 9.3 4.28 16.92 11.95 22.86 3.49 2.76 7.42 4.79 11.79 6.09-1.91 5.72-4.52 11.72-7.83 18.01zM119.22 31.25c0-6.84 2.45-13.43 7.35-19.78 4.9-6.35 11.02-10.23 18.37-11.64.24 1.15.36 2.18.36 3.1 0 6.96-2.58 13.68-7.73 20.15-5.15 6.47-11.27 10.29-18.35 11.46-.12-1.07-.18-2.16-.18-3.29z"/>
              </svg>
              Continue with Apple
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#0e131f] px-3 text-slate-500 font-mono tracking-widest">or email</span></div>
            </div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && !isForgotPassword && (
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

          {!isForgotPassword && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); setNotice(null); }}
                    className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-10 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

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
            ) : isForgotPassword ? (
              'Send Reset Link ↵'
            ) : isSignUp ? (
              <><UserPlus className="w-4 h-4" /> Create Account ↵</>
            ) : (
              <><LogIn className="w-4 h-4" /> Sign In to Dashboard ↵</>
            )}
          </motion.button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800/80">
          {isForgotPassword ? (
            <button
              onClick={() => { setIsForgotPassword(false); setError(null); setNotice(null); }}
              className="text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          ) : (
            <button
              onClick={() => { setIsSignUp((v) => !v); setError(null); setNotice(null); }}
              className="text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;