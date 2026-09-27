import React, { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import {
  submitContentFlag,
  FLAG_REASONS,
  type FlagTargetType,
  type FlagReason,
} from '../lib/contentFlagsService';
import { toast } from '../lib/toast';

interface ReportContentButtonProps {
  targetType: FlagTargetType;
  targetId?: string | null;
  targetLabel?: string;
  className?: string;
  /** Compact icon-only control for dense lists. */
  compact?: boolean;
}

/**
 * Lightweight report control for decks / docs / tasks.
 * Writes to content_flags (requires schema migration).
 */
export const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  targetType,
  targetId,
  targetLabel,
  className = '',
  compact = true,
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason>('other');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await submitContentFlag({
        targetType,
        targetId,
        targetLabel,
        reason,
        details,
      });
      toast('Report submitted', 'success');
      setOpen(false);
      setDetails('');
      setReason('other');
    } catch (err: any) {
      toast(
        err?.message?.includes('content_flags')
          ? 'Report unavailable — apply content_flags migration in Supabase'
          : err?.message || 'Report failed',
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ||
          (compact
            ? 'text-[var(--fios-text-muted)] hover:text-amber-400 p-0.5 cursor-pointer'
            : 'inline-flex items-center gap-1 text-[10px] font-mono accent-solid-text cursor-pointer')
        }
        title="Report content"
        aria-label="Report content"
      >
        <Flag className="w-3.5 h-3.5" />
        {!compact && <span>Report</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-xs"
          onClick={() => !busy && setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl border fios-border bg-[var(--fios-surface)] p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Report content"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider accent-solid-text flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Report
              </h3>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="text-[var(--fios-text-muted)] cursor-pointer p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] font-mono text-[var(--fios-text-muted)] truncate">
              {targetType}
              {targetLabel ? ` · ${targetLabel}` : ''}
            </p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as FlagReason)}
              className="w-full rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[11px] font-mono text-[var(--fios-text)] px-2 py-2 cursor-pointer"
            >
              {FLAG_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Optional details…"
              rows={3}
              className="w-full rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[11px] text-[var(--fios-text)] px-2 py-2 resize-none"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full px-3 py-2 rounded-lg accent-bg text-slate-950 text-[10px] font-black uppercase cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
              Submit report
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportContentButton;
