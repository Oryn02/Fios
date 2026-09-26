import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquareHeart, Send, Loader2, CheckCircle2 } from 'lucide-react';
import {
  FEEDBACK_CATEGORIES,
  submitFeedback,
  type FeedbackCategory,
} from '../lib/feedbackService';
import { toast } from '../lib/toast';

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  feature: 'Feature request',
  ux: 'UX / design',
  performance: 'Performance',
  privacy: 'Privacy',
  other: 'Other',
};

export const FeedbackForm: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const toggleCategory = (c: FeedbackCategory) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast('Pick a star rating first', 'error');
      return;
    }
    setSending(true);
    try {
      await submitFeedback({ rating, categories, message, anonymous });
      setDone(true);
      toast('Thanks — feedback sent', 'success');
      setMessage('');
      setCategories([]);
      setRating(0);
    } catch (err: any) {
      toast(err.message || 'Could not send feedback', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-[var(--fios-surface)] border fios-border-strong rounded-xl p-6 shadow-xl space-y-4 fios-card">
      <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)] flex items-center gap-2">
        <MessageSquareHeart className="w-4 h-4 accent-solid-text" /> Feedback & Ratings
      </h2>
      <p className="text-xs text-[var(--fios-text-muted)] leading-relaxed">
        Rate Fios and share bugs, feature ideas, or thoughts. Submissions are stored securely; choose anonymous to omit your user id.
      </p>

      {done && (
        <div className="flex items-center gap-2 text-xs font-bold accent-solid-text bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4" /> Feedback received. You can send another anytime.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Star rating</span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hover || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1 cursor-pointer"
                >
                  <Star className={`w-7 h-7 transition-colors ${active ? 'fill-[var(--fios-accent-solid)] text-[var(--fios-accent-solid)]' : 'text-[var(--fios-text-muted)]'}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Categories</span>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_CATEGORIES.map((c) => {
              const on = categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border cursor-pointer ${
                    on ? 'accent-bg text-slate-950 border-transparent' : 'fios-border text-[var(--fios-text-muted)]'
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fios-feedback-msg" className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">
            Message
          </label>
          <textarea
            id="fios-feedback-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Bugs, feature requests, praise, or anything else…"
            className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border resize-y"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="accent-[var(--fios-accent-solid)]"
          />
          Submit anonymously (no user id stored)
        </label>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={sending || rating < 1}
          className="px-5 py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer inline-flex items-center gap-2 disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send feedback
        </motion.button>
      </form>
    </section>
  );
};

export default FeedbackForm;
