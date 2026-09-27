/**
 * Cumulative semester GPA / classification panel (Irish/ATU-style thresholds).
 */
import React, { useMemo } from 'react';
import { Award, GraduationCap } from 'lucide-react';
import type { Grade } from '../types/db';
import type { DBModule } from '../lib/moduleService';
import { formatCleanNumber } from '../lib/parseNumber';

export interface ModuleMark {
  code: string;
  name: string;
  mark: number;
  weight: number;
}

/** Equal weight per module unless grades imply otherwise — uses current earned % when available. */
export function computeModuleMarks(grades: Grade[], modules: DBModule[]): ModuleMark[] {
  const byModule = new Map<string, Grade[]>();
  for (const g of grades) {
    const key = g.module_code || 'General';
    byModule.set(key, [...(byModule.get(key) || []), g]);
  }

  const marks: ModuleMark[] = [];
  for (const [code, items] of byModule) {
    let earned = 0;
    let gradedWeight = 0;
    for (const it of items) {
      const w = Number(it.weight) || 0;
      if (it.score !== null && it.score !== undefined) {
        earned += (w / 100) * Number(it.score);
        gradedWeight += w;
      }
    }
    if (gradedWeight <= 0) continue;
    // Scale earned to a 0–100 module mark based on graded portion
    const mark = Math.round((earned / (gradedWeight / 100)) * 10) / 10;
    const mod = modules.find((m) => m.code === code);
    marks.push({
      code,
      name: mod?.name || code,
      mark,
      weight: 1,
    });
  }
  return marks;
}

export type HonorsBand = 'first' | '2.1' | '2.2' | 'pass' | 'fail';

export function honorsFor(gpa: number): { band: HonorsBand; label: string } {
  if (gpa >= 70) return { band: 'first', label: 'First Class Honours (70+)' };
  if (gpa >= 60) return { band: '2.1', label: 'Second Class Honours, Grade 1 (60+)' };
  if (gpa >= 50) return { band: '2.2', label: 'Second Class Honours, Grade 2 (50+)' };
  if (gpa >= 40) return { band: 'pass', label: 'Pass (40+)' };
  return { band: 'fail', label: 'Below pass (<40)' };
}

const BAND_COLOR: Record<HonorsBand, string> = {
  first: 'text-emerald-400',
  '2.1': 'text-cyan-400',
  '2.2': 'text-sky-400',
  pass: 'text-amber-400',
  fail: 'text-rose-400',
};

const THRESHOLDS = [
  { label: '1st', min: 70 },
  { label: '2.1', min: 60 },
  { label: '2.2', min: 50 },
  { label: 'Pass', min: 40 },
];

interface Props {
  grades: Grade[];
  modules: DBModule[];
}

export const SemesterGpaPanel: React.FC<Props> = ({ grades, modules }) => {
  const marks = useMemo(() => computeModuleMarks(grades, modules), [grades, modules]);

  const gpa = useMemo(() => {
    if (!marks.length) return null;
    const totalW = marks.reduce((s, m) => s + m.weight, 0);
    if (totalW <= 0) return null;
    return Math.round((marks.reduce((s, m) => s + m.mark * m.weight, 0) / totalW) * 10) / 10;
  }, [marks]);

  const honors = gpa != null ? honorsFor(gpa) : null;

  if (!marks.length) return null;

  return (
    <div className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b fios-border pb-3">
        <div>
          <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-0.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Semester outlook
          </div>
          <h3 className="text-sm font-black uppercase text-[var(--fios-text)] flex items-center gap-2">
            <Award className="w-4 h-4 accent-solid-text" /> Cumulative GPA
          </h3>
        </div>
        {gpa != null && honors && (
          <div className="text-right">
            <div className="text-3xl font-black accent-solid-text font-mono leading-none">
              {formatCleanNumber(gpa)}%
            </div>
            <div className={`text-[10px] font-mono font-bold uppercase mt-1 ${BAND_COLOR[honors.band]}`}>
              {honors.label}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {marks.map((m) => (
          <div key={m.code} className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[var(--fios-text)] truncate font-bold">
                {m.code !== 'General' ? m.code : m.name}
              </span>
              <span className="text-[var(--fios-text-muted)]">{formatCleanNumber(m.mark)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--fios-surface-2)] overflow-hidden">
              <div
                className="h-full accent-bg rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, m.mark))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {THRESHOLDS.map((t) => (
          <span
            key={t.label}
            className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border fios-border ${
              gpa != null && gpa >= t.min
                ? 'accent-solid-text border-[color-mix(in_srgb,var(--fios-accent-solid)_40%,transparent)]'
                : 'text-[var(--fios-text-muted)]'
            }`}
          >
            {t.label} ≥{t.min}
          </span>
        ))}
      </div>
      <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">
        Equal-weight average of modules with scored assessments · Irish/ATU classification bands.
      </p>
    </div>
  );
};

export default SemesterGpaPanel;
