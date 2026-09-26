import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, FileText, Timer, Bot, X, Layers, Check, Loader2, Folder } from 'lucide-react';
import { usePomodoroControls } from '../context/PomodoroContext';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/demo';
import { getUserModules, type DBModule } from '../lib/moduleService';

interface QuickActionsProps {
  onNavigate: (tab: string, options?: { openTutor?: boolean }) => void;
  onOpenTutor?: () => void;
}

const QuickAddFlashcardModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [title, setTitle] = useState('Quick Deck');
  const [moduleCode, setModuleCode] = useState('');
  const [modules, setModules] = useState<DBModule[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => { getUserModules().then(setModules).catch(() => setModules([])); }, []);

  const save = async () => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (!IS_DEMO) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Authentication required.');
        const { data: deck, error: deckErr } = await supabase
          .from('decks')
          .insert({ user_id: user.id, title: title.trim() || 'Quick Deck', module_code: moduleCode || null })
          .select().single();
        if (deckErr || !deck) throw new Error(deckErr?.message || 'Failed to create deck.');
        const { error: cardErr } = await supabase.from('cards').insert({ deck_id: deck.id, question: front.trim(), answer: back.trim() });
        if (cardErr) throw new Error(cardErr.message);
      }
      setDone(true);
      setTimeout(onClose, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to save card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-[var(--fios-text)] flex items-center gap-2"><Layers className="w-4 h-4 accent-solid-text" /> Quick Add Flashcard</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {done ? (
          <div className="py-6 text-center text-emerald-400 font-bold flex flex-col items-center gap-2"><Check className="w-8 h-8" /> Saved!</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deck title"
                className="bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
              <div className="flex items-center gap-1.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2.5 py-2">
                <Folder className="w-3.5 h-3.5 accent-solid-text shrink-0" />
                <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="bg-transparent text-sm text-[var(--fios-text)] focus:outline-none cursor-pointer w-full">
                  <option value="">General</option>
                  {modules.map((m) => <option key={m.id} value={m.code}>{m.code}</option>)}
                </select>
              </div>
            </div>
            <textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front (question / term)…"
              className="w-full h-20 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
            <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back (answer / definition)…"
              className="w-full h-20 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
            {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}
            <button onClick={save} disabled={saving || !front.trim() || !back.trim()}
              className="w-full py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Card
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate, onOpenTutor }) => {
  const { start } = usePomodoroControls();
  const [open, setOpen] = useState(false);
  const [showFlashcard, setShowFlashcard] = useState(false);

  const handleAskAI = () => {
    setOpen(false);
    if (onOpenTutor) {
      onOpenTutor();
    } else {
      onNavigate('tutor');
    }
  };

  const actions = [
    { icon: Zap, label: 'Quick Add Flashcard', onClick: () => { setShowFlashcard(true); setOpen(false); } },
    { icon: FileText, label: 'New Note', onClick: () => { onNavigate('documents'); setOpen(false); } },
    { icon: Timer, label: 'Start Pomodoro', onClick: () => { start(); onNavigate('timer'); setOpen(false); } },
    { icon: Bot, label: 'Ask AI', onClick: handleAskAI },
  ];

  return (
    <>
      {/* Click-outside backdrop when floating menu is open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      <div className="hidden md:flex fixed bottom-6 right-6 z-[60] flex-col items-end gap-2.5 safe-bottom font-sans">
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} className="flex flex-col gap-2 items-end">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <motion.button
                    key={a.label}
                    whileHover={{ x: -3 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={a.onClick}
                    className="flex items-center gap-2.5 pl-4 pr-3.5 py-2.5 rounded-xl border fios-border bg-[var(--fios-surface)] shadow-2xl text-[var(--fios-text)] text-xs font-bold cursor-pointer hover:bg-[var(--fios-surface-2)] transition-colors"
                  >
                    {a.label}
                    <span className="w-6 h-6 rounded-lg accent-bg flex items-center justify-center text-slate-950"><Icon className="w-3.5 h-3.5" /></span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 rounded-2xl accent-bg text-slate-950 shadow-2xl accent-glow cursor-pointer flex items-center justify-center"
          aria-label="Quick actions"
        >
          <motion.span animate={{ rotate: open ? 45 : 0 }} className="block"><Plus className="w-6 h-6" /></motion.span>
        </motion.button>
      </div>

      <AnimatePresence>{showFlashcard && <QuickAddFlashcardModal onClose={() => setShowFlashcard(false)} />}</AnimatePresence>
    </>
  );
};

export default QuickActions;