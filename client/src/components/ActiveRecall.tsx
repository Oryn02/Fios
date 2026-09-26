import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Loader2, Timer, Sparkles, Check, AlertTriangle, XCircle, Folder } from 'lucide-react';
import { evaluateRecall, type RecallResult } from '../services/aiApi';
import { getDocuments } from '../lib/documentService';
import { saveRecallLog } from '../lib/activeRecallService';
import type { DBModule, RecallConcept } from '../types/db';
import { useHasGeminiKey, GeminiKeyModal } from './GeminiGate';
import { useAiAuth } from '../context/AiAuthContext';

interface Props {
  modules: DBModule[];
  initialModule?: string;
  onClose: () => void;
}

const STATUS_STYLE: Record<RecallConcept['status'], { icon: React.ReactNode; cls: string; label: string }> = {
  covered: { icon: <Check className="w-4 h-4" />, cls: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300', label: 'Covered' },
  partial: { icon: <AlertTriangle className="w-4 h-4" />, cls: 'bg-amber-500/10 border-amber-500/40 text-amber-300', label: 'Vague' },
  missed: { icon: <XCircle className="w-4 h-4" />, cls: 'bg-rose-500/10 border-rose-500/40 text-rose-300', label: 'Missed' },
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ActiveRecall: React.FC<Props> = ({ modules, initialModule = '', onClose }) => {
  const hasKey = useHasGeminiKey();
  const { requireAiAuth } = useAiAuth();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [moduleCode, setModuleCode] = useState(initialModule);
  const [text, setText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<RecallResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const wordCount = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  const handleEvaluate = async () => {
    if (!text.trim()) return;
    if (!requireAiAuth()) return;
    if (!hasKey) { setShowKeyModal(true); return; }
    setRunning(false);
    setEvaluating(true);
    setError(null);
    try {
      const docs = await getDocuments();
      const context = docs
        .filter((d) => !moduleCode || d.module_code === moduleCode)
        .map((d) => `${d.title}\n${d.summary || d.content}`)
        .join('\n\n')
        .slice(0, 6000);
      const res = await evaluateRecall(topic || 'this topic', text, context);
      setResult(res);
      await saveRecallLog({
        topic: topic || 'Untitled topic',
        moduleCode: moduleCode || null,
        accuracy: res.accuracy,
        content: text,
        report: res.concepts as RecallConcept[],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate recall.');
      setRunning(true);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-3xl max-h-[92dvh] overflow-y-auto scroll-touch rounded-2xl border fios-border bg-[var(--fios-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b fios-border flex flex-wrap items-center gap-3 sticky top-0 bg-[var(--fios-surface)] z-10">
          <div className="w-9 h-9 rounded-xl accent-bg flex items-center justify-center text-slate-950"><Brain className="w-5 h-5" /></div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-sm font-black text-[var(--fios-text)]">Active Recall · Blurting</p>
            <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">Write everything you remember, then let AI grade it.</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs font-mono font-bold text-[var(--fios-text)]">
            <Timer className="w-3.5 h-3.5 accent-solid-text" /> {fmt(seconds)}
          </div>
          <button onClick={onClose} className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {!result ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. C Pointers)"
                  className="bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3.5 py-2.5 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
                <div className="flex items-center gap-1.5 bg-[var(--fios-surface-2)] border fios-border rounded-xl px-2.5 py-2">
                  <Folder className="w-3.5 h-3.5 accent-solid-text shrink-0" />
                  <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="bg-transparent text-sm text-[var(--fios-text)] focus:outline-none cursor-pointer w-full">
                    <option value="">No module</option>
                    {modules.map((m) => <option key={m.id} value={m.code}>{m.code}</option>)}
                  </select>
                </div>
              </div>

              <textarea
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start blurting — write down everything you can recall about this topic…"
                className="w-full h-64 p-4 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-[var(--fios-text)] placeholder:text-slate-500 focus:outline-none focus:accent-border text-sm leading-relaxed resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[var(--fios-text-muted)]">{wordCount} words</span>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleEvaluate} disabled={evaluating || !text.trim()}
                  className="px-5 py-2.5 accent-bg text-slate-950 font-black italic uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-40">
                  {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {evaluating ? 'Evaluating…' : 'Evaluate Recall'}
                </motion.button>
              </div>
              {error && <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-xs font-mono rounded-r-lg">{error}</div>}
            </>
          ) : (
            <div className="space-y-4">
              {/* Accuracy */}
              <div className="rounded-2xl border fios-border bg-[var(--fios-surface-2)] p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">Recall Accuracy</p>
                  <p className="text-4xl font-black text-[var(--fios-text)]">{result.accuracy}<span className="text-lg text-[var(--fios-text-muted)]">%</span></p>
                </div>
                <div className="w-24 h-24 rounded-full flex items-center justify-center accent-ring">
                  <div className="text-xs font-mono text-[var(--fios-text-muted)] text-center">
                    {result.concepts.filter((c) => c.status === 'covered').length}/{result.concepts.length}<br />covered
                  </div>
                </div>
              </div>

              {/* Color-coded report */}
              <div className="space-y-2">
                {result.concepts.map((c, i) => {
                  const st = STATUS_STYLE[c.status] || STATUS_STYLE.missed;
                  return (
                    <div key={i} className={`rounded-xl border p-3 flex items-start gap-2.5 ${st.cls}`}>
                      <span className="mt-0.5 shrink-0">{st.icon}</span>
                      <div>
                        <p className="text-sm font-bold">{c.concept} <span className="text-[10px] font-mono uppercase opacity-70">· {st.label}</span></p>
                        {c.note && <p className="text-xs opacity-90 mt-0.5">{c.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setResult(null); setText(''); setSeconds(0); setRunning(true); }}
                  className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-lg cursor-pointer">Try Again</button>
                <button onClick={onClose} className="px-5 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer">Done</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>{showKeyModal && <GeminiKeyModal onClose={() => setShowKeyModal(false)} onSaved={() => setShowKeyModal(false)} />}</AnimatePresence>
    </div>
  );
};

export default ActiveRecall;
