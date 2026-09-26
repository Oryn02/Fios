import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 2 + (t.startsWith(q) ? 1 : 0);
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 0.5 : 0;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, items }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const scored = items
      .map((item) => {
        const hay = [item.label, item.hint || '', ...(item.keywords || [])].join(' ');
        return { item, score: fuzzyScore(query, hay) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item).slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const run = useCallback((item: CommandItem) => {
    item.action();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[active]) {
        e.preventDefault();
        run(filtered[active]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, filtered, active, run]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border fios-border bg-[var(--fios-surface)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b fios-border">
              <Search className="w-4 h-4 text-[var(--fios-text-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a tab or action…"
                className="flex-1 bg-transparent text-sm text-[var(--fios-text)] placeholder:text-[var(--fios-text-muted)] focus:outline-none"
                aria-autocomplete="list"
              />
              <kbd className="hidden sm:inline text-[10px] font-mono text-[var(--fios-text-muted)] border fios-border px-1.5 py-0.5 rounded">esc</kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto py-2" role="listbox">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-[var(--fios-text-muted)] font-mono">No matches</li>
              ) : (
                filtered.map((item, i) => (
                  <li key={item.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onClick={() => run(item)}
                      onMouseEnter={() => setActive(i)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left cursor-pointer ${
                        i === active ? 'bg-[var(--fios-surface-2)] accent-solid-text' : 'text-[var(--fios-text)]'
                      }`}
                    >
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="flex items-center gap-2 text-[10px] font-mono text-[var(--fios-text-muted)]">
                        {item.hint}
                        {i === active && <CornerDownLeft className="w-3 h-3" />}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
