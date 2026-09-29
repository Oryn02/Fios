import React from 'react';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ModalShellProps {
  open?: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Extra classes on the panel */
  panelClassName?: string;
  /** Landing emerald vs dashboard theme tokens for header strip */
  landing?: boolean;
  /** Max width utility, default max-w-2xl */
  maxWidthClass?: string;
  /** Allow nested scroll inside panel */
  allowScrollSelector?: string;
  footer?: React.ReactNode;
}

/**
 * Shared mobile-safe modal: z-40 backdrop / z-50 panel, body scroll lock,
 * sticky header with immediate 44px close control.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  open = true,
  onClose,
  title,
  subtitle,
  children,
  panelClassName = '',
  landing = false,
  maxWidthClass = 'max-w-2xl',
  allowScrollSelector = '[data-modal-scroll]',
  footer,
}) => {
  useBodyScrollLock(open, allowScrollSelector);
  if (!open) return null;

  const border = landing ? 'border-slate-800' : 'fios-border';
  const surface = landing
    ? 'border-slate-800 bg-[#0e131f] text-slate-100'
    : 'fios-border bg-[var(--fios-surface)] text-[var(--fios-text)]';
  const muted = landing ? 'text-slate-400' : 'text-[var(--fios-text-muted)]';
  const headerBg = landing ? 'bg-[#0e131f]' : 'bg-[var(--fios-surface)]';

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-50 w-full ${maxWidthClass} max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl border shadow-2xl ${surface} ${panelClassName}`}
      >
        <div
          className={`sticky top-0 z-10 shrink-0 flex items-center justify-between gap-3 border-b px-5 py-3.5 sm:px-6 ${border} ${headerBg}/95 backdrop-blur-md`}
        >
          <div className="min-w-0">
            <div className="text-base font-black uppercase truncate">{title}</div>
            {subtitle ? <div className={`text-[11px] font-mono mt-0.5 truncate ${muted}`}>{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`touch-target shrink-0 rounded-lg cursor-pointer ${muted} hover:opacity-80 active:opacity-70`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div data-modal-scroll className="flex-1 min-h-0 overflow-y-auto scroll-touch px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
        {footer ? (
          <div className={`shrink-0 border-t px-5 py-3 sm:px-6 ${border} ${headerBg}`}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
};

export default ModalShell;
