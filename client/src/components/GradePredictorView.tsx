import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Target, Plus, Trash2, TrendingUp, Award, Folder, Loader2 } from 'lucide-react';
import { getGrades, saveGrade, updateGrade, deleteGrade } from '../lib/gradeService';
import { getUserModules, type DBModule } from '../lib/moduleService';
import type { Grade } from '../types/db';
import { formatCleanNumber, parseCleanNumber } from '../lib/parseNumber';
import { toast } from '../lib/toast';
import { ModulePicker } from './ModulePicker';
import { SemesterGpaPanel } from './SemesterGpaPanel';

interface ModulePrediction {
  module: string;
  current: number;
  gradedWeight: number;
  remainingWeight: number;
  target: number;
  requiredAvg: number | null;
  status: 'achieved' | 'onTrack' | 'impossible' | 'pending';
}

function predict(grades: Grade[]): ModulePrediction[] {
  const byModule = new Map<string, Grade[]>();
  for (const g of grades) {
    const key = g.module_code || 'General';
    byModule.set(key, [...(byModule.get(key) || []), g]);
  }

  const out: ModulePrediction[] = [];
  for (const [module, items] of byModule) {
    const target = items[0]?.target_grade ?? 40;
    let current = 0;
    let gradedWeight = 0;
    let remainingWeight = 0;
    for (const it of items) {
      const w = Number(it.weight) || 0;
      if (it.score !== null && it.score !== undefined) {
        current += (w / 100) * Number(it.score);
        gradedWeight += w;
      } else {
        remainingWeight += w;
      }
    }
    let requiredAvg: number | null = null;
    let status: ModulePrediction['status'] = 'pending';
    if (remainingWeight === 0) {
      status = current >= target ? 'achieved' : 'impossible';
    } else {
      requiredAvg = ((target - current) / (remainingWeight / 100));
      if (requiredAvg <= 0) status = 'achieved';
      else if (requiredAvg > 100) status = 'impossible';
      else status = 'onTrack';
    }
    out.push({
      module,
      current: Math.round(current * 10) / 10,
      gradedWeight,
      remainingWeight,
      target,
      requiredAvg,
      status,
    });
  }
  return out;
}

const STATUS_STYLE: Record<ModulePrediction['status'], { label: string; cls: string }> = {
  achieved: { label: 'On target', cls: 'text-emerald-400' },
  onTrack: { label: 'Achievable', cls: 'text-cyan-400' },
  impossible: { label: 'At risk', cls: 'text-rose-400' },
  pending: { label: 'No data', cls: 'text-slate-400' },
};

export const GradePredictorView: React.FC = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [modules, setModules] = useState<DBModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [title, setTitle] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [weightStr, setWeightStr] = useState('20');
  const [scoreStr, setScoreStr] = useState('');
  const [targetStr, setTargetStr] = useState('60');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, m] = await Promise.all([getGrades(), getUserModules()]);
      setGrades(g);
      setModules(m);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load assessments';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const predictions = useMemo(() => predict(grades), [grades]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;

    const weight = parseCleanNumber(weightStr, null);
    const scoreParsed = scoreStr.trim() === '' ? null : parseCleanNumber(scoreStr, null);
    const target = parseCleanNumber(targetStr, null);

    if (weight === null || !Number.isFinite(weight)) {
      toast('Enter a valid weight %', 'error');
      return;
    }
    if (scoreStr.trim() !== '' && (scoreParsed === null || !Number.isFinite(scoreParsed))) {
      toast('Enter a valid score % (or leave blank)', 'error');
      return;
    }
    if (target === null || !Number.isFinite(target)) {
      toast('Enter a valid target grade %', 'error');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveGrade({
        title: title.trim(),
        module_code: moduleCode || null,
        weight,
        score: scoreParsed,
        target_grade: target,
      });
      setGrades((prev) => [...prev, saved]);
      setTitle('');
      setScoreStr('');
      setWeightStr('20');
      setTargetStr(formatCleanNumber(target));
      setAdding(false);
      toast('Assessment saved', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save assessment';
      toast(msg || 'Could not save assessment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleScore = async (g: Grade, value: string) => {
    const trimmed = value.trim();
    const newScore = trimmed === '' ? null : parseCleanNumber(value, null);
    if (trimmed !== '' && (newScore === null || !Number.isFinite(newScore))) {
      toast('Enter a valid score %', 'error');
      return;
    }
    const prev = g.score;
    setGrades((prevGrades) => prevGrades.map((x) => (x.id === g.id ? { ...x, score: newScore } : x)));
    try {
      await updateGrade(g.id, { score: newScore });
    } catch (err: unknown) {
      setGrades((prevGrades) => prevGrades.map((x) => (x.id === g.id ? { ...x, score: prev } : x)));
      const msg = err instanceof Error ? err.message : 'Could not update score';
      toast(msg, 'error');
    }
  };

  const handleWeight = async (g: Grade, value: string) => {
    const w = parseCleanNumber(value, null);
    if (w === null || !Number.isFinite(w)) {
      toast('Enter a valid weight %', 'error');
      return;
    }
    const prev = g.weight;
    setGrades((prevGrades) => prevGrades.map((x) => (x.id === g.id ? { ...x, weight: w } : x)));
    try {
      await updateGrade(g.id, { weight: w });
    } catch (err: unknown) {
      setGrades((prevGrades) => prevGrades.map((x) => (x.id === g.id ? { ...x, weight: prev } : x)));
      const msg = err instanceof Error ? err.message : 'Could not update weight';
      toast(msg, 'error');
    }
  };

  const handleTarget = async (g: Grade, value: string) => {
    const t = parseCleanNumber(value, null);
    if (t === null || !Number.isFinite(t)) {
      toast('Enter a valid target grade %', 'error');
      return;
    }
    const prevById = new Map(grades.map((x) => [x.id, x.target_grade]));
    setGrades((prev) =>
      prev.map((x) => (x.module_code === g.module_code ? { ...x, target_grade: t } : x))
    );
    // Persist on all assessments in the module so prediction stays consistent
    const siblings = grades.filter((x) => x.module_code === g.module_code);
    try {
      await Promise.all(siblings.map((s) => updateGrade(s.id, { target_grade: t })));
    } catch (err: unknown) {
      setGrades((prev) =>
        prev.map((x) =>
          x.module_code === g.module_code
            ? { ...x, target_grade: prevById.get(x.id) ?? x.target_grade }
            : x
        )
      );
      const msg = err instanceof Error ? err.message : 'Could not update target';
      toast(msg, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const removed = grades.find((g) => g.id === id);
    setGrades((prev) => prev.filter((g) => g.id !== id));
    try {
      await deleteGrade(id);
    } catch (err: unknown) {
      if (removed) setGrades((prev) => [...prev, removed]);
      const msg = err instanceof Error ? err.message : 'Could not delete assessment';
      toast(msg, 'error');
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of grades) {
      const key = g.module_code || 'General';
      map.set(key, [...(map.get(key) || []), g]);
    }
    return [...map.entries()];
  }, [grades]);

  const moduleLabel = (code: string) => {
    if (code === 'General') return 'General';
    const m = modules.find((x) => x.code === code);
    return m ? m.name : code;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-[var(--fios-text)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 accent-solid-text" /> Grade Predictor
          </h2>
          <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
            Track assessment weights and see the scores you need to hit your target grade.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="px-4 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Assessment
        </button>
      </div>

      <SemesterGpaPanel grades={grades} modules={modules} />

      {adding && (
        <form onSubmit={handleAdd} className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assessment name"
              required
              className="lg:col-span-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border"
            />
            <ModulePicker value={moduleCode} onChange={setModuleCode} />
            <label className="flex items-center gap-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2.5 py-2 text-xs text-[var(--fios-text-muted)]">
              Weight%
              <input
                inputMode="decimal"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={() => setWeightStr(formatCleanNumber(parseCleanNumber(weightStr, 0) ?? 0))}
                className="w-full bg-transparent text-[var(--fios-text)] focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2.5 py-2 text-xs text-[var(--fios-text-muted)]">
              Score%
              <input
                inputMode="decimal"
                value={scoreStr}
                onChange={(e) => setScoreStr(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={() => {
                  if (scoreStr.trim() === '') return;
                  setScoreStr(formatCleanNumber(parseCleanNumber(scoreStr, null)));
                }}
                placeholder="—"
                className="w-full bg-transparent text-[var(--fios-text)] focus:outline-none"
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
              Target final grade %
              <input
                inputMode="decimal"
                value={targetStr}
                onChange={(e) => setTargetStr(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={() => setTargetStr(formatCleanNumber(parseCleanNumber(targetStr, 40) ?? 40))}
                className="w-20 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2 py-1 text-[var(--fios-text)] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--fios-text-muted)]" /></div>
      ) : grades.length === 0 ? (
        <div className="rounded-2xl border border-dashed fios-border p-10 text-center space-y-2">
          <Award className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-xs font-bold uppercase text-[var(--fios-text-muted)]">No assessments tracked yet</p>
          <p className="text-[11px] font-mono text-slate-500">Add your CAs and exams with their weights to predict required scores.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([module, items]) => {
            const p = predictions.find((x) => x.module === module)!;
            const s = STATUS_STYLE[p.status];
            return (
              <div key={module} className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b fios-border pb-3">
                  <h3 className="text-sm font-black uppercase flex items-center gap-2">
                    <Folder className="w-4 h-4 accent-solid-text" /> {moduleLabel(module)}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-[var(--fios-text-muted)]">
                      Earned: <span className="text-[var(--fios-text)] font-bold">{formatCleanNumber(p.current)}%</span>
                    </span>
                    <label className="flex items-center gap-1 text-[var(--fios-text-muted)]">
                      Target:
                      <input
                        inputMode="decimal"
                        defaultValue={formatCleanNumber(p.target)}
                        key={`t-${module}-${p.target}`}
                        onBlur={(e) => void handleTarget(items[0], e.target.value)}
                        className="w-14 bg-[var(--fios-surface-2)] border fios-border rounded px-1.5 py-0.5 text-[var(--fios-text)] focus:outline-none"
                      />
                    </label>
                    <span className={`font-black uppercase ${s.cls}`}>{s.label}</span>
                  </div>
                </div>

                {p.requiredAvg !== null && p.status !== 'achieved' && (
                  <div className={`flex items-center gap-2 text-sm font-bold ${p.status === 'impossible' ? 'text-rose-300' : 'text-cyan-300'}`}>
                    <TrendingUp className="w-4 h-4" />
                    {p.status === 'impossible'
                      ? `Target not reachable — max possible is ${formatCleanNumber(Math.round((p.current + p.remainingWeight) * 10) / 10)}%.`
                      : `Need an average of ${formatCleanNumber(Math.round(p.requiredAvg! * 10) / 10)}% across remaining assessments (${formatCleanNumber(p.remainingWeight)}% weight).`}
                  </div>
                )}

                <div className="space-y-2">
                  {items.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm truncate">{g.title}</span>
                      <input
                        inputMode="decimal"
                        defaultValue={formatCleanNumber(g.weight)}
                        onBlur={(e) => void handleWeight(g, e.target.value)}
                        className="w-14 bg-[var(--fios-surface)] border fios-border rounded px-2 py-1 text-[10px] font-mono text-[var(--fios-text)] focus:outline-none text-center"
                        aria-label="Weight %"
                        title="Weight %"
                      />
                      <span className="text-[10px] text-[var(--fios-text-muted)]">%</span>
                      <input
                        inputMode="decimal"
                        defaultValue={g.score == null ? '' : formatCleanNumber(g.score)}
                        placeholder="—"
                        onBlur={(e) => void handleScore(g, e.target.value)}
                        className="w-16 bg-[var(--fios-surface)] border fios-border rounded px-2 py-1 text-xs text-[var(--fios-text)] focus:outline-none text-center"
                        aria-label="Score %"
                      />
                      <button type="button" onClick={() => void handleDelete(g.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradePredictorView;
