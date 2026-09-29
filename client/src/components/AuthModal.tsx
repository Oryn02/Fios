import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, ShieldAlert, X, Eye, EyeOff, ArrowLeft, Mail, HelpCircle } from 'lucide-react';
import { FiosLogo } from './FiosLogo';
import { getSupportEmail } from '../lib/supportConfig';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

type AuthPanel = 'auth' | 'forgot-password' | 'forgot-email';

interface AuthModalProps {
  mode?: 'signin' | 'signup';
  onClose?: () => void;
  onSuccess?: () => void;
  /** Open directly on forgot-password (e.g. from /reset-password expired link). */
  initialPanel?: AuthPanel;
  /** Surface OAuth / redirect auth errors (e.g. `#error=access_denied`). */
  initialError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  mode = 'signin',
  onClose,
  onSuccess,
  initialPanel = 'auth',
  initialError = null,
}) => {
  useBodyScrollLock(true);
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [panel, setPanel] = useState<AuthPanel>(initialPanel);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  const supportEmail = getSupportEmail();

  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  useEffect(() => {
    setPanel(initialPanel);
  }, [initialPanel]);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const goPanel = (next: AuthPanel) => {
    setPanel(next);
    setError(null);
    setNotice(null);
  };

  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}`,
          scopes: 'gist',
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to authenticate with GitHub.';
      setError(message);
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
      if (panel === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setNotice('Password reset link sent. Check your inbox (and spam), then open the link to choose a new password.');
      } else if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Account created. Check your email to confirm, then sign in.');
          setIsSignUp(false);
          return;
        }
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    panel === 'forgot-password'
      ? 'Enter the email on your account — we will send a reset link'
      : panel === 'forgot-email'
      ? 'How to recover when you cannot remember your sign-in email'
      : isSignUp
      ? 'Create your student account to sync your work'
      : 'Sign in to access your modules & study tools';

  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="w-full max-w-md bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl space-y-5 relative z-50 overflow-hidden"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 touch-target text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <FiosLogo size="lg" withWordmark fixedEmerald />
          </div>
          <p className="text-muted-foreground text-xs font-medium">{subtitle}</p>
        </div>

        {panel === 'forgot-email' ? (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-border bg-background/90 p-4 space-y-3 text-left">
              <div className="flex items-start gap-2 text-foreground text-xs font-semibold">
                <HelpCircle className="w-4 h-4 accent-solid-text shrink-0 mt-0.5" />
                We cannot look up your email from a name alone
              </div>
              <ul className="text-[11px] text-muted-foreground leading-relaxed space-y-2 list-disc pl-4">
                <li>
                  Try <strong className="text-foreground">Forgot password</strong> with each email you might have used — if an account exists, you get a reset link (we never reveal whether an address is registered beyond that email).
                </li>
                <li>
                  If you signed up with <strong className="text-foreground">GitHub</strong>, use Continue with GitHub on the sign-in screen instead.
                </li>
                <li>
                  Still stuck? Email support with any clue (approx. signup date, university address, GitHub username) and we can help from the inbox.
                </li>
              </ul>
            </div>

            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent('Fios — forgot sign-in email')}`}
              className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" /> Contact support · {supportEmail}
            </a>

            <button
              type="button"
              onClick={() => goPanel('forgot-password')}
              className="w-full py-2.5 text-xs font-mono text-emerald-400 hover:underline cursor-pointer"
            >
              I remember my email — reset password
            </button>
          </div>
        ) : (
          <>
            {panel === 'auth' && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleGithubLogin()}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-background/90 hover:bg-secondary border border-border rounded-xl text-foreground text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-foreground" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.1 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
                  </svg>
                  Continue with GitHub
                </button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-mono tracking-widest">or email</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && panel === 'auth' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="w-full px-4 py-3 bg-background/90 border border-border rounded-xl text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.ie"
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-background/90 border border-border rounded-xl text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {panel === 'auth' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground">Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => goPanel('forgot-password')}
                        className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
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
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className="w-full pl-4 pr-10 py-3 bg-background/90 border border-border rounded-xl text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
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
                ) : panel === 'forgot-password' ? (
                  'Send reset link ↵'
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" /> Create Account ↵
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In to Dashboard ↵
                  </>
                )}
              </motion.button>
            </form>
          </>
        )}

        <div className="text-center pt-2 border-t border-border/80 space-y-2">
          {panel !== 'auth' ? (
            <button
              onClick={() => goPanel('auth')}
              className="text-xs font-mono text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsSignUp((v) => !v);
                  setError(null);
                  setNotice(null);
                }}
                className="text-xs font-mono text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
              {!isSignUp && (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-mono text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => goPanel('forgot-password')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => goPanel('forgot-email')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Forgot email?
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;
