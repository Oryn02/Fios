import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3x3, Layers, HelpCircle, Code2 } from 'lucide-react';
import { getUserModules, type DBModule } from '../lib/moduleService';
import { getUserDecksWithCards } from '../lib/deckService';
import { getQuizzes } from '../lib/mcqService';
import { getCodeExams } from '../lib/codeExamService';

interface Readiness {
  module: DBModule;
  decks: number;
  quizzes: number;
  code: number;
  score: number; // 0-100
}

function computeScore(decks: number, quizzes: number, code: number): number {
  const deckScore = Math.min(40, decks * 20);
  const quizScore = Math.min(30, quizzes * 15);
  const codeScore = Math.min(30, code * 15);
  return Math.round(deckScore + quizScore + codeScore);
}

function tone(score: number): string {
  // Opacity of the accent fill scales with readiness.
  const op = 0.12 + (score / 100) * 0.8;
  return `color-mix(in srgb, var(--fios-accent-solid) ${Math.round(op * 100)}%, transparent)`;
}

export const ModuleHeatmap: React.FC = () => {
  const [rows, setRows] = useState<Readiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [modules, decks, quizzes, code] = await Promise.all([
          getUserModules(), getUserDecksWithCards(), getQuizzes(), getCodeExams(),
        ]);
        const readiness = modules.map((m) => {
          const d = (decks || []).filter((x: any) => x.module_code === m.code).length;
          const q = quizzes.filter((x) => x.module_code === m.code).length;
          const c = code.filter((x) => x.module_code === m.code).length;
          return { module: m, decks: d, quizzes: q, code: c, score: computeScore(d, q, c) };
        });
        setRows(readiness);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-1 flex items-center gap-1.5">
            <Grid3x3 className="w-3.5 h-3.5" /> Module Readiness
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-wide text-[var(--fios-text)]">Exam readiness heatmap</h3>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-[var(--fios-text-muted)]">
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Decks</span>
          <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Quizzes</span>
          <span className="flex items-center gap-1"><Code2 className="w-3 h-3" /> Code</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map((r, i) => (
          <motion.div
            key={r.module.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border fios-border p-3.5 relative overflow-hidden"
            style={{ backgroundColor: tone(r.score) }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black font-mono uppercase text-[var(--fios-text)]">{r.module.code}</span>
              <span className="text-lg font-black text-[var(--fios-text)]">{r.score}%</span>
            </div>
            <p className="text-[11px] font-bold text-[var(--fios-text)] truncate mt-1">{r.module.name}</p>
            <div className="flex items-center gap-2 text-[9px] font-mono text-[var(--fios-text)] opacity-80 mt-2">
              <span className="flex items-center gap-0.5"><Layers className="w-2.5 h-2.5" />{r.decks}</span>
              <span className="flex items-center gap-0.5"><HelpCircle className="w-2.5 h-2.5" />{r.quizzes}</span>
              <span className="flex items-center gap-0.5"><Code2 className="w-2.5 h-2.5" />{r.code}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ModuleHeatmap;
