/**
 * Floating quick-capture inbox — raw brain dumps → optional AI parse into tasks/notes.
 * Lives in the shared FAB dock beside Pomodoro + Smart Quick (does not steal their space).
 */
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Loader2, Sparkles, Trash2, X, CheckSquare } from 'lucide-react';
import { askTutor } from '../services/aiApi';
import { createTask } from '../lib/taskService';
import { useAiAuth } from '../context/AiAuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { toast } from '../lib/toast';

const STORAGE_KEY = 'fios_brain_dumps';

interface Dump {
  id: string;
  text: string;
  created_at: string;
}

function loadDumps(): Dump[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDumps(dumps: Dump[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dumps.slice(0, 50)));
}

function extractJson(answer: string): { tasks: string[]; notes: string } | null {
  const fence = answer.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : answer.trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return {
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.map((t: unknown) => String(t).trim()).filter(Boolean)
        : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    };
  } catch {
    return null;
  }
}

export const BrainDumpInbox: React.FC = () => {
  const { requireAiAuth } = useAiAuth();
  const { showBrainDumpInbox } = usePreferences();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    setDumps(loadDumps());
  }, []);

  useEffect(() => {
    if (!showBrainDumpInbox) setOpen(false);
  }, [showBrainDumpInbox]);

  if (!showBrainDumpInbox) return null;

  const persist = (next: Dump[]) => {
    setDumps(next);
    saveDumps(next);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const dump: Dump = {
      id: `bd-${Date.now()}`,
      text: text.trim(),
      created_at: new Date().toISOString(),
    };
    persist([dump, ...dumps]);
    setText('');
    toast('Brain dump saved', 'success');
  };

  const handleDelete = (id: string) => {
    persist(dumps.filter((d) => d.id !== id));
  };

  const handleParse = async (dump: Dump) => {
    if (!requireAiAuth()) return;
    setParsing(true);
    try {
      const { answer } = await askTutor(
        `Parse this student brain dump into JSON only (no markdown). Return exactly: {"tasks":["..."],"notes":"..."}.
Tasks should be short actionable academic to-dos. Notes should be a cleaned summary of remaining ideas.
Brain dump:
${dump.text}`,
        'You convert messy study notes into structured tasks and a short note. Reply with JSON only.'
      );
      const parsed = extractJson(answer);
      if (!parsed) throw new Error('Could not parse AI response as JSON.');

      let created = 0;
      for (const title of parsed.tasks.slice(0, 12)) {
        const due = new Date();
        due.setDate(due.getDate() + 1);
        due.setHours(17, 0, 0, 0);
        await createTask({
          title,
          dueAt: due.toISOString(),
          startAt: new Date(due.getTime() - 30 * 60 * 1000).toISOString(),
        });
        created++;
      }

      if (parsed.notes.trim()) {
        const noteDump: Dump = {
          id: `bd-note-${Date.now()}`,
          text: `[AI notes]\n${parsed.notes.trim()}`,
          created_at: new Date().toISOString(),
        };
        persist([noteDump, ...dumps.filter((d) => d.id !== dump.id)]);
      } else {
        handleDelete(dump.id);
      }

      toast(
        created > 0
          ? `Created ${created} task${created === 1 ? '' : 's'} from dump`
          : 'Parsed dump — no tasks extracted',
        'success'
      );
    } catch (err: any) {
      toast(err?.message || 'Failed to parse brain dump', 'error');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="relative z-30 pointer-events-auto flex flex-col items-start font-sans">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="absolute bottom-full mb-3 left-0 z-40 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border fios-border-strong bg-[var(--fios-surface)]/95 backdrop-blur-xl shadow-2xl p-4 space-y-3"
            role="dialog"
            aria-label="Brain dump inbox"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
                  Quick capture
                </p>
                <h3 className="text-sm font-black uppercase text-[var(--fios-text)] truncate">
                  Brain dump inbox
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer p-1.5 rounded-lg border fios-border bg-[var(--fios-surface-2)]"
                aria-label="Close brain dump"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dump thoughts, tasks, lecture scraps…"
              className="w-full h-24 p-3 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border resize-none"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!text.trim()}
              className="w-full py-2.5 accent-bg text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 active:scale-[0.99]"
            >
              Save dump
            </button>

            <div className="max-h-44 overflow-y-auto space-y-2 fios-agenda-scroll">
              {dumps.length === 0 ? (
                <p className="text-[10px] font-mono text-[var(--fios-text-muted)] text-center py-3">
                  No dumps yet — capture freely, parse later.
                </p>
              ) : (
                dumps.map((d) => (
                  <div key={d.id} className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-2.5 space-y-2">
                    <p className="text-[11px] text-[var(--fios-text)] whitespace-pre-wrap line-clamp-4">{d.text}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono text-[var(--fios-text-muted)]">
                        {new Date(d.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={parsing}
                          onClick={() => void handleParse(d)}
                          className="px-2 py-1 rounded-lg border fios-border text-[9px] font-bold uppercase cursor-pointer inline-flex items-center gap-1 text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] disabled:opacity-40"
                          title="AI parse into tasks"
                        >
                          {parsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 accent-solid-text" />}
                          Parse
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          aria-label="Delete dump"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] font-mono text-[var(--fios-text-muted)] flex items-center gap-1">
              <CheckSquare className="w-3 h-3 shrink-0" /> AI parse creates tasks via Gemini tutor
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className={`w-12 h-12 min-w-12 rounded-2xl border fios-border-strong bg-[var(--fios-surface)]/95 backdrop-blur-xl text-[var(--fios-text)] shadow-xl flex items-center justify-center cursor-pointer hover:accent-border active:bg-[var(--fios-surface-2)] ${
          open ? 'accent-border accent-glow' : ''
        }`}
        aria-label="Brain dump inbox"
        aria-expanded={open}
        title="Brain dump"
      >
        {open ? <X className="w-5 h-5" /> : <Brain className="w-5 h-5 accent-solid-text" />}
      </motion.button>
    </div>
  );
};

export default BrainDumpInbox;
