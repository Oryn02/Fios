/**
 * Global Quick Capture — mobile-first FAB dump for note / photo / todo.
 * Captures land in a local inbox for later module auto-sort.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CheckSquare, FileText, Inbox, Plus, X, Loader2 } from 'lucide-react';
import { createTask } from '../lib/taskService';
import { toast } from '../lib/toast';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';

const STORAGE_KEY = 'fios_quick_captures';

export type QuickCaptureItem = {
  id: string;
  kind: 'note' | 'todo' | 'photo';
  text: string;
  photoDataUrl?: string;
  moduleCode?: string | null;
  created_at: string;
};

function loadItems(): QuickCaptureItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: QuickCaptureItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 80)));
}

export function peekQuickCaptures(): QuickCaptureItem[] {
  return loadItems();
}

export const QuickCaptureFab: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'note' | 'todo' | 'photo' | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<QuickCaptureItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const keyboardVisible = useKeyboardVisible();
  useBodyScrollLock(open && !!mode);

  useEffect(() => {
    setItems(loadItems());
  }, [open]);

  if (keyboardVisible) return null;

  const persist = (next: QuickCaptureItem[]) => {
    setItems(next);
    saveItems(next);
  };

  const saveCapture = async (kind: 'note' | 'todo' | 'photo', payload: { text: string; photoDataUrl?: string }) => {
    const item: QuickCaptureItem = {
      id: `qc-${Date.now()}`,
      kind,
      text: payload.text.trim() || (kind === 'photo' ? 'Photo capture' : ''),
      photoDataUrl: payload.photoDataUrl,
      moduleCode: null,
      created_at: new Date().toISOString(),
    };
    if (!item.text && !item.photoDataUrl) return;
    persist([item, ...items]);
    if (kind === 'todo' && item.text) {
      setBusy(true);
      try {
        await createTask({ title: item.text });
        toast('Todo captured — sort to a module later', 'success');
      } catch {
        toast('Saved locally — will sync when online', 'info');
      } finally {
        setBusy(false);
      }
    } else {
      toast(kind === 'photo' ? 'Photo captured' : 'Note captured — auto-sort later', 'success');
    }
    setText('');
    setMode(null);
    setOpen(false);
  };

  const onPhoto = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void saveCapture('photo', {
        text: text.trim() || file.name,
        photoDataUrl: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="pointer-events-auto md:hidden">
        <motion.button
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="touch-target w-14 h-14 rounded-full accent-bg text-slate-950 shadow-lg flex items-center justify-center cursor-pointer"
          aria-label={open ? 'Close quick capture' : 'Quick capture'}
          aria-expanded={open}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => {
                setOpen(false);
                setMode(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed bottom-24 right-3 z-50 w-[min(100vw-1.5rem,20rem)] md:hidden pointer-events-auto"
            >
              <div className="rounded-2xl border fios-border bg-[var(--fios-surface)] shadow-2xl overflow-hidden">
                {!mode ? (
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text px-1 flex items-center gap-1.5">
                      <Inbox className="w-3 h-3" /> Quick capture
                    </p>
                    {(
                      [
                        { id: 'note' as const, label: 'Dump a note', icon: FileText },
                        { id: 'todo' as const, label: 'Add a todo', icon: CheckSquare },
                        { id: 'photo' as const, label: 'Snap a photo', icon: Camera },
                      ] as const
                    ).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          if (a.id === 'photo') {
                            setMode('photo');
                            fileRef.current?.click();
                            return;
                          }
                          setMode(a.id);
                        }}
                        className="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl border fios-border bg-[var(--fios-surface-2)] text-left cursor-pointer"
                      >
                        <a.icon className="w-4 h-4 accent-solid-text shrink-0" />
                        <span className="text-xs font-bold text-[var(--fios-text)]">{a.label}</span>
                      </button>
                    ))}
                    {items.length > 0 && (
                      <p className="text-[10px] font-mono text-[var(--fios-text-muted)] px-1 pt-1">
                        {items.length} unsorted · auto-sort to modules later
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
                        {mode === 'todo' ? 'Todo' : mode === 'photo' ? 'Photo' : 'Note'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setMode(null)}
                        className="p-1.5 text-[var(--fios-text-muted)] cursor-pointer"
                        aria-label="Back"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={3}
                      placeholder={mode === 'todo' ? 'What do you need to do?' : 'Capture a thought…'}
                      className="w-full min-h-[4.5rem] p-3 rounded-xl bg-[var(--fios-surface-2)] border fios-border text-sm text-[var(--fios-text)] resize-y field-sizing-content"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={busy || !text.trim()}
                      onClick={() => void saveCapture(mode === 'todo' ? 'todo' : 'note', { text })}
                      className="w-full min-h-11 py-2.5 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Save capture
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0] || null)}
      />
    </>
  );
};

export default QuickCaptureFab;
