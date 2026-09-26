import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Lock, ExternalLink, Check, Loader2, X, HelpCircle, GitBranch } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAiAuth } from '../context/AiAuthContext';
import { validateGeminiKey } from '../services/aiApi';

const AI_STUDIO_URL = 'https://aistudio.google.com/app/apikey';

export function useHasGeminiKey(): boolean {
  const { profile } = useProfile();
  return !!(profile?.gemini_api_key && profile.gemini_api_key.trim());
}

/** Modal to enter + validate a Gemini key, saved to the profile. */
export const GeminiKeyModal: React.FC<{ onClose: () => void; onSaved?: () => void }> = ({ onClose, onSaved }) => {
  const { updateProfile } = useProfile();
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const test = async () => {
    if (!key.trim()) return;
    setStatus('testing');
    const ok = await validateGeminiKey(key.trim());
    setStatus(ok ? 'valid' : 'invalid');
  };

  const save = async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ gemini_api_key: key.trim() });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save key:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="relative z-10 w-full max-w-md rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 shadow-2xl space-y-4"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl accent-bg flex items-center justify-center text-slate-950">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[var(--fios-text)]">Gemini API Key Required</h3>
            <p className="text-xs text-[var(--fios-text-muted)]">Bring your own key — it stays private to your account.</p>
          </div>
        </div>

        {/* Walkthrough Toggle */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" /> {showGuide ? 'Hide Guide' : 'How to get a key'}
          </button>
        </div>

        {/* Step-by-Step Guide Box */}
        {showGuide && (
          <div className="p-3.5 rounded-xl bg-[var(--fios-surface-2)] border fios-border space-y-2.5 text-xs">
            <p className="font-bold text-[var(--fios-text)]">Quick Setup Guide:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-[var(--fios-text-muted)]">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <div>
                  <p>Open Google AI Studio:</p>
                  <a href={AI_STUDIO_URL} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-mono mt-0.5">
                    Open AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2 text-[var(--fios-text-muted)]">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <p>Sign in and click <strong className="text-[var(--fios-text)]">"Create API Key"</strong>.</p>
              </div>
              <div className="flex items-start gap-2 text-[var(--fios-text-muted)]">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <p>Copy string starting with <code className="text-cyan-400 font-mono">AIzaSy...</code> and paste below.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setStatus('idle'); }}
            placeholder="AIza…"
            className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
          />
          {status === 'valid' && <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Key is valid</p>}
          {status === 'invalid' && <p className="text-[11px] font-bold text-rose-400">Key could not be validated. Check and try again.</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={test}
            disabled={!key.trim() || status === 'testing'}
            className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {status === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Test
          </button>
          <button
            onClick={save}
            disabled={!key.trim() || saving}
            className="flex-1 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Key & Unlock'}
          </button>
        </div>

        <a
          href={AI_STUDIO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-mono text-[var(--fios-text-muted)] hover:accent-solid-text transition-colors"
        >
          Get a free key at Google AI Studio <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    </div>
  );
};

/** Wrap an AI feature. Auth guard first, then Gemini key gate. */
export const GeminiGate: React.FC<{ feature: string; children: React.ReactNode }> = ({ feature, children }) => {
  const hasKey = useHasGeminiKey();
  const { allowed, openLock } = useAiAuth();
  const [open, setOpen] = useState(false);

  if (!allowed) {
    return (
      <div className="max-w-lg mx-auto my-10 text-center rounded-2xl border fios-border bg-[var(--fios-surface)] p-8 space-y-4">
        <div className="w-14 h-14 rounded-2xl accent-bg flex items-center justify-center text-slate-950 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-[var(--fios-text)]">{feature} is locked in the live demo</h3>
          <p className="text-sm text-[var(--fios-text-muted)]">
            AI features and cloud generation need a signed-in account. Sign in with GitHub to unlock Fios v2.2.1.
          </p>
        </div>
        <button
          type="button"
          onClick={openLock}
          className="px-5 py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl transition-transform active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
        >
          <GitBranch className="w-4 h-4" /> Sign In with GitHub
        </button>
      </div>
    );
  }

  if (hasKey) return <>{children}</>;

  return (
    <>
      <div className="max-w-lg mx-auto my-10 text-center rounded-2xl border fios-border bg-[var(--fios-surface)] p-8 space-y-4 accent-glow">
        <div className="w-14 h-14 rounded-2xl accent-bg flex items-center justify-center text-slate-950 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-[var(--fios-text)]">{feature} needs your Gemini key</h3>
          <p className="text-sm text-[var(--fios-text-muted)]">
            Fios is privacy-first: plug in your own free Gemini API key to unlock AI features. It's stored on your profile and never shared.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl transition-transform active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4" /> Add Gemini Key
        </button>
      </div>
      <AnimatePresence>{open && <GeminiKeyModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
};

export default GeminiGate;