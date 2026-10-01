import React, { useCallback, useState } from 'react';
import { Mic, Send, Loader2, Sparkles } from 'lucide-react';
import { oralExamTurn } from '../../services/saasAiApi';
import { toast } from '../../lib/toast';

type Msg = { role: 'examiner' | 'student'; text: string; score?: number; feedback?: string };

interface MockOralExamProps {
  material: string;
  onClose?: () => void;
}

export const MockOralExam: React.FC<MockOralExamProps> = ({ material, onClose }) => {
  const [history, setHistory] = useState<Msg[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [rubric, setRubric] = useState('');

  const startOrContinue = useCallback(
    async (studentAnswer?: string) => {
      if (!material.trim()) {
        toast('Add study material first', 'error');
        return;
      }
      setLoading(true);
      try {
        const turn = await oralExamTurn({
          material,
          history: history.map((h) => ({ role: h.role, text: h.text })),
          studentAnswer,
        });
        const next: Msg[] = [...history];
        if (studentAnswer) {
          next.push({
            role: 'student',
            text: studentAnswer,
            score: turn.score,
            feedback: turn.feedback,
          });
        }
        next.push({ role: 'examiner', text: turn.question });
        setHistory(next);
        setRubric(turn.rubricHint || '');
        setAnswer('');
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Oral exam failed', 'error');
      } finally {
        setLoading(false);
      }
    },
    [history, material]
  );

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 md:p-5 space-y-4 shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
            <Mic className="w-5 h-5 accent-solid-text" /> Mock Oral Exam
          </h3>
          <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
            Viva-style practice · Gemini Flash / Pro
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs font-mono text-[var(--fios-text-muted)] cursor-pointer">
            Close
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => startOrContinue()}
          className="w-full py-3 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Start examiner
        </button>
      ) : (
        <>
          <div className="space-y-3 max-h-72 overflow-y-auto scroll-touch">
            {history.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed border fios-border ${
                  m.role === 'examiner' ? 'bg-[var(--fios-surface-2)]' : 'bg-[var(--fios-surface)] ml-4'
                }`}
              >
                <p className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)] mb-1">
                  {m.role === 'examiner' ? 'Examiner' : 'You'}
                  {typeof m.score === 'number' && m.score > 0 ? ` · ${m.score}/100` : ''}
                </p>
                <p className="text-[var(--fios-text)]">{m.text}</p>
                {m.feedback ? (
                  <p className="mt-1.5 text-[11px] text-[var(--fios-text-muted)]">{m.feedback}</p>
                ) : null}
              </div>
            ))}
          </div>
          {rubric ? (
            <p className="text-[10px] font-mono text-[var(--fios-text-muted)] border-l-2 accent-border pl-2">
              Rubric hint: {rubric}
            </p>
          ) : null}
          <div className="flex gap-2">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder="Speak your answer here…"
              className="flex-1 p-3 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border"
            />
            <button
              type="button"
              disabled={loading || !answer.trim()}
              onClick={() => startOrContinue(answer.trim())}
              className="px-3 accent-bg text-slate-950 rounded-xl cursor-pointer disabled:opacity-50 self-end"
              aria-label="Submit answer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
