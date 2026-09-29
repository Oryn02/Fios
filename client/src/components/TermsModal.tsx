import React from 'react';
import { motion } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface TermsModalProps {
  onClose: () => void;
  variant?: 'dashboard' | 'landing';
}

export const TermsModal: React.FC<TermsModalProps> = ({ onClose, variant = 'dashboard' }) => {
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

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-labelledby="tos-title"
        className={`relative z-50 w-full max-w-2xl max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl border shadow-2xl ${surface}`}
      >
        <div className={`sticky top-0 z-10 shrink-0 flex items-center justify-between gap-3 border-b px-5 py-3.5 sm:px-6 backdrop-blur-md ${landing ? 'border-border bg-card/95' : 'fios-border bg-[hsl(var(--background)/0.95)]'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg border shrink-0 ${iconBox}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="tos-title" className={`text-base font-black uppercase truncate ${landing ? 'text-foreground' : 'text-[var(--fios-text)]'}`}>
                Terms of Service
              </h3>
              <p className={`text-[11px] font-mono truncate ${muted}`}>Fios Academic Command Center · v3.7.5 · September 2026</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={`touch-target shrink-0 rounded-lg cursor-pointer ${muted} hover:opacity-80`} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-modal-scroll className={`flex-1 min-h-0 overflow-y-auto scroll-touch px-5 py-4 sm:px-6 sm:py-5 space-y-4 text-xs sm:text-sm leading-relaxed ${body}`}>
          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>1. Acceptance</h4>
            <p>
              By accessing or using Fios you agree to these Terms and our Privacy Policy (available from the landing footer and Settings).
              Fios is a demonstration / academic study tool built with AI assistance and is provided as-is without warranties of fitness
              for a particular purpose.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>2. Bring-your-own key (Gemini)</h4>
            <p>
              AI features require your own Google Gemini API key. You are responsible for usage quotas, billing, key security, and compliance
              with Google’s terms. Content you send to AI endpoints — including optional PDF, photo, and audio uploads — is processed by Google under those terms. Fios does not resell AI access.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>3. Accounts & third-party services</h4>
            <p>
              Authentication and data storage use Supabase. Optional GitHub sign-in or gist export uses GitHub APIs you authorize.
              Hosting (e.g. Render) may process connection logs. Optional support email delivery may use Resend or SendGrid when configured.
              Your use of those services is also subject to their terms and privacy notices.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>4. Class reminders (Web Push)</h4>
            <p>
              Push / browser notifications for upcoming classes are an optional convenience. Enabling them does not guarantee you will attend,
              arrive on time, or that your timetable feed is complete or accurate. Always verify official schedules with your institution.
              You can turn reminders off in Settings at any time.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>5. Feedback, ratings & support</h4>
            <p>
              Optional Feedback & Ratings submissions (star rating, categories, message; anonymous or signed-in) and Contact Support messages
              (message plus optional name / reply-to email) are reviewed by the app operator to improve the product and respond to requests.
              Do not include secrets, API keys, passwords, or other people’s personal data without a lawful basis. Abuse, spam, or unlawful content
              may be refused or removed.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>6. Acceptable use</h4>
            <p>
              Do not use Fios to violate your institution’s academic integrity policy, upload malware, harass others, infringe IP rights,
              or attempt unauthorized access to systems.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>7. Your content & privacy</h4>
            <p>
              You retain ownership of notes, decks, and uploads. Content is stored in your private Supabase rows under Row Level Security.
              You may export a JSON copy of your study data from Settings or request erasure as described in the Privacy Policy.
              Processing of feedback, support messages, push subscriptions, and local/PWA storage is described there in full.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>8. Limitation of liability</h4>
            <p>
              To the fullest extent permitted by law, the authors are not liable for grades, exam outcomes, missed classes, data loss, or third-party API outages.
              Always verify AI-generated study material and timetable data independently. Nothing in these terms limits rights that cannot be waived under applicable consumer or data-protection law.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className={`text-xs font-black uppercase tracking-wider ${heading}`}>9. Changes & contact</h4>
            <p>
              We may update these Terms as the product evolves; the version label above will change when we do. Questions:{' '}
              <a href="mailto:oryn02@gmail.com" className={heading}>oryn02@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className={`shrink-0 border-t px-5 py-3 sm:px-6 flex justify-end ${landing ? 'border-border bg-card' : 'fios-border bg-[hsl(var(--background))]'}`}>
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

export default TermsModal;
