import React, { useState } from 'react';
import { Loader2, MessageSquareQuote, BookOpen } from 'lucide-react';
import { saasFetch, readJson } from '../../services/saasFetch';
import { toast } from '../../lib/toast';
import { SourceViewer } from '../citations/SourceViewer';

type Citation = {
  quote: string;
  page?: number;
  paragraph?: number;
  chunkIndex?: number;
  index?: number;
};

interface GroundedDocChatProps {
  moduleCode?: string;
  documentId?: string;
  pdfUrl?: string | null;
}

export const GroundedDocChat: React.FC<GroundedDocChatProps> = ({
  moduleCode,
  documentId,
  pdfUrl,
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<{ page: number; quote: string } | null>(null);

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setBusy(true);
    try {
      const res = await saasFetch('/api/grounded-chat/ask', {
        method: 'POST',
        body: JSON.stringify({ question: q, moduleCode, documentId }),
      });
      const data = await readJson<{ answer?: string; citations?: Citation[] }>(res);
      setAnswer(data.answer || '');
      setCitations(Array.isArray(data.citations) ? data.citations : []);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Chat failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <MessageSquareQuote className="w-4 h-4 accent-solid-text" /> Grounded doc chat
      </h3>
      <p className="text-[11px] text-[var(--fios-text-muted)]">
        Answers cite your note chunks. Click a citation to open the source viewer.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask();
          }}
          placeholder="Ask about this module / document…"
          className="flex-1 p-2.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs text-[var(--fios-text)]"
        />
        <button
          type="button"
          disabled={busy || !question.trim()}
          onClick={() => void ask()}
          className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ask'}
        </button>
      </div>
      {answer ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--fios-text)] whitespace-pre-wrap">{answer}</p>
          {citations.length > 0 ? (
            <ul className="space-y-1.5">
              {citations.map((c, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() =>
                      setViewer({ page: Number(c.page) || 1, quote: c.quote || '' })
                    }
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-[11px] hover:accent-border cursor-pointer"
                  >
                    <span className="font-mono accent-solid-text inline-flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      p.{c.page ?? '?'} · ¶{c.paragraph ?? '?'}
                    </span>
                    <span className="block mt-0.5 text-[var(--fios-text-muted)] line-clamp-2">
                      “{c.quote}”
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {viewer ? (
        <SourceViewer
          pdfUrl={pdfUrl}
          page={viewer.page}
          quote={viewer.quote}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </div>
  );
};

export default GroundedDocChat;
