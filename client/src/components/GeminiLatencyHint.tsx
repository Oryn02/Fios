import React, { useEffect, useState } from 'react';
import { ExternalLink, Gauge, Info } from 'lucide-react';
import {
  AI_STUDIO_HOME_URL,
  GEMINI_BILLING_DOCS_URL,
  GEMINI_RATE_LIMIT_DOCS_URL,
  isGeminiLatencyError,
} from '../lib/geminiUx';

interface GeminiLatencyHintProps {
  /** When true (error path or explicit), show the full free-tier guidance. */
  show?: boolean;
  /** Optional error / status text — shown if it looks like a latency issue. */
  error?: string | null;
  /**
   * When an AI call is in flight, show a softer “still working” tip after this many ms.
   * Default 12s. Pass 0 to disable.
   */
  busy?: boolean;
  slowAfterMs?: number;
  className?: string;
  compact?: boolean;
}

/**
 * Helpful (not salesy) prompt when free-tier Gemini feels slow or times out.
 * Explains rate limits / shared quota / cold starts and links to AI Studio + billing docs.
 */
export const GeminiLatencyHint: React.FC<GeminiLatencyHintProps> = ({
  show,
  error,
  busy = false,
  slowAfterMs = 12_000,
  className = '',
  compact = false,
}) => {
  const [slowWait, setSlowWait] = useState(false);

  useEffect(() => {
    if (!busy || !slowAfterMs) {
      setSlowWait(false);
      return;
    }
    setSlowWait(false);
    const id = window.setTimeout(() => setSlowWait(true), slowAfterMs);
    return () => window.clearTimeout(id);
  }, [busy, slowAfterMs]);

  const fromError = !!(error && isGeminiLatencyError(error));
  const visible = show || fromError || slowWait;
  if (!visible) return null;

  const title = fromError || show
    ? 'Free Gemini keys can feel slow'
    : 'Still waiting on Gemini…';

  return (
    <div
      role="status"
      className={`rounded-xl border fios-border bg-[var(--fios-surface-2)]/90 text-left ${compact ? 'px-3 py-2.5 space-y-1.5' : 'px-3.5 py-3 space-y-2'} ${className}`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0 text-amber-400/90">
          {fromError || show ? <Gauge className="w-4 h-4" /> : <Info className="w-4 h-4" />}
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--fios-text-muted)]">
            {title}
          </p>
          <p className="text-xs text-[var(--fios-text-muted)] leading-relaxed">
            Google&apos;s <strong className="text-[var(--fios-text)]">free-tier</strong> API keys share limited
            quota with many other users. That means tighter <strong className="text-[var(--fios-text)]">rate limits</strong>,
            occasional <strong className="text-[var(--fios-text)]">cold starts</strong>, and{' '}
            <strong className="text-[var(--fios-text)]">lower priority</strong> when demand is high — so flashcards,
            quizzes, and the tutor can stall or time out even when your key is valid.
          </p>
          <p className="text-xs text-[var(--fios-text-muted)] leading-relaxed">
            A <strong className="text-[var(--fios-text)]">paid Gemini API key</strong> (billing enabled in Google AI Studio)
            usually speeds Fios up a lot: higher quotas, fewer 429 / timeout errors, and lower latency because requests
            are not stuck behind free-tier shared capacity. Optional — only if free-tier delays keep getting in your way.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            <a
              href={AI_STUDIO_HOME_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold accent-solid-text hover:underline"
            >
              Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={GEMINI_BILLING_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--fios-text-muted)] hover:accent-solid-text hover:underline"
            >
              Billing docs <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={GEMINI_RATE_LIMIT_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--fios-text-muted)] hover:accent-solid-text hover:underline"
            >
              Rate limits <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiLatencyHint;
