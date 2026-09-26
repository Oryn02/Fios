import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'fios_cookie_consent';

export function resetCookieConsent() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('fios-cookie-reset'));
}

/** Open shared Privacy Policy from the consent banner (Landing/Settings listen). */
export function openPrivacyFromConsent() {
  window.dispatchEvent(new Event('fios-open-privacy'));
}

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(!localStorage.getItem(STORAGE_KEY));
    check();
    window.addEventListener('fios-cookie-reset', check);
    return () => window.removeEventListener('fios-cookie-reset', check);
  }, []);

  const accept = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: true, essential: true, at: new Date().toISOString() })
    );
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[95] rounded-2xl border fios-border bg-[var(--fios-surface)] p-4 shadow-2xl font-sans"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text shrink-0">
              <Cookie className="w-4 h-4" />
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-xs font-bold text-[var(--fios-text)]">Cookies & local storage</p>
              <p className="text-[11px] text-[var(--fios-text-muted)] leading-relaxed">
                Fios uses <strong className="text-[var(--fios-text)]">essential</strong> browser storage for sign-in,
                preferences, and offline study caches. We do not sell data or run third-party ad trackers.
                Details on processors (Supabase, Gemini, GitHub, hosting) are in our Privacy Policy.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={accept}
                  className="touch-target-row px-4 py-2.5 min-h-11 accent-bg text-slate-950 text-[11px] font-black uppercase rounded-lg cursor-pointer active:opacity-90"
                >
                  Accept essential
                </button>
                <button
                  type="button"
                  onClick={openPrivacyFromConsent}
                  className="touch-target-row px-3 py-2.5 min-h-11 text-[11px] font-mono font-bold uppercase accent-solid-text cursor-pointer underline active:opacity-80"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
