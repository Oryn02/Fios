import React, { useEffect, useState } from 'react';
import { Brain, Loader2, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { generateMnemonic } from '../../services/studyApi';
import { toast } from '../../lib/toast';

interface Props {
  open: boolean;
  onClose: () => void;
  cardFront: string;
  cardBack: string;
}

export const MnemonicModal: React.FC<Props> = ({ open, onClose, cardFront, cardBack }) => {
  useBodyScrollLock(open, '[data-modal-scroll]');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ acronym?: string; story?: string; rhyme?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setData(null);
      try {
        const res = await generateMnemonic({
          cardFront,
          cardBack,
          term: cardFront,
          concept: cardBack,
        });
        if (!cancelled) {
          setData({
            acronym: res.acronym || res.mnemonic?.acronym,
            story: res.story || res.mnemonic?.story,
            rhyme: res.rhyme || res.mnemonic?.rhyme,
          });
        }
      } catch (e: any) {
        if (!cancelled) toast(e?.message || 'Mnemonic failed', 'error');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cardFront, cardBack]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        className="relative z-10 w-full max-w-md max-h-[85dvh] overflow-y-auto scroll-touch rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-4"
        data-modal-scroll
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">Memory palace</p>
            <h3 className="text-sm font-black uppercase text-[var(--fios-text)] flex items-center gap-2">
              <Brain className="w-4 h-4 accent-solid-text" /> Mnemonic
            </h3>
          </div>
          <button type="button" onClick={onClose} className="touch-target text-[var(--fios-text-muted)] cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {busy ? (
          <p className="text-xs text-[var(--fios-text-muted)] flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Inventing weird hooks…
          </p>
        ) : (
          <div className="space-y-3">
            {data?.acronym && (
              <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3">
                <p className="text-[9px] font-mono uppercase text-[var(--fios-text-muted)] mb-1">Acronym</p>
                <p className="text-sm font-bold text-[var(--fios-text)]">{data.acronym}</p>
              </div>
            )}
            {data?.story && (
              <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3">
                <p className="text-[9px] font-mono uppercase text-[var(--fios-text-muted)] mb-1">Story</p>
                <p className="text-xs text-[var(--fios-text)] leading-relaxed">{data.story}</p>
              </div>
            )}
            {data?.rhyme && (
              <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3">
                <p className="text-[9px] font-mono uppercase text-[var(--fios-text-muted)] mb-1">Rhyme</p>
                <p className="text-xs text-[var(--fios-text)] leading-relaxed whitespace-pre-wrap">{data.rhyme}</p>
              </div>
            )}
            {!data?.acronym && !data?.story && !data?.rhyme && (
              <p className="text-xs text-[var(--fios-text-muted)]">No mnemonic returned — try again later.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MnemonicModal;
