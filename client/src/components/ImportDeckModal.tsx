/**
 * Import a flashcard deck from JSON file, paste JSON, or shareable base64 code.
 */
import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Loader2, Upload, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { saveDeckWithCards, parseDeckImport, type DeckExportPayload } from '../lib/deckService';
import { toast } from '../lib/toast';
import { IS_DEMO } from '../lib/demo';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

export const ImportDeckModal: React.FC<Props> = ({ open, onClose, onImported }) => {
  useBodyScrollLock(!!open, '[data-modal-scroll]');

  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importPayload = async (payload: DeckExportPayload) => {
    if (IS_DEMO) {
      toast('Import disabled in demo mode — sign in to save decks', 'info');
      return;
    }
    setBusy(true);
    try {
      await saveDeckWithCards(
        payload.title,
        payload.cards.map((c) => ({
          front: c.front,
          back: c.back,
          ease_factor: c.ease_factor,
          interval: c.interval,
          repetitions: c.repetitions,
          next_review: c.next_review,
        } as any)),
        payload.module_code || undefined
      );
      toast(`Imported “${payload.title}” (${payload.cards.length} cards)`, 'success');
      setRaw('');
      onImported?.();
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Import failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePasteImport = async () => {
    try {
      const payload = parseDeckImport(raw);
      await importPayload(payload);
    } catch (err: any) {
      toast(err?.message || 'Invalid deck code / JSON', 'error');
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const payload = parseDeckImport(text);
      await importPayload(payload);
    } catch (err: any) {
      toast(err?.message || 'Could not read deck file', 'error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
                  Flashcards
                </p>
                <h3 className="text-sm font-black uppercase text-[var(--fios-text)] flex items-center gap-2">
                  <Download className="w-4 h-4 accent-solid-text" /> Import deck
                </h3>
              </div>
              <button type="button" onClick={onClose} className="touch-target shrink-0 rounded-lg text-[var(--fios-text-muted)] cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                if (fileRef.current) fileRef.current.value = '';
              }}
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border border-dashed fios-border text-xs font-bold uppercase text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Upload className="w-4 h-4 accent-solid-text" /> Upload .json
            </button>

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">
                Or paste JSON / share code
              </label>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder='{"version":1,"title":"…","cards":[…]} or fios1.…'
                className="w-full h-36 p-3 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-[11px] font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-[var(--fios-text-muted)] cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !raw.trim()}
                onClick={() => void handlePasteImport()}
                className="px-4 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Import
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportDeckModal;
