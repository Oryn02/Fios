import React from 'react';
import { motion } from 'framer-motion';
import { FileText, X } from 'lucide-react';

interface TermsModalProps {
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
    <div className="absolute inset-0" onClick={onClose} aria-hidden />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-labelledby="tos-title"
      className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 sm:p-8 space-y-6 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b fios-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 id="tos-title" className="text-base font-black uppercase text-[var(--fios-text)]">Terms of Service</h3>
            <p className="text-[11px] font-mono text-[var(--fios-text-muted)]">Fios Academic Command Center · v2.2.1</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer p-1" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-[var(--fios-text-muted)] leading-relaxed">
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">1. Acceptance</h4>
          <p>
            By using Fios you agree to these terms. Fios is a demonstration / academic study tool built with AI assistance.
            It is provided as-is without warranties of fitness for a particular purpose.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">2. Bring-Your-Own Key</h4>
          <p>
            AI features require your own Google Gemini API key. You are responsible for usage quotas, billing, and key security.
            Fios does not resell AI access.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">3. Acceptable use</h4>
          <p>
            Do not use Fios to cheat on assessments in violation of your institution&apos;s academic integrity policy,
            upload malware, harass others, or attempt unauthorized access to systems.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">4. Your content</h4>
          <p>
            You retain ownership of notes, decks, and uploads. Content is stored in your private Supabase rows under RLS.
            You may export or delete your data from Settings at any time.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">5. Privacy &amp; cookies</h4>
          <p>
            Processing of personal data is described in the Privacy Policy &amp; GDPR statement. Browser storage practices
            are described in the Cookie Policy. Live-demo guests may browse the UI; cloud AI generation requires a signed-in account.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">6. Limitation of liability</h4>
          <p>
            To the fullest extent permitted by law, the authors are not liable for grades, exam outcomes, data loss,
            or third-party API outages. Always verify AI-generated study material independently.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">7. Changes</h4>
          <p>
            These terms may be updated with the product (see the in-app Updates changelog for Fios v2.2.1 and later).
            Continued use after changes constitutes acceptance of the revised terms.
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

export default TermsModal;
