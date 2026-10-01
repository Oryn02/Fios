import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';

export const CONSENT_KEY = 'fios_cookie_consent';

export type ConsentPrefs = {
  accepted: boolean;
  essential: true;
  /** Theme/nav/widget preference persistence beyond bare essentials */
  preferences: boolean;
  at: string;
};

export function readConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentPrefs>;
    return {
      accepted: Boolean(parsed.accepted),
      essential: true,
      preferences: parsed.preferences !== false,
      at: typeof parsed.at === 'string' ? parsed.at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * True when the user has opted into preference-category local persistence.
 * Prefer consent before writing non-essential keys; essential storage is always allowed.
 * Reading previously stored preference keys still works so the UI does not flash defaults.
 */
export function preferencesAllowed(): boolean {
  const c = readConsent();
  if (!c) return false;
  return c.preferences === true;
}

/** Write a preferences-category localStorage key only when consent allows. */
export function setPreferenceLocal(key: string, value: string): void {
  if (!preferencesAllowed()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export function resetCookieConsent() {
  localStorage.removeItem(CONSENT_KEY);
  window.dispatchEvent(new Event('fios-cookie-reset'));
}

export function openPrivacyFromConsent() {
  window.dispatchEvent(new Event('fios-open-privacy'));
}

export function openCookiePolicyFromConsent() {
  window.dispatchEvent(new Event('fios-open-cookies'));
}

function writeConsent(prefs: Omit<ConsentPrefs, 'at' | 'essential'>) {
  const payload: ConsentPrefs = {
    accepted: true,
    essential: true,
    preferences: prefs.preferences,
    at: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event('fios-cookie-updated'));
}

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefToggle, setPrefToggle] = useState(true);

  useEffect(() => {
    const check = () => setVisible(!localStorage.getItem(CONSENT_KEY));
    check();
    window.addEventListener('fios-cookie-reset', check);
    return () => window.removeEventListener('fios-cookie-reset', check);
  }, []);

  const acceptEssentialOnly = () => {
    writeConsent({ accepted: true, preferences: false });
    setVisible(false);
    setShowPrefs(false);
  };

  const acceptAll = () => {
    writeConsent({ accepted: true, preferences: true });
    setVisible(false);
    setShowPrefs(false);
  };

  const saveCustom = () => {
    writeConsent({ accepted: true, preferences: prefToggle });
    setVisible(false);
    setShowPrefs(false);
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
                security, offline study caches, and PWA install state so the app keeps working. Optional{' '}
                <strong className="text-[var(--fios-text)]">preferences</strong> storage remembers theme, nav layout, and
                similar UI choices. We do not sell data or run third-party ad trackers / analytics SDKs. Your Gemini API
                key is never stored in a cookie.
              </p>

              {showPrefs && (
                <label className="flex items-start gap-2 text-[11px] text-[var(--fios-text-muted)] border fios-border rounded-lg p-2 bg-[var(--fios-surface-2)]">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={prefToggle}
                    onChange={(e) => setPrefToggle(e.target.checked)}
                  />
                  <span>
                    <strong className="text-[var(--fios-text)]">Preferences</strong> — save theme, accent, widget order,
                    and nav slots locally (and sync to your profile when signed in). Essential storage stays on.
                  </span>
                </label>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {!showPrefs ? (
                  <>
                    <button
                      type="button"
                      onClick={acceptAll}
                      className="touch-target-row px-4 py-2.5 min-h-11 accent-bg text-slate-950 text-[11px] font-black uppercase rounded-lg cursor-pointer active:opacity-90"
                    >
                      Accept all
                    </button>
                    <button
                      type="button"
                      onClick={acceptEssentialOnly}
                      className="touch-target-row px-3 py-2.5 min-h-11 text-[11px] font-mono font-bold uppercase border fios-border rounded-lg text-[var(--fios-text)] cursor-pointer"
                    >
                      Essential only
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrefs(true)}
                      className="touch-target-row px-3 py-2.5 min-h-11 text-[11px] font-mono font-bold uppercase accent-solid-text cursor-pointer underline"
                    >
                      Preferences
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={saveCustom}
                    className="touch-target-row px-4 py-2.5 min-h-11 accent-bg text-slate-950 text-[11px] font-black uppercase rounded-lg cursor-pointer"
                  >
                    Save choices
                  </button>
                )}
                <button
                  type="button"
                  onClick={openCookiePolicyFromConsent}
                  className="touch-target-row px-3 py-2.5 min-h-11 text-[11px] font-mono font-bold uppercase accent-solid-text cursor-pointer underline"
                >
                  Cookie Policy
                </button>
                <button
                  type="button"
                  onClick={openPrivacyFromConsent}
                  className="touch-target-row px-3 py-2.5 min-h-11 text-[11px] font-mono font-bold uppercase accent-solid-text cursor-pointer underline"
                >
                  Privacy
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
