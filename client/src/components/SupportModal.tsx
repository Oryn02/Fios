import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, X, Copy, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { getSupportEmail, hasConfiguredSupportEmail } from '../lib/supportConfig';
import { toast } from '../lib/toast';

interface SupportModalProps {
  onClose: () => void;
}

/**
 * Contact Support — displays inbox email + in-app message form
 * (POST /api/support → Resend/SendGrid when configured).
 */
export const SupportModal: React.FC<SupportModalProps> = ({ onClose }) => {
  const supportEmail = getSupportEmail();
  const configured = hasConfiguredSupportEmail();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      toast('Support email copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy email', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setFormError('Please enter a message.');
      return;
    }
    if (trimmed.length < 10) {
      setFormError('Message is too short — add a bit more detail.');
      return;
    }
    if (replyTo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo.trim())) {
      setFormError('Reply-to email looks invalid.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          name: name.trim() || undefined,
          replyTo: replyTo.trim() || undefined,
        }),
      });
      const text = await response.text();
      const data = text.trim().startsWith('{') ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data?.error || `Could not send message (${response.status})`);
      }
      setSent(true);
      setMessage('');
      toast('Message sent to support', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to send support message';
      setFormError(msg);
      toast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-labelledby="support-title"
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 space-y-5 shadow-2xl text-[var(--fios-text)]"
      >
        <div className="flex items-center justify-between border-b fios-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text">
              <Mail className="w-5 h-5" />
            </div>
            <h3 id="support-title" className="text-sm font-black uppercase text-[var(--fios-text)]">
              Contact Support
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--fios-text-muted)] leading-relaxed">
          Need help, found a bug, or have questions about Fios? Email us directly or send a message below —
          it is delivered to the support inbox without opening your mail client.
        </p>

        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Support email</span>
          <div className="flex items-center justify-between gap-2 bg-[var(--fios-surface-2)] border fios-border px-3 py-2.5 rounded-xl font-mono text-xs accent-solid-text">
            <span className="truncate">{supportEmail}</span>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="px-3 py-1.5 bg-[var(--fios-surface)] border fios-border text-[var(--fios-text)] rounded-lg flex items-center gap-1.5 cursor-pointer text-[11px] shrink-0"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {!configured && (
            <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">
              Set <code className="accent-solid-text">VITE_SUPPORT_EMAIL</code> in client env to show your real inbox.
            </p>
          )}
        </div>

        {sent ? (
          <div className="rounded-xl border accent-border bg-[var(--fios-surface-2)] p-4 space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 accent-solid-text mx-auto" />
            <p className="text-sm font-bold text-[var(--fios-text)]">Message delivered</p>
            <p className="text-xs text-[var(--fios-text-muted)]">Thanks — we will get back to you if you left a reply-to address.</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs font-mono accent-solid-text hover:underline cursor-pointer"
            >
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Name (optional)</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3 py-2.5 text-xs text-[var(--fios-text)] focus:outline-none focus:accent-border"
                  placeholder="Your name"
                  maxLength={80}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Reply-to (optional)</span>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3 py-2.5 text-xs text-[var(--fios-text)] focus:outline-none focus:accent-border"
                  placeholder="you@university.ie"
                  maxLength={120}
                />
              </label>
            </div>
            <label className="space-y-1 block">
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                maxLength={4000}
                placeholder="Describe the issue or question…"
                className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3 py-2.5 text-xs text-[var(--fios-text)] focus:outline-none focus:accent-border resize-y min-h-[120px]"
              />
            </label>
            {formError && (
              <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-[11px] font-mono rounded-r-lg">
                {formError}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {configured && (
                <a
                  href={`mailto:${encodeURIComponent(supportEmail)}`}
                  className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl cursor-pointer hover:opacity-80 inline-flex items-center"
                >
                  Open mail app
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="px-4 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default SupportModal;
