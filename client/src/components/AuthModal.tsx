import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Flares */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0e131f]/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-emerald-500/10 border-l-2 border-emerald-400 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            ACADEMIC COMMAND CENTER
          </div>
          <h1 className="text-3xl font-black italic tracking-tight text-white uppercase">
            FIOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">STUDIO</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            {isSignUp ? 'Create your student account to sync decks' : 'Sign in to access your modules & study tools'}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.ie"
              className="w-full px-4 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 bg-[#07090e]/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-300 text-[11px] font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" /> Create Account ↵
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In to Dashboard ↵
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};