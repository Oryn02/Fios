import React, { useEffect, useMemo, useState } from 'react';
import { Code2, FileText, HelpCircle, Mic, Sparkles } from 'lucide-react';
import { DocumentsView } from './DocumentsView';
import { CodeExamView } from './CodeExamView';
import { QuizExamView } from './QuizExamView';
import { StudyLabExtras } from './study/StudyLabExtras';

export type StudioPane = 'notes' | 'quiz' | 'code';

interface StudioHubProps {
  initialPane?: StudioPane;
  moduleCode?: string | null;
  initialExamId?: string | null;
  initialQuizId?: string | null;
  /** Flashcard generator slot — Quiz & Exam pane */
  flashcardSlot?: React.ReactNode;
  onDeckReady?: (deck: { title: string; cards: { front: string; back: string }[] }) => void;
}

const PANES: {
  id: StudioPane;
  label: string;
  hint: string;
  icon: React.ElementType;
}[] = [
  { id: 'notes', label: 'Notes & Audio', hint: 'PDF · text · lecture', icon: FileText },
  { id: 'quiz', label: 'Quiz & Exam', hint: 'MCQ · flashcards', icon: HelpCircle },
  { id: 'code', label: 'Code Lab', hint: 'Challenges · debug', icon: Code2 },
];

/**
 * Studio pillar — creation tools merged (Notes/Audio, Quiz/Exam, Code Lab).
 * Module context locks tools when opened from a module dashboard.
 */
export const StudioHub: React.FC<StudioHubProps> = ({
  initialPane = 'notes',
  moduleCode,
  initialExamId,
  initialQuizId,
  flashcardSlot,
  onDeckReady,
}) => {
  const [pane, setPane] = useState<StudioPane>(initialPane);

  useEffect(() => {
    setPane(initialPane);
  }, [initialPane]);

  const ctxLabel = useMemo(() => (moduleCode ? moduleCode : null), [moduleCode]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <header className="space-y-1">
        <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Studio
          {ctxLabel ? ` · ${ctxLabel}` : ''}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-[var(--fios-text)]">
          Create & practice
        </h1>
        <p className="text-xs text-[var(--fios-text-muted)]">
          {ctxLabel
            ? `Tools stay locked to ${ctxLabel} — saves land in that module folder.`
            : 'Notes, exams, and code challenges in one place. Save generated work to a module folder.'}
        </p>
      </header>

      <div
        className="flex gap-1 p-1 rounded-2xl border fios-border bg-[var(--fios-surface)] overflow-x-auto fios-h-scroll"
        role="tablist"
        aria-label="Studio tools"
      >
        {PANES.map((p) => {
          const Icon = p.icon;
          const active = pane === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPane(p.id)}
              className={`flex-1 min-w-[7.5rem] min-h-11 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer touch-manipulation transition-colors ${
                active
                  ? 'accent-bg text-slate-950 shadow-md'
                  : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-tight text-center sm:text-left">
                <span className="block">{p.label}</span>
                <span className={`block text-[9px] font-mono font-bold normal-case ${active ? 'opacity-80' : 'opacity-60'}`}>
                  {p.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="space-y-4">
        {pane === 'notes' && (
          <>
            <DocumentsView initialModuleCode={moduleCode || undefined} />
            <div className="rounded-xl border fios-border bg-[var(--fios-surface)] p-3 space-y-2">
              <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text flex items-center gap-1.5 px-1">
                <Mic className="w-3.5 h-3.5" /> Live lecture & ingest
              </p>
              <StudyLabExtras
                moduleCode={moduleCode || undefined}
                onDeckReady={onDeckReady}
              />
            </div>
          </>
        )}
        {pane === 'quiz' && (
          <div className="space-y-6">
            {flashcardSlot}
            <QuizExamView
              initialQuizId={initialQuizId || undefined}
              initialModuleCode={moduleCode || undefined}
            />
          </div>
        )}
        {pane === 'code' && (
          <CodeExamView
            initialExamId={initialExamId}
            initialModuleCode={moduleCode || undefined}
          />
        )}
      </div>
    </div>
  );
};

export default StudioHub;
