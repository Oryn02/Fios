/**
 * InlineEditableTitle — click-to-edit names for decks, docs, quizzes, code exams.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

interface Props {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const InlineEditableTitle: React.FC<Props> = ({
  value,
  onSave,
  className = '',
  inputClassName = '',
  placeholder = 'Untitled',
  disabled,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    const next = draft.trim() || placeholder;
    setEditing(false);
    if (next !== value) await onSave(next);
    else setDraft(value);
  };

  if (disabled) {
    return <span className={className}>{value || placeholder}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={inputClassName || 'bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2 py-1 text-sm font-bold text-[var(--fios-text)] focus:outline-none focus:accent-border w-full min-w-0'}
        aria-label="Edit title"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`group inline-flex items-center gap-1.5 min-w-0 text-left cursor-pointer ${className}`}
      title="Click to rename"
    >
      <span className="truncate">{value || placeholder}</span>
      <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-[var(--fios-text-muted)]" />
    </button>
  );
};

export default InlineEditableTitle;
