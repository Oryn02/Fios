import React, { useCallback, useState } from 'react';
import { ClipboardList, Loader2, Download } from 'lucide-react';
import { saasFetch, readJson } from '../../services/saasFetch';
import { toast } from '../../lib/toast';

type MockQ = {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  topic?: string;
  points?: number;
};

type GradeResult = {
  overallPercent?: number;
  summary?: string;
  weakTopics?: { topic: string; severity: string; note: string }[];
  rubric?: { questionId: string; score: number; maxPoints: number; feedback: string }[];
};

/**
 * Full-length AI mock exam — generate → answer → diagnostic scorecard.
 */
export const MockExamView: React.FC<{ defaultModule?: string }> = ({ defaultModule = '' }) => {
  const [moduleCode, setModuleCode] = useState(defaultModule);
  const [durationMin, setDurationMin] = useState(90);
  const [exam, setExam] = useState<{ title?: string; examId?: string; questions?: MockQ[] } | null>(
    null
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = useCallback(async () => {
    if (!moduleCode.trim()) {
      toast('Enter a module code', 'info');
      return;
    }
    setBusy(true);
    setGrade(null);
    try {
      const res = await saasFetch('/api/exam/mock-generate', {
        method: 'POST',
        body: JSON.stringify({ moduleCode: moduleCode.trim(), durationMin }),
      });
      const data = await readJson<any>(res);
      setExam(data);
      setAnswers({});
      toast('Mock exam ready', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Generate failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [moduleCode, durationMin]);

  const submit = useCallback(async () => {
    if (!exam?.questions?.length) return;
    setBusy(true);
    try {
      const res = await saasFetch('/api/exam/mock-grade', {
        method: 'POST',
        body: JSON.stringify({
          examId: exam.examId,
          exam,
          answers,
        }),
      });
      const data = await readJson<GradeResult>(res);
      setGrade(data);
      toast('Graded — see Diagnostic Scorecard', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Grade failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [exam, answers]);

  return (
    <div className="space-y-4">
      <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <ClipboardList className="w-4 h-4 accent-solid-text" /> AI Mock Exam
        </h3>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs space-y-1">
            <span className="text-[var(--fios-text-muted)]">Module</span>
            <input
              value={moduleCode}
              onChange={(e) => setModuleCode(e.target.value)}
              className="block w-36 px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-sm"
              placeholder="COMP301"
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-[var(--fios-text-muted)]">Minutes</span>
            <input
              type="number"
              min={20}
              max={180}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 90)}
              className="block w-20 px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={generate}
            className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase disabled:opacity-50 cursor-pointer"
          >
            {busy && !exam ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null} Generate
          </button>
        </div>
      </div>

      {exam?.questions && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold">{exam.title || 'Mock Exam'}</h4>
          {exam.questions.map((q, i) => (
            <div key={q.id || i} className="bg-[var(--fios-surface)] border fios-border rounded-xl p-3 space-y-2">
              <p className="text-xs font-mono text-[var(--fios-text-muted)] uppercase">
                {q.type} · {q.topic || 'general'} · {q.points ?? 1} pts
              </p>
              <p className="text-sm font-semibold">{q.prompt}</p>
              {q.type === 'mcq' && Array.isArray(q.options) ? (
                <div className="space-y-1">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-start gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === String(oi)}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(oi) }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={q.type === 'essay' ? 5 : 2}
                  className="w-full px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-sm"
                  placeholder="Your answer…"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="px-4 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer"
          >
            Submit for grading
          </button>
        </div>
      )}

      {grade && (
        <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-black uppercase">Diagnostic Scorecard</h4>
          <p className="text-2xl font-black accent-solid-text">
            {Math.round(grade.overallPercent ?? 0)}%
          </p>
          <p className="text-sm text-[var(--fios-text)]">{grade.summary}</p>
          {grade.weakTopics && grade.weakTopics.length > 0 && (
            <ul className="space-y-1">
              {grade.weakTopics.map((w, i) => (
                <li key={i} className="text-xs">
                  <span className="font-bold uppercase text-[var(--fios-text-muted)]">{w.severity}</span>{' '}
                  <span className="font-semibold">{w.topic}</span> — {w.note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MockExamView;
