import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Trash2, TrendingUp, Award, Folder, Loader2 } from 'lucide-react';
import { getGrades, saveGrade, updateGrade, deleteGrade } from '../lib/gradeService';
import { getUserModules, type DBModule } from '../lib/moduleService';
import type { Grade } from '../types/db';

interface ModulePrediction {
  module: string;
  current: number;       // grade points earned so far (out of 100)
  gradedWeight: number;  // total weight already graded
  remainingWeight: number;
  target: number;
  requiredAvg: number | null; // avg % needed on remaining assessments
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
      if (it.score !== null && it.score !== undefined) {
        current += (it.weight / 100) * it.score;
        gradedWeight += it.weight;
      } else {
        remainingWeight += it.weight;
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
    out.push({ module, current: Math.round(current * 10) / 10, gradedWeight, remainingWeight, target, requiredAvg, status });
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
  const [weight, setWeight] = useState(20);
  const [score, setScore] = useState<string>('');
  const [target, setTarget] = useState(60);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, m] = await Promise.all([getGrades(), getUserModules()]);
      setGrades(g);
      setModules(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const predictions = useMemo(() => predict(grades), [grades]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const saved = await saveGrade({
      title: title.trim(),
      module_code: moduleCode || null,
      weight,
      score: score === '' ? null : Number(score),
      target_grade: target,
    });
    setGrades((prev) => [...prev, saved]);
    setTitle(''); setScore(''); setAdding(false);
  };

  const handleScore = async (g: Grade, value: string) => {
    const newScore = value === '' ? null : Number(value);
    setGrades((prev) => prev.map((x) => (x.id === g.id ? { ...x, score: newScore } : x)));
    await updateGrade(g.id, { score: newScore });
  };

  const handleTarget = async (g: Grade, value: number) => {
    setGrades((prev) => prev.map((x) => (x.module_code === g.module_code ? { ...x, target_grade: value } : x)));
    await updateGrade(g.id, { target_grade: value });
  };

  const handleDelete = async (id: string) => {
    setGrades((prev) => prev.filter((g) => g.id !== id));
    await deleteGrade(id);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of grades) {
      const key = g.module_code || 'General';
      map.set(key, [...(map.get(key) || []), g]);
    }
    return [...map.entries()];
  }, [grades]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-[var(--fios-text)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 accent-solid-text" /> Grade Predictor
          </h2>
          <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">Track assessment weights and see the scores you need to hit your target grade.</p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="px-4 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Assessment
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assessment name" required
              className="lg:col-span-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
            <div className="flex items-center gap-1.5 bg-[#07090e] border fios-border rounded-lg px-2.5 py-2">
              <Folder className="w-3.5 h-3.5 accent-solid-text shrink-0" />
              <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="bg-[#07090e] text-sm text-slate-100 focus:outline-none cursor-pointer w-full">
                <option value="" className="bg-[#07090e] text-slate-100">General</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.code} className="bg-[#07090e] text-slate-100">
                    {m.code}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2.5 py-2 text-xs text-[var(--fios-text-muted)]">
              Weight%
              <input type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full bg-transparent text-[var(--fios-text)] focus:outline-none" />
            </label>
            <label className="flex items-center gap-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2.5 py-2 text-xs text-[var(--fios-text-muted)]">
              Score%
              <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="—" className="w-full bg-transparent text-[var(--fios-text)] focus:outline-none" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
              Target final grade %
              <input type="number" min={0} max={100} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-20 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2 py-1 text-[var(--fios-text)] focus:outline-none" />
            </label>
            <button type="submit" className="px-5 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer">Save</button>
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
                  <h3 className="text-sm font-black uppercase flex items-center gap-2"><Folder className="w-4 h-4 accent-solid-text" /> {module}</h3>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-[var(--fios-text-muted)]">Earned: <span className="text-[var(--fios-text)] font-bold">{p.current}%</span></span>
                    <label className="flex items-center gap-1 text-[var(--fios-text-muted)]">
                      Target:
                      <input type="number" min={0} max={100} value={p.target}
                        onChange={(e) => handleTarget(items[0], Number(e.target.value))}
                        className="w-14 bg-[var(--fios-surface-2)] border fios-border rounded px-1.5 py-0.5 text-[var(--fios-text)] focus:outline-none" />
                    </label>
                    <span className={`font-black uppercase ${s.cls}`}>{s.label}</span>
                  </div>
                </div>

                {p.requiredAvg !== null && p.status !== 'achieved' && (
                  <div className={`flex items-center gap-2 text-sm font-bold ${p.status === 'impossible' ? 'text-rose-300' : 'text-cyan-300'}`}>
                    <TrendingUp className="w-4 h-4" />
                    {p.status === 'impossible'
                      ? `Target not reachable — max possible is ${Math.round((p.current + p.remainingWeight) * 10) / 10}%.`
                      : `Need an average of ${Math.round(p.requiredAvg! * 10) / 10}% across remaining assessments (${p.remainingWeight}% weight).`}
                  </div>
                )}

                <div className="space-y-2">
                  {items.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm truncate">{g.title}</span>
                      <span className="text-[10px] font-mono text-[var(--fios-text-muted)]">{g.weight}%</span>
                      <input type="number" min={0} max={100} value={g.score ?? ''} placeholder="—"
                        onChange={(e) => handleScore(g, e.target.value)}
                        className="w-16 bg-[var(--fios-surface)] border fios-border rounded px-2 py-1 text-xs text-[var(--fios-text)] focus:outline-none text-center" />
                      <button onClick={() => handleDelete(g.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
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