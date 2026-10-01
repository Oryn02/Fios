import React, { useCallback, useState } from 'react';
import { Highlighter, Loader2 } from 'lucide-react';
import { saasFetch, readJson } from '../../services/saasFetch';
import { toast } from '../../lib/toast';

export type PdfHighlightAction = 'flashcard' | 'explain' | 'quiz' | 'notes';

interface PdfHighlightToolbarProps {
  /** Selected text from PDF.js viewer selection */
  selectedText: string;
  pageNumber?: number;
  documentTitle?: string;
  onFlashcards?: (cards: { front: string; back: string }[]) => void;
  onExplain?: (markdown: string) => void;
  onQuiz?: (questions: unknown[]) => void;
  onAddNotes?: (markdown: string) => void;
  onClearSelection?: () => void;
}

/**
 * Smart PDF Highlight-to-Card toolbar for PDF.js viewers.
 * Reuses generate flashcards / quiz / summarize APIs.
 */
export const PdfHighlightToolbar: React.FC<PdfHighlightToolbarProps> = ({
  selectedText,
  pageNumber,
  documentTitle,
  onFlashcards,
  onExplain,
  onQuiz,
  onAddNotes,
  onClearSelection,
}) => {
  const [busy, setBusy] = useState<PdfHighlightAction | null>(null);
  const text = selectedText.trim();
  if (!text) return null;

  const pageHint = pageNumber ? ` (page ${pageNumber})` : '';
  const ctx = documentTitle
    ? `From document "${documentTitle}"${pageHint}:\n\n${text}`
    : `${text}${pageHint}`;

  const run = useCallback(
    async (action: PdfHighlightAction) => {
      setBusy(action);
      try {
        if (action === 'flashcard') {
          const res = await saasFetch('/api/generate/flashcards', {
            method: 'POST',
            body: JSON.stringify({ text: ctx }),
          });
          const data = await readJson<{ cards?: { front: string; back: string }[] }>(res);
          const cards = Array.isArray(data.cards) ? data.cards : [];
          onFlashcards?.(cards);
          toast(`Made ${cards.length} flashcard(s)`, 'success');
        } else if (action === 'explain') {
          const res = await saasFetch('/api/summarize', {
            method: 'POST',
            body: JSON.stringify({
              text: `Explain simply for a first-year student:\n\n${ctx}`,
            }),
          });
          const data = await readJson<any>(res);
          const md =
            typeof data === 'string'
              ? data
              : data.summary || data.markdown || data.text || JSON.stringify(data);
          onExplain?.(String(md));
          toast('Explanation ready', 'success');
        } else if (action === 'quiz') {
          const res = await saasFetch('/api/generate/quiz', {
            method: 'POST',
            body: JSON.stringify({ text: ctx, questionCount: 4 }),
          });
          const data = await readJson<any>(res);
          const questions = Array.isArray(data) ? data : data.questions || [];
          onQuiz?.(questions);
          toast(`Generated ${questions.length} quiz Qs`, 'success');
        } else if (action === 'notes') {
          const res = await saasFetch('/api/summarize', {
            method: 'POST',
            body: JSON.stringify({
              text: `Turn this highlight into concise study notes with a heading:\n\n${ctx}`,
            }),
          });
          const data = await readJson<any>(res);
          const md =
            typeof data === 'string'
              ? data
              : data.summary || data.markdown || data.text || String(text);
          onAddNotes?.(String(md));
          toast('Added to notes', 'success');
        }
        onClearSelection?.();
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Action failed', 'error');
      } finally {
        setBusy(null);
      }
    },
    [ctx, onFlashcards, onExplain, onQuiz, onAddNotes, onClearSelection, text]
  );

  return (
    <div className="fixed z-50 bottom-24 left-1/2 -translate-x-1/2 max-w-[min(92vw,420px)] bg-[var(--fios-surface)] border fios-border shadow-lg rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Highlighter className="w-4 h-4 accent-solid-text shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--fios-text-muted)] line-clamp-2">{text}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            ['flashcard', 'Make Flashcard'],
            ['explain', 'Explain Simply'],
            ['quiz', 'Generate Quiz'],
            ['notes', 'Add to Notes'],
          ] as [PdfHighlightAction, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            disabled={!!busy}
            onClick={() => run(key)}
            className="px-2 py-2 rounded-lg border fios-border text-[10px] font-black uppercase tracking-wide cursor-pointer hover:accent-border disabled:opacity-50"
          >
            {busy === key ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null} {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PdfHighlightToolbar;
