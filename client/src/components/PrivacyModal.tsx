import React from 'react';
import { motion } from 'framer-motion';
import { Shield, X } from 'lucide-react';

interface PrivacyModalProps {
  onClose: () => void;
  /** Landing page uses locked emerald styling; dashboard uses theme tokens. */
  variant?: 'dashboard' | 'landing';
}

/**
 * Shared Privacy Policy & GDPR statement (landing + Settings).
 * Keep user-facing: no internal tooling mentions.
 */
export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose, variant = 'dashboard' }) => {
  const landing = variant === 'landing';
  const heading = landing ? 'text-emerald-400' : 'accent-solid-text';
  const surface = landing
    ? 'border-slate-800 bg-[#0e131f] text-slate-100'
    : 'fios-border bg-[var(--fios-surface)] text-[var(--fios-text)]';
  const muted = landing ? 'text-slate-400' : 'text-[var(--fios-text-muted)]';
  const body = landing ? 'text-slate-300' : 'text-[var(--fios-text-muted)]';
  const iconBox = landing
    ? 'bg-[#07090e] border-slate-800 text-emerald-400'
    : 'bg-[var(--fios-surface-2)] border fios-border accent-solid-text';
  const closeBtn = landing
    ? 'bg-emerald-400 text-slate-950'
    : 'accent-bg text-slate-950';
  const strong = landing ? 'text-slate-200' : 'text-[var(--fios-text)]';

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-labelledby="privacy-title"
        className={`relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border p-6 sm:p-8 space-y-6 shadow-2xl ${surface}`}
      >
        <div className={`flex items-center justify-between border-b pb-4 ${landing ? 'border-slate-800' : 'fios-border'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${iconBox}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 id="privacy-title" className={`text-base font-black uppercase ${landing ? 'text-white' : 'text-[var(--fios-text)]'}`}>
                Privacy Policy & GDPR Statement
              </h3>
              <p className={`text-[11px] font-mono ${muted}`}>Fios Academic Command Center · v3.1.11 · Last updated September 2026</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={`${muted} hover:opacity-80 cursor-pointer p-1`} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`space-y-4 text-xs sm:text-sm leading-relaxed font-sans ${body}`}>
          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>1. Who we are (data controller)</h4>
            <p>
              Fios is a privacy-first academic study application (demo / reference project). For GDPR purposes, the operator of your
              deployed instance is the data controller. Contact for privacy requests:{' '}
              <a href="mailto:oryn02@gmail.com" className={heading}>oryn02@gmail.com</a>.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>2. What data we process</h4>
            <ul className={`list-disc list-inside space-y-1 pl-1 ${muted}`}>
              <li><strong className={strong}>Account:</strong> email and auth tokens via Supabase Auth (and optional GitHub OAuth if you enable it).</li>
              <li><strong className={strong}>Profile & prefs:</strong> display name, preferred name, optional birthday, theme/accent, Pomodoro durations, weekly study goal, nav/widget preferences, low-power / Zen / accessibility flags.</li>
              <li><strong className={strong}>Study content:</strong> modules (codes, names, exam dates, accent tags), Smart Notes / documents, flashcard decks, MCQ quizzes, code exams, academic tasks (titles, due/start times), grades, focus / Pomodoro logs, revision flight-plan state, study-streak activity, tutor chat history.</li>
              <li><strong className={strong}>Timetable:</strong> timetable entries, optional iCal feed URLs you connect, and a local/cloud cache of last-synced classes so your agenda works offline and reconciles when you are back online.</li>
              <li><strong className={strong}>BYO Gemini key:</strong> stored on your profile under Row Level Security so AI features can run with your key.</li>
              <li><strong className={strong}>Multi-modal uploads (optional):</strong> PDFs, photos, audio, and notes you attach in AI Tutor / Smart Notes are processed with <em>your</em> Gemini API key — content is sent to Google under your key’s terms, and retained by Fios only as your private study rows (not for advertising).</li>
              <li><strong className={strong}>Web Push subscriptions (optional):</strong> if you enable Class Reminders, your browser may store a push endpoint (and related subscription metadata) so upcoming-class alerts can be delivered. You can disable reminders anytime in Settings; endpoints are not used for marketing.</li>
              <li><strong className={strong}>Feedback & ratings (optional):</strong> see §3.</li>
              <li><strong className={strong}>Support contact (optional):</strong> see §4.</li>
              <li><strong className={strong}>Device / local:</strong> browser localStorage / sessionStorage / IndexedDB for consent, theme, offline mutation queue, PWA caches, and similar functional state — not sold to advertisers.</li>
              <li><strong className={strong}>What we do <em>not</em> collect:</strong> Fios does not run third-party advertising pixels, cross-site trackers, or product-analytics SDKs. Hosting may still produce ordinary operational server logs (IP, user-agent) needed to run the service.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>3. Feedback & ratings forms</h4>
            <p>
              The in-app Feedback & Ratings form is optional. When you submit it we process:
            </p>
            <ul className={`list-disc list-inside space-y-1 pl-1 ${muted}`}>
              <li><strong className={strong}>Collected:</strong> star rating (1–5), optional category tags (e.g. bug, feature, UX), and an optional free-text message (length-limited).</li>
              <li><strong className={strong}>Signed-in vs anonymous:</strong> if you are signed in and do <em>not</em> choose anonymous, your account user id is stored with the submission so we can follow up or spot duplicates. If you choose <strong className={strong}>Submit anonymously</strong>, no user id is stored. We do not require an email address on this form.</li>
              <li><strong className={strong}>Purpose:</strong> improve reliability, fix bugs, and understand product quality for this study app.</li>
              <li><strong className={strong}>Who receives it:</strong> the app operator (site operators may review feedback). Submissions are stored in the instance database under access controls; they are not sold or used for advertising.</li>
              <li><strong className={strong}>Lawful basis:</strong> your consent (Art. 6(1)(a)) when you voluntarily send feedback. You may withdraw consent by emailing us to erase a submission you can identify, or by requesting erasure of your account data where a user id was attached.</li>
              <li><strong className={strong}>Retention:</strong> kept until you request erasure or the operator deletes it as part of ordinary product hygiene. Do not include passwords, API keys, or other people’s personal data in feedback messages.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>4. Contact Support form</h4>
            <p>
              The Contact Support form (landing footer and Settings) lets you message the support inbox without opening your mail client.
            </p>
            <ul className={`list-disc list-inside space-y-1 pl-1 ${muted}`}>
              <li><strong className={strong}>Collected:</strong> message text (required); optional name and optional reply-to email.</li>
              <li><strong className={strong}>Purpose:</strong> respond to help requests, bugs, and account questions.</li>
              <li><strong className={strong}>Who receives it:</strong> delivered by email to the app operator’s support inbox (via the host’s configured email provider such as Resend or SendGrid when enabled). Mailto to the published support address remains an alternative.</li>
              <li><strong className={strong}>Lawful basis:</strong> consent and/or steps prior to a contract / legitimate interest in answering your request (Art. 6(1)(a)/(b)/(f)), depending on context.</li>
              <li><strong className={strong}>Retention:</strong> email correspondence is retained as ordinary support mail until you ask us to delete it or it is no longer needed.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>5. Why we process it (purposes & legal bases)</h4>
            <ul className={`list-disc list-inside space-y-1 pl-1 ${muted}`}>
              <li><strong className={strong}>Contract / service delivery</strong> — authenticate you and sync your study tools (Art. 6(1)(b)).</li>
              <li><strong className={strong}>Legitimate interests</strong> — security, abuse prevention, and improving reliability of a demo study app (Art. 6(1)(f)).</li>
              <li><strong className={strong}>Consent</strong> — optional feedback & ratings, Contact Support submissions, cookie/local preference banner acknowledgment, optional Class Reminders / Web Push, optional multimodal AI uploads you initiate, and optional GitHub gist export (Art. 6(1)(a)).</li>
            </ul>
            <p>We do not sell personal data or use lecture notes to train public foundation models.</p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>6. Third parties & processors</h4>
            <ul className={`list-disc list-inside space-y-1 pl-1 ${muted}`}>
              <li><strong className={strong}>Supabase</strong> — Postgres database, Auth, and Row Level Security for your account data (including optional feedback rows and push subscription records when used).</li>
              <li><strong className={strong}>Google Gemini</strong> — when you use AI features, prompts/content you submit are sent to Google using <em>your</em> API key (BYO). Subject to Google’s terms/privacy.</li>
              <li><strong className={strong}>GitHub</strong> — only if you sign in with GitHub or export a gist; limited to what you authorize.</li>
              <li><strong className={strong}>Render (or your host)</strong> — hosts the web app and API; receives standard server logs (IP, user-agent) needed to operate the service.</li>
              <li><strong className={strong}>Email delivery (optional)</strong> — Resend or SendGrid when configured, solely to deliver Contact Support messages to the operator inbox.</li>
              <li><strong className={strong}>Browser push services</strong> — when Class Reminders / Web Push are enabled, your browser vendor’s push infrastructure may process the subscription endpoint.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>7. Cookies & local storage</h4>
            <p>
              Fios uses essential storage for sign-in session tokens and functional preferences (theme, nav, consent flag, offline queue, PWA caches).
              We do not run third-party advertising or cross-site tracking pixels. You can reset the consent banner from Settings and clear
              browser storage at any time.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>8. Retention</h4>
            <p>
              Account and study data are kept while your account remains active. Local caches last until you clear them or uninstall the PWA.
              Optional feedback is retained as described in §3; support email as in §4.
              Push subscription records are removed or become inactive when you disable reminders or clear site data.
              Server logs on the host are retained according to the host’s defaults (typically short-lived operational logs).
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>9. International transfers</h4>
            <p>
              Supabase, Google, GitHub, Render, and optional email/push providers may process data in the EU and/or other regions. Where transfers occur, they rely on the
              providers’ appropriate safeguards (e.g. SCCs). Choose regions/providers carefully when you self-host.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>10. Your rights</h4>
            <p>Under GDPR you may request:</p>
            <ul className={`list-disc list-inside space-y-1 pl-1 ${muted}`}>
              <li>Access and portability — use <strong className={strong}>Export My Data (JSON)</strong> in Settings, or email us.</li>
              <li>Rectification — update your profile in Settings.</li>
              <li>Erasure — clear local storage, delete content in-app, and/or email us to delete your account/rows (including identifiable feedback).</li>
              <li>Restriction or objection to certain processing, and withdrawal of consent where processing is consent-based (feedback, push, optional uploads).</li>
              <li>Complaint to your supervisory authority (in Ireland: the Data Protection Commission).</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>11. Children</h4>
            <p>
              Fios is aimed at adults in higher education. Do not create an account if you are under 16 without appropriate guardian consent
              where required by local law.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>12. Changes</h4>
            <p>
              We may update this statement as features evolve. Material changes will be reflected in the in-app Privacy Policy (Settings and
              landing footer) and the version label above. Continued use after an update constitutes acknowledgment of the revised statement.
            </p>
          </section>
        </div>

        <div className={`border-t pt-4 flex justify-end ${landing ? 'border-slate-800' : 'fios-border'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 font-black uppercase text-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity ${closeBtn}`}
          >
            Close Policy
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyModal;
