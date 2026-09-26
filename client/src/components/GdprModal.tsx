import React from 'react';
import { motion } from 'framer-motion';
import { Scale, X } from 'lucide-react';

interface GdprModalProps {
  onClose: () => void;
}

/**
 * Dedicated GDPR compliance details — public, no auth required.
 */
export const GdprModal: React.FC<GdprModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
    <div className="absolute inset-0" onClick={onClose} aria-hidden />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-labelledby="gdpr-title"
      className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 sm:p-8 space-y-6 shadow-2xl text-[var(--fios-text)]"
    >
      <div className="flex items-center justify-between border-b fios-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 id="gdpr-title" className="text-base font-black uppercase text-[var(--fios-text)]">
              GDPR Compliance
            </h3>
            <p className="text-[11px] font-mono text-[var(--fios-text-muted)]">Fios Academic Command Center · v2.2.0</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer p-1" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-[var(--fios-text-muted)] leading-relaxed">
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">1. Legal basis</h4>
          <p>
            Fios processes personal data under GDPR Art. 6(1)(b) (contract / service delivery for your study account)
            and Art. 6(1)(f) (legitimate interests in securing the service). Optional analytics cookies are not used in v2.2.0.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">2. Categories of data</h4>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Identity &amp; auth: email, auth tokens (Supabase)</li>
            <li>Study content: notes, decks, quizzes, code exams, focus logs</li>
            <li>Preferences: theme, accessibility, widget layout</li>
            <li>Technical: essential browser storage / offline queue</li>
          </ul>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">3. Processors</h4>
          <p>
            Supabase (database &amp; auth), Google Gemini (when you supply a BYO API key — requests use your key),
            and optional email delivery (Resend/SendGrid) for in-app support messages. Data is not sold.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">4. Your rights</h4>
          <p>
            You may access, rectify, export, or erase your data (Settings → export / clear). You may withdraw consent
            for non-essential storage by resetting cookie consent. Contact support for DSARs.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">5. Retention</h4>
          <p>
            Account data is retained while your account exists. Deleting your account removes associated rows under
            Supabase RLS cascade policies. Local caches can be cleared from the browser or Settings.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">6. Related documents</h4>
          <p>
            See also the Privacy Policy, Terms of Service, and Cookie Policy linked from the landing footer —
            all available without signing in.
          </p>
        </section>
      </div>

      <div className="border-t fios-border pt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer hover:opacity-90"
        >
          Close
        </button>
      </div>
    </motion.div>
  </div>
);

export default GdprModal;
