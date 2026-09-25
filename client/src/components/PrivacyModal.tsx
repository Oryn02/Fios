import React from 'react';
import { motion } from 'framer-motion';
import { Shield, X } from 'lucide-react';

interface PrivacyModalProps {
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0e131f] p-6 sm:p-8 space-y-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#07090e] border border-slate-800 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white">Privacy Policy & GDPR Statement</h3>
              <p className="text-[11px] font-mono text-slate-400">Fios Academic Command Center</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          <section className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">1. Data Controller & Overview</h4>
            <p>
              Fios ("we", "our", or "us") respects your privacy and is committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR) and Irish data protection legislation. This privacy statement explains how we handle information within this academic command center application.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">2. Information We Collect</h4>
            <p>
              When you register or sign in, we process limited personal data necessary for authentication and core functionality, including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>Account credentials (email address and encrypted authentication tokens managed securely via Supabase).</li>
              <li>User-generated academic data (notes, uploaded documents, flashcard decks, focus session logs, and profile preferences).</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">3. Purpose and Legal Basis</h4>
            <p>
              Your information is processed strictly to provide, maintain, and secure your personal study environment, synchronize your academic modules, and power AI-driven study tools. Data is never sold, rented, or shared with third-party advertisers.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">4. Data Security and Your Rights</h4>
            <p>
              We implement robust technical and organizational security measures to protect your data. Under the GDPR, you retain the right to access, correct, or request complete erasure of your personal data and account records at any time by contacting support or deleting your account from your settings.
            </p>
          </section>
        </div>

        <div className="border-t border-slate-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-cyan-400 text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
          >
            Close Policy
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyModal;