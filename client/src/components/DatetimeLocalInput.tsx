import React, { useCallback, useId, useRef } from 'react';
import { CalendarClock } from 'lucide-react';

interface DatetimeLocalInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Reliable datetime picker: native `datetime-local` plus an explicit open button.
 * Splits updates through both onChange and onInput so browsers that stall
 * on styled controlled inputs still commit the selected value.
 */
export const DatetimeLocalInput: React.FC<DatetimeLocalInputProps> = ({
  id,
  value,
  onChange,
  required,
  disabled,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const autoId = useId();
  const inputId = id || autoId;
  const ref = useRef<HTMLInputElement>(null);

  const commit = useCallback(
    (raw: string) => {
      onChange(raw);
    },
    [onChange]
  );

  const openPicker = useCallback(() => {
    const el = ref.current;
    if (!el || disabled) return;
    el.focus();
    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
    try {
      anyEl.showPicker?.();
    } catch {
      /* older browsers — focus is enough for the native UI */
    }
  }, [disabled]);

  return (
    <div className={`relative flex items-stretch gap-1 ${className}`}>
      <input
        ref={ref}
        id={inputId}
        type="datetime-local"
        required={required}
        disabled={disabled}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => commit(e.target.value)}
        onInput={(e) => commit((e.target as HTMLInputElement).value)}
        className="fios-datetime-local w-full min-h-11 bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3.5 py-2.5 pr-11 text-sm font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border disabled:opacity-50"
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openPicker}
        aria-label="Open date and time picker"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target p-2 rounded-lg text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface)] cursor-pointer disabled:opacity-40"
      >
        <CalendarClock className="w-4 h-4" />
      </button>
    </div>
  );
};

export default DatetimeLocalInput;
