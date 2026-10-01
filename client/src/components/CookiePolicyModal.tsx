import React from 'react';
import { motion } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface CookiePolicyModalProps {
  onClose: () => void;
  variant?: 'dashboard' | 'landing';
  onOpenPrivacy?: () => void;
}

type Row = { name: string; purpose: string; type: string; retention: string; thirdParty: string };

const ROWS: Row[] = [
  {
    name: 'Supabase Auth session (sb-*-auth-token)',
    purpose: 'Keep you signed in securely across reloads',
    type: 'Essential · cookie / localStorage (provider)',
    retention: 'Session / provider TTL; cleared on sign-out',
    thirdParty: 'Supabase Auth',
  },
  {
    name: 'fios_cookie_consent',
    purpose: 'Stores your essential / preferences consent choice',
    type: 'Essential · localStorage',
    retention: 'Until you reset consent in Settings or clear site data',
    thirdParty: 'None',
  },
  {
    name: 'fios_theme / fios_accent',
    purpose: 'Remember appearance (theme mode & accent)',
    type: 'Preferences · localStorage',
    retention: 'Until changed or cleared; written only after Preferences consent',
    thirdParty: 'None',
  },
  {
    name: 'fios_preferences (and related nav/widget keys)',
    purpose: 'Widget order, mobile nav slots, Zen / low-power / a11y flags',
    type: 'Preferences · localStorage (+ optional profile prefs sync)',
    retention: 'Until changed or cleared; written only after Preferences consent',
    thirdParty: 'None (cloud copy only if signed in)',
  },
  {
    name: 'fios_user_profile (cache)',
    purpose: 'Fast local paint of profile fields while online sync catches up',
    type: 'Essential/functional · localStorage',
    retention: 'Until sign-out / clear',
    thirdParty: 'None',
  },
  {
    name: 'fios_review_days (streaks cache)',
    purpose: 'Local flashcard review-day map for heatmap / streak widgets',
    type: 'Essential/functional · localStorage',
    retention: 'Rotated as you study; cleared with site data',
    thirdParty: 'None',
  },
  {
    name: 'fios_unlocked_rewards',
    purpose: 'Cache RPG unlocks (e.g. locked accent themes) for fast UI',
    type: 'Essential/functional · localStorage',
    retention: 'Until refreshed from profile / cleared',
    thirdParty: 'None',
  },
  {
    name: 'fios_fsrs_opt_in',
    purpose: 'Remember whether you opted into FSRS scheduling locally',
    type: 'Preferences · localStorage',
    retention: 'Until changed or cleared',
    thirdParty: 'None',
  },
  {
    name: 'fios_lms_connection (cache)',
    purpose: 'Remember last LMS base URL / connection hint for Settings reconnect UX',
    type: 'Essential/functional · localStorage (tokens live under RLS on your connection row)',
    retention: 'Until cleared; secrets are not meant to live long-term in cookies',
    thirdParty: 'None (sync calls go to your LMS when you connect)',
  },
  {
    name: 'Calendar / schedule caches (fios_calendar_state, fios_schedule_meta, fios_manual_schedule)',
    purpose: 'Offline agenda + last-synced timetable so Schedule keeps working',
    type: 'Essential/functional · localStorage',
    retention: 'Rotated on sync; cleared with site data',
    thirdParty: 'None',
  },
  {
    name: 'fios-offline-queue (IndexedDB)',
    purpose: 'Queue study/calendar mutations while offline; flush when online',
    type: 'Essential · IndexedDB',
    retention: 'Until flushed or cleared',
    thirdParty: 'None',
  },
  {
    name: 'Daily queue / entity caches (IndexedDB / localStorage)',
    purpose: 'Cache due cards & lists for offline review and snappy UI',
    type: 'Essential/functional · IndexedDB / localStorage',
    retention: 'Rotated on refresh; cleared with site data',
    thirdParty: 'None',
  },
  {
    name: 'PWA / Workbox caches',
    purpose: 'Installable app shell & static assets for offline use',
    type: 'Essential · Cache Storage',
    retention: 'Until update or uninstall',
    thirdParty: 'None',
  },
  {
    name: 'Push subscription (browser) / fios_vapid_public_key',
    purpose: 'Optional Class Reminders via Web Push when you enable them',
    type: 'Consent-based · browser push + server endpoint store',
    retention: 'Until you disable reminders or clear site data',
    thirdParty: 'Browser push service; host API',
  },
  {
    name: 'Gemini API key',
    purpose:
      'BYO key for AI features — stored on your encrypted profile row under RLS (session may hold it in memory while you use AI). Never placed in cookies or preference localStorage.',
    type: 'Not a cookie · account secret',
    retention: 'Until you remove it in Settings',
    thirdParty: 'Sent only to Google Gemini when you invoke AI',
  },
];

/**
 * Dedicated Cookie Policy — categories of cookies / local storage used by Fios.
 * User-facing only; no internal tooling mentions.
 */
export const CookiePolicyModal: React.FC<CookiePolicyModalProps> = ({
  onClose,
  variant = 'dashboard',
  onOpenPrivacy,
}) => {
  useBodyScrollLock(true, '[data-modal-scroll]');
  const landing = variant === 'landing';
  const heading = landing ? 'text-emerald-400' : 'accent-solid-text';
  const surface = landing
    ? 'border-border bg-card text-foreground'
    : 'fios-border bg-[var(--fios-surface)] text-[var(--fios-text)]';
  const muted = landing ? 'text-muted-foreground' : 'text-[var(--fios-text-muted)]';
  const body = landing ? 'text-foreground' : 'text-[var(--fios-text-muted)]';
  const iconBox = landing
    ? 'bg-background border-border text-emerald-400'
    : 'bg-[var(--fios-surface-2)] border fios-border accent-solid-text';
  const closeBtn = landing ? 'bg-emerald-400 text-slate-950' : 'accent-bg text-slate-950';
  const borderCls = landing ? 'border-border' : 'fios-border';
  const headerBg = landing ? 'bg-card/95' : 'bg-[hsl(var(--background)/0.95)]';
  const footerBg = landing ? 'bg-card' : 'bg-[hsl(var(--background))]';
  const strong = landing ? 'text-foreground' : 'text-[var(--fios-text)]';

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-policy-title"
        className={`relative z-50 w-full max-w-3xl max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl border shadow-sm dark:shadow-none ${surface}`}
      >
        <div className={`sticky top-0 z-10 shrink-0 flex items-center justify-between gap-3 border-b px-5 py-3.5 sm:px-6 ${borderCls} ${headerBg} backdrop-blur-md`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg border shrink-0 ${iconBox}`}>
              <Cookie className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="cookie-policy-title" className={`text-base font-black uppercase truncate ${strong}`}>
                Cookie Policy
              </h3>
              <p className={`text-[11px] font-mono truncate ${muted}`}>
                Fios Academic Command Center · v4.0.0 · October 2026
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={`touch-target shrink-0 rounded-lg cursor-pointer ${muted}`} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-modal-scroll className={`flex-1 min-h-0 overflow-y-auto scroll-touch px-5 py-4 sm:px-6 sm:py-5 space-y-4 text-xs sm:text-sm leading-relaxed ${body}`}>
          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>1. Overview</h4>
            <p>
              Fios uses first-party browser storage (cookies where the auth provider sets them, plus localStorage,
              IndexedDB, and Cache Storage) to run the study app. Non-essential preference keys are written only after
              you accept Preferences (or Accept all) on the consent banner. We do <strong className={strong}>not</strong> use
              third-party advertising cookies or product-analytics SDKs. See also the{' '}
              <button type="button" className={`${heading} underline cursor-pointer`} onClick={onOpenPrivacy}>
                Privacy Policy & GDPR statement
              </button>
              .
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>2. Categories</h4>
            <ul className={`list-disc list-inside space-y-1 pl-1 ${muted}`}>
              <li><strong className={strong}>Essential</strong> — required for sign-in, security, offline queues, and core study function. These run so the app works even if you choose “Essential only”.</li>
              <li><strong className={strong}>Preferences</strong> — optional UI memory (theme, nav, widgets). Controlled from the consent banner.</li>
              <li><strong className={strong}>Consent-based features</strong> — e.g. Web Push class reminders you explicitly enable.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>3. Inventory</h4>
            <div className="space-y-3">
              {ROWS.map((r) => (
                <div key={r.name} className={`rounded-xl border p-3 space-y-1 ${landing ? 'border-border bg-background/40' : 'fios-border bg-[var(--fios-surface-2)]'}`}>
                  <p className={`text-[11px] font-mono font-bold ${strong}`}>{r.name}</p>
                  <p className={`text-[11px] ${muted}`}><span className={strong}>Purpose:</span> {r.purpose}</p>
                  <p className={`text-[11px] ${muted}`}><span className={strong}>Type:</span> {r.type}</p>
                  <p className={`text-[11px] ${muted}`}><span className={strong}>Retention:</span> {r.retention}</p>
                  <p className={`text-[11px] ${muted}`}><span className={strong}>Third party:</span> {r.thirdParty}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>4. Managing consent</h4>
            <p>
              Use the banner choices (Accept all / Essential only / Preferences), or reset the banner anytime from
              Settings → Cookie consent. You can also clear site data in your browser. Essential storage may be
              recreated as needed for sign-in and offline study.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>5. Contact</h4>
            <p>
              Privacy questions:{' '}
              <a href="mailto:oryn02@gmail.com" className={heading}>oryn02@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className={`shrink-0 border-t px-5 py-3 sm:px-6 flex justify-end ${borderCls} ${footerBg}`}>
          <button
            type="button"
            onClick={onClose}
            className={`touch-target-row px-5 py-2.5 min-h-11 font-black uppercase text-xs rounded-xl cursor-pointer hover:opacity-90 ${closeBtn}`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CookiePolicyModal;
