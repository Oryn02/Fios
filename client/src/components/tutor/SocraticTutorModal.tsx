import React, { useState } from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { socraticTutor } from '../../services/studyApi';
import { toast } from '../../lib/toast';

interface Props {
  open: boolean;
  onClose: () => void;
  cardFront: string;
  cardBack: string;
}

type Msg = { role: 'user' | 'assistant'; content: string };

export const SocraticTutorModal: React.FC<Props> = ({ open, onClose, cardFront, cardBack }) => {
  useBodyScrollLock(open, '[data-modal-scroll]');
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const send = async (message?: string) => {
    const text = (message ?? input).trim();
    if (!text && history.length > 0) return;
    const nextHistory = text
      ? [...history, { role: 'user' as const, content: text }]
      : history;
    setBusy(true);
    setInput('');
    try {
      const res = await socraticTutor({
        cardFront,
        cardBack,
        question: cardFront,
        answer: cardBack,
        history: nextHistory,
        message: text || 'Start tutoring me with leading questions. Do not reveal the final answer.',
      });
      const reply = res.reply || res.message || res.text || 'What do you already know about this topic?';
      setHistory([...nextHistory, { role: 'assistant', content: String(reply) }]);
    } catch (e: any) {
      toast(e?.message || 'Tutor unavailable', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg max-h-[85dvh] flex flex-col rounded-2xl border fios-border bg-[var(--fios-surface)] overflow-hidden"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 border-b fios-border px-4 py-3">
          <div>
            <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">Socratic</p>
            <h3 className="text-sm font-black uppercase text-[var(--fios-text)] flex items-center gap-2">
              <MessageCircle className="w-4 h-4 accent-solid-text" /> Tutor Me
            </h3>
          </div>
          <button type="button" onClick={onClose} className="touch-target text-[var(--fios-text-muted)] cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div data-modal-scroll className="flex-1 min-h-0 overflow-y-auto scroll-touch p-4 space-y-3">
          <p className="text-[11px] text-[var(--fios-text-muted)] border fios-border rounded-lg p-2 bg-[var(--fios-surface-2)]">
            Card: <span className="text-[var(--fios-text)]">{cardFront.slice(0, 160)}</span>
          </p>
          {history.length === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void send('Start')}
              className="text-xs font-bold uppercase accent-solid-text cursor-pointer"
            >
              Start session →
            </button>
          )}
          {history.map((m, i) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[var(--fios-surface-2)] border fios-border ml-6 text-[var(--fios-text)]'
                  : 'bg-emerald-500/10 border border-emerald-500/20 mr-4 text-[var(--fios-text)]'
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
        <form
          className="shrink-0 border-t fios-border p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer or question…"
            className="flex-1 p-2.5 rounded-xl bg-[var(--fios-surface-2)] border fios-border text-xs text-[var(--fios-text)] focus:outline-none focus:accent-border"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-3 py-2 accent-bg text-slate-950 rounded-xl cursor-pointer disabled:opacity-40"
            aria-label="Send"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SocraticTutorModal;
