import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3x3, Layers, HelpCircle, Code2, Info, FileText } from 'lucide-react';
import { getUserModules, normalizeModuleColor, type DBModule } from '../lib/moduleService';
import { MOD_BADGE_CLASS } from '../lib/moduleColors';
import { getUserDecksWithCards } from '../lib/deckService';
import { getQuizzes } from '../lib/mcqService';
import { getCodeExams } from '../lib/codeExamService';
import { getDocuments } from '../lib/documentService';
import { isCardDue } from '../lib/spacedRepetition';

interface Readiness {
  module: DBModule;
  decks: number;
  dueCards: number;
  quizzes: number;
  code: number;
  docs: number;
  score: number;
}

/**
 * Readiness % weights:
 * - Flashcard decks / due reviews: up to 40
 * - Quiz coverage: up to 25
 * - Code exams: up to 20
 * - Saved materials (Smart Notes): up to 15
 */
function computeScore(decks: number, dueCards: number, quizzes: number, code: number, docs: number): number {
  const deckScore = Math.min(25, decks * 12) + Math.min(15, dueCards > 0 ? 8 + Math.min(7, dueCards) : 0);
  const quizScore = Math.min(25, quizzes * 12);
  const codeScore = Math.min(20, code * 10);
  const docScore = Math.min(15, docs * 5);
  return Math.round(Math.min(100, deckScore + quizScore + codeScore + docScore));
}

function tone(score: number): string {
  const op = 0.12 + (score / 100) * 0.8;
  return `color-mix(in srgb, var(--fios-accent-solid) ${Math.round(op * 100)}%, transparent)`;
}

export const ModuleHeatmap: React.FC = () => {
  const [rows, setRows] = useState<Readiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [modules, decks, quizzes, code, docs] = await Promise.all([
          getUserModules(), getUserDecksWithCards(), getQuizzes(), getCodeExams(), getDocuments(),
        ]);
        const readiness = modules.map((m) => {
          const mDecks = (decks || []).filter((x: any) => x.module_code === m.code);
          const d = mDecks.length;
          let dueCards = 0;
          for (const deck of mDecks) {
            for (const c of (deck as any).cards || []) {
              if (isCardDue(c.next_review)) dueCards++;
            }
          }
          const q = quizzes.filter((x) => x.module_code === m.code).length;
          const c = code.filter((x) => x.module_code === m.code).length;
          const docN = docs.filter((x) => x.module_code === m.code).length;
          return {
            module: m,
            decks: d,
            dueCards,
            quizzes: q,
            code: c,
            docs: docN,
            score: computeScore(d, dueCards, q, c, docN),
          };
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-1 flex items-center gap-1.5">
            <Grid3x3 className="w-3.5 h-3.5" /> Module Readiness
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-wide text-[var(--fios-text)] flex items-center gap-2">
            Exam readiness heatmap
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="p-1 rounded-md text-[var(--fios-text-muted)] hover:accent-solid-text cursor-pointer"
              aria-label="How readiness is calculated"
              title="How readiness % is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </h3>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-[var(--fios-text-muted)]">
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Decks</span>
          <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Quizzes</span>
          <span className="flex items-center gap-1"><Code2 className="w-3 h-3" /> Code</span>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Notes</span>
        </div>
      </div>

      {showHelp && (
        <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3.5 text-[11px] font-mono text-[var(--fios-text-muted)] space-y-1.5 leading-relaxed">
          <p className="font-bold text-[var(--fios-text)] uppercase tracking-wide text-[10px]">How readiness % is calculated</p>
          <p>Combines study coverage per module (capped at 100%):</p>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            <li>Flashcard decks + due SM-2 reviews — up to 40 pts</li>
            <li>Saved MCQ quizzes — up to 25 pts</li>
            <li>Code exams — up to 20 pts</li>
            <li>Saved Smart Notes / materials — up to 15 pts</li>
          </ul>
          <p>Tap a module tile for a per-module breakdown.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map((r, i) => (
          <motion.button
            key={r.module.id}
            type="button"
            data-mod-color={normalizeModuleColor(r.module.color)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setExpanded((id) => (id === r.module.id ? null : r.module.id))}
            className="rounded-xl border fios-border mod-card-accent border-l-4 p-3.5 relative overflow-hidden text-left cursor-pointer"
            style={{ backgroundColor: tone(r.score) }}
            title="Tap for breakdown"
          >
            <div className="flex items-center justify-between gap-2">
              <span data-mod-color={normalizeModuleColor(r.module.color)} className={MOD_BADGE_CLASS}>
                {r.module.name}
              </span>
              <span className="text-lg font-black text-[var(--fios-text)]">{r.score}%</span>
            </div>
            <p className="text-[11px] font-bold text-[var(--fios-text)] truncate mt-1 opacity-80">
              {r.module.code || 'No course code'}
            </p>
            <div className="flex items-center gap-2 text-[9px] font-mono text-[var(--fios-text)] opacity-80 mt-2 flex-wrap">
              <span className="flex items-center gap-0.5"><Layers className="w-2.5 h-2.5" />{r.decks}</span>
              <span className="flex items-center gap-0.5"><HelpCircle className="w-2.5 h-2.5" />{r.quizzes}</span>
              <span className="flex items-center gap-0.5"><Code2 className="w-2.5 h-2.5" />{r.code}</span>
              <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{r.docs}</span>
            </div>
            {expanded === r.module.id && (
              <div className="mt-2 pt-2 border-t border-white/10 text-[9px] font-mono text-[var(--fios-text)] space-y-0.5 opacity-90">
                <p>{r.decks} deck{r.decks === 1 ? '' : 's'} · {r.dueCards} due card{r.dueCards === 1 ? '' : 's'}</p>
                <p>{r.quizzes} quiz{r.quizzes === 1 ? '' : 'zes'} · {r.code} code exam{r.code === 1 ? '' : 's'}</p>
                <p>{r.docs} saved note{r.docs === 1 ? '' : 's'}</p>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ModuleHeatmap;
