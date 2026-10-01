import React, { useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportAnkiApkg } from '../../services/studyApi';
import { toast } from '../../lib/toast';

interface AnkiExportButtonProps {
  title?: string;
  deckId?: string;
  cards?: { front?: string; back?: string; question?: string; answer?: string }[];
  className?: string;
}

export const AnkiExportButton: React.FC<AnkiExportButtonProps> = ({
  title,
  deckId,
  cards,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);

  const onExport = useCallback(async () => {
    setLoading(true);
    try {
      const payload: {
        title?: string;
        deckId?: string;
        cards?: { front: string; back: string }[];
      } = { title };
      if (deckId) payload.deckId = deckId;
      if (cards?.length) {
        payload.cards = cards.map((c) => ({
          front: String(c.front ?? c.question ?? ''),
          back: String(c.back ?? c.answer ?? ''),
        }));
      }
      const blob = await exportAnkiApkg(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'fios_deck').replace(/[^\w\-]+/g, '_').slice(0, 64)}.apkg`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Anki package downloaded', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Anki export failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [title, deckId, cards]);

  return (
    <button
      type="button"
      onClick={() => void onExport()}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border fios-border text-[var(--fios-text-muted)] hover:accent-solid-text cursor-pointer disabled:opacity-60 ${className}`}
      title="Export as Anki .apkg"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      Anki
    </button>
  );
};
