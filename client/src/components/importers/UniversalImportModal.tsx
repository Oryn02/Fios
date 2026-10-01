/**
 * Universal deck importer — Fios JSON / share code + CSV / Quizlet / Notion / RemNote / Anki .apkg.
 * Keeps the existing JSON path; other tabs call /api/import/* then saveDeckWithCards.
 */
import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Loader2, Upload, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { saveDeckWithCards, parseDeckImport, type DeckExportPayload } from '../../lib/deckService';
import { importDeckRemote } from '../../services/studyApi';
import { toast } from '../../lib/toast';
import { IS_DEMO } from '../../lib/demo';

type TabKey = 'fios' | 'csv' | 'quizlet' | 'notion' | 'remnote' | 'anki';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'fios', label: 'Fios JSON' },
  { key: 'csv', label: 'CSV' },
  { key: 'quizlet', label: 'Quizlet' },
  { key: 'notion', label: 'Notion' },
  { key: 'remnote', label: 'RemNote' },
  { key: 'anki', label: 'Anki .apkg' },
];

export const UniversalImportModal: React.FC<Props> = ({ open, onClose, onImported }) => {
  useBodyScrollLock(!!open, '[data-modal-scroll]');
  const [tab, setTab] = useState<TabKey>('fios');
  const [raw, setRaw] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveCards = async (title: string, cards: any[], moduleCode?: string) => {
    if (IS_DEMO) {
      toast('Import disabled in demo mode — sign in to save decks', 'info');
      return;
    }
    if (!cards?.length) throw new Error('No cards returned from import');
    await saveDeckWithCards(
      title || 'Imported Deck',
      cards.map((c) => ({
        front: c.front || c.question || '',
        back: c.back || c.answer || '',
        ease_factor: c.ease_factor,
        interval: c.interval,
        repetitions: c.repetitions,
        next_review: c.next_review,
        source_page: c.source_page,
        source_paragraph: c.source_paragraph,
        source_quote: c.source_quote,
        card_type: c.card_type,
        code_language: c.code_language,
        starter_code: c.starter_code,
        expected_output: c.expected_output,
        solution_code: c.solution_code,
      } as any)),
      moduleCode
    );
    toast(`Imported “${title}” (${cards.length} cards)`, 'success');
    setRaw('');
    setUrl('');
    onImported?.();
    onClose();
  };

  const importPayload = async (payload: DeckExportPayload) => {
    setBusy(true);
    try {
      await saveCards(payload.title, payload.cards, payload.module_code || undefined);
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

  const handleFiosFile = async (file: File) => {
    try {
      const text = await file.text();
      const payload = parseDeckImport(text);
      await importPayload(payload);
    } catch (err: any) {
      toast(err?.message || 'Could not read deck file', 'error');
    }
  };

  const handleRemoteText = async (kind: 'csv' | 'quizlet' | 'notion' | 'remnote') => {
    setBusy(true);
    try {
      const body: Record<string, unknown> =
        kind === 'csv'
          ? { csv: raw, text: raw }
          : { url: url.trim() || undefined, text: raw.trim() || undefined, content: raw.trim() || undefined };
      const data = await importDeckRemote(kind, body);
      await saveCards(data.title || `Imported ${kind}`, data.cards || data.deck?.cards || []);
    } catch (err: any) {
      toast(err?.message || `${kind} import failed`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAnkiFile = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await importDeckRemote('anki', fd);
      await saveCards(data.title || file.name.replace(/\.apkg$/i, ''), data.cards || []);
    } catch (err: any) {
      toast(err?.message || 'Anki import failed', 'error');
    } finally {
      setBusy(false);
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
            className="w-full max-w-lg rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-4 shadow-sm dark:shadow-none max-h-[90dvh] overflow-y-auto scroll-touch"
            data-modal-scroll
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

            <div className="flex flex-wrap gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer border ${
                    tab === t.key ? 'accent-bg text-slate-950 border-transparent' : 'fios-border text-[var(--fios-text-muted)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={tab === 'anki' ? '.apkg,application/octet-stream' : tab === 'csv' ? '.csv,text/csv' : 'application/json,.json'}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (tab === 'anki') void handleAnkiFile(f);
                else if (tab === 'fios') void handleFiosFile(f);
                else if (tab === 'csv') {
                  void f.text().then((t) => {
                    setRaw(t);
                  });
                }
                if (fileRef.current) fileRef.current.value = '';
              }}
            />

            {tab === 'fios' && (
              <>
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
              </>
            )}

            {tab === 'csv' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 rounded-xl border border-dashed fios-border text-xs font-bold uppercase text-[var(--fios-text-muted)] cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4 accent-solid-text" /> Upload .csv
                </button>
                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="front,back&#10;What is…?,Answer…"
                  className="w-full h-36 p-3 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-[11px] font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
                />
                <button
                  type="button"
                  disabled={busy || !raw.trim()}
                  onClick={() => void handleRemoteText('csv')}
                  className="w-full py-2.5 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Import CSV
                </button>
              </>
            )}

            {(tab === 'quizlet' || tab === 'notion' || tab === 'remnote') && (
              <>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={`${tab} URL (optional)`}
                  className="w-full p-3 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
                />
                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={`Or paste ${tab} export / page text`}
                  className="w-full h-28 p-3 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-[11px] font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
                />
                <button
                  type="button"
                  disabled={busy || (!url.trim() && !raw.trim())}
                  onClick={() => void handleRemoteText(tab)}
                  className="w-full py-2.5 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Import {tab}
                </button>
              </>
            )}

            {tab === 'anki' && (
              <>
                <p className="text-[11px] text-[var(--fios-text-muted)]">
                  Upload an Anki <code className="font-mono">.apkg</code> package. Cards land in your library with SM-2 defaults.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 rounded-xl border border-dashed fios-border text-xs font-bold uppercase text-[var(--fios-text-muted)] cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 accent-solid-text" />}
                  Upload .apkg
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UniversalImportModal;
