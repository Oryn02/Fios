import React from 'react';
import { motion } from 'framer-motion';
import { Cookie, X } from 'lucide-react';

interface CookiePolicyModalProps {
  onClose: () => void;
}

/**
 * Cookie Policy — essential vs analytics transparency for Fios v2.2.0.
 */
export const CookiePolicyModal: React.FC<CookiePolicyModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
    <div className="absolute inset-0" onClick={onClose} aria-hidden />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-labelledby="cookie-policy-title"
      className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 sm:p-8 space-y-6 shadow-2xl text-[var(--fios-text)]"
    >
      <div className="flex items-center justify-between border-b fios-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text">
            <Cookie className="w-5 h-5" />
          </div>
          <div>
            <h3 id="cookie-policy-title" className="text-base font-black uppercase text-[var(--fios-text)]">
              Cookie Policy
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
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">1. Overview</h4>
          <p>
            Fios uses browser storage (cookies where applicable, plus <code className="accent-solid-text">localStorage</code> /
            <code className="accent-solid-text">sessionStorage</code> / IndexedDB) to keep you signed in, remember preferences,
            and queue offline study actions. We do not sell personal data or run third-party advertising networks.
          </p>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">2. Essential cookies & storage</h4>
          <p>Required for the app to function. These cannot be disabled without breaking core features:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Supabase auth session tokens (sign-in / session refresh)</li>
            <li>Theme, accent, accessibility, and widget layout preferences</li>
            <li>Cookie consent acknowledgment (<code className="accent-solid-text">fios_cookie_consent</code>)</li>
            <li>Offline mutation queue (IndexedDB) for reconnect sync</li>
            <li>Demo-mode flag when you choose Explore Live Demo</li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">3. Analytics cookies</h4>
          <p>
            Fios v2.2.0 does <strong className="text-[var(--fios-text)]">not</strong> set third-party analytics or advertising cookies
            by default. If product analytics are added later, they will be optional, disclosed here, and controllable from Settings.
          </p>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">4. Your choices</h4>
          <p>
            Use the cookie banner to acknowledge essential storage. In Settings you can reset consent (banner returns),
            clear local data, or export / delete account study data under GDPR rights.
          </p>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">5. Contact</h4>
          <p>
            Questions about cookies or privacy: use Contact Support in Settings, or review the Privacy Policy &amp; GDPR statement.
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

export default CookiePolicyModal;
