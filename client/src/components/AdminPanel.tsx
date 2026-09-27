import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Shield, ClipboardCheck, X, Star, Trash2, Loader2, MessageSquare, Palette } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_HOLIDAY_PREVIEWS } from '../lib/holidays';
import { deleteFeedback, listAllFeedback, type FeedbackEntry } from '../lib/feedbackService';
import { toast } from '../lib/toast';

interface AdminPanelProps {
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { profile } = useProfile();
  const { holidayTheme, previewHolidayTheme } = useTheme();
  const adminUid = (import.meta.env.VITE_ADMIN_UID as string | undefined)?.trim() || '';
  const isAdmin = !!adminUid && profile?.id === adminUid;
  const [logs, setLogs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loadingFb, setLoadingFb] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingFb(true);
    setFbError(null);
    try {
      const rows = await listAllFeedback();
      setFeedback(rows);
    } catch (err: any) {
      setFbError(err.message || 'Failed to load feedback (check fios_admins + RLS).');
      setFeedback([]);
    } finally {
      setLoadingFb(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const lines = [
      `Fios admin · ${new Date().toISOString()}`,
      `Profile: ${profile?.id}`,
      `VITE_ADMIN_UID match: yes`,
      `Theme: ${profile?.theme}`,
      `Online: ${navigator.onLine ? 'yes' : 'no'}`,
    ];
    setLogs(lines);
    void loadFeedback();
  }, [isAdmin, profile, loadFeedback]);

  const handleDelete = async (id: string) => {
    try {
      await deleteFeedback(id);
      setFeedback((prev) => prev.filter((f) => f.id !== id));
      toast('Feedback deleted', 'info');
    } catch (err: any) {
      toast(err.message || 'Delete failed', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border fios-border bg-[var(--fios-surface)] p-4 text-xs text-[var(--fios-text-muted)] font-mono">
        Admin panel is not available for this account.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border accent-border bg-[var(--fios-surface)] p-5 space-y-5 shadow-xl font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 accent-solid-text">
          <Shield className="w-4 h-4" /> Admin Panel
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-[var(--fios-text-muted)] cursor-pointer" aria-label="Close admin">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Ratings & feedback
          </h4>
          <button
            type="button"
            onClick={() => void loadFeedback()}
            className="text-[10px] font-mono accent-solid-text cursor-pointer"
          >
            Refresh
          </button>
        </div>
        <p className="text-[10px] text-[var(--fios-text-muted)] font-mono">
          Requires your UID in <code className="accent-solid-text">fios_admins</code> (see schema) plus <code className="accent-solid-text">VITE_ADMIN_UID</code>.
        </p>
        {loadingFb && (
          <div className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        )}
        {fbError && <p className="text-xs text-rose-400 font-mono">{fbError}</p>}
        {!loadingFb && !fbError && feedback.length === 0 && (
          <p className="text-xs text-[var(--fios-text-muted)]">No feedback yet.</p>
        )}
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {feedback.map((f) => (
            <li key={f.id} className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < f.rating ? 'fill-[var(--fios-accent-solid)] text-[var(--fios-accent-solid)]' : 'text-[var(--fios-text-muted)]'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(f.id)}
                  className="text-rose-400 cursor-pointer p-1"
                  aria-label="Delete feedback"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(f.categories || []).map((c) => (
                  <span key={c} className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border fios-border text-[var(--fios-text-muted)]">
                    {c}
                  </span>
                ))}
                {f.anonymous && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400">
                    anonymous
                  </span>
                )}
              </div>
              {f.message && (
                <p className="text-xs text-[var(--fios-text)] whitespace-pre-wrap leading-relaxed">{f.message}</p>
              )}
              <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">
                {new Date(f.created_at).toLocaleString()}
                {!f.anonymous && f.user_id ? ` · ${f.user_id.slice(0, 8)}…` : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h4 className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Holiday themes (preview anytime)
        </h4>
        <p className="text-[10px] text-[var(--fios-text-muted)] font-mono">
          Session-only override — does not change saved accent. Clear to return to calendar day-auto or your saved accent.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ADMIN_HOLIDAY_PREVIEWS.map((p) => {
            const active = holidayTheme?.themeFamily === p.themeFamily;
            return (
              <button
                key={p.themeFamily}
                type="button"
                onClick={() => {
                  previewHolidayTheme(p);
                  toast(`${p.name} theme applied`, 'success');
                }}
                className={`text-left rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                  active ? 'accent-border bg-[var(--fios-surface-2)]' : 'fios-border bg-[var(--fios-surface-2)] hover:accent-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.via}, ${p.to})` }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-bold text-[var(--fios-text)] truncate">{p.name}</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--fios-text-muted)]">{p.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            previewHolidayTheme(null);
            toast('Holiday preview cleared', 'info');
          }}
          className="text-[10px] font-mono accent-solid-text cursor-pointer"
        >
          Clear holiday preview
        </button>
      </section>

      <section className="space-y-2">
        <h4 className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Health logs
        </h4>
        <pre className="text-[10px] font-mono bg-[var(--fios-surface-2)] border fios-border rounded-xl p-3 overflow-x-auto text-[var(--fios-text-muted)] whitespace-pre-wrap">
          {logs.join('\n')}
        </pre>
      </section>

      <section className="space-y-2">
        <h4 className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
          <ClipboardCheck className="w-3.5 h-3.5" /> App Review stubs
        </h4>
        <ul className="space-y-1.5 text-xs text-[var(--fios-text-muted)]">
          <li className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
            <span>iOS App Store review checklist</span>
            <span className="font-mono text-[10px] accent-solid-text">STUB</span>
          </li>
          <li className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
            <span>Google Play data safety form</span>
            <span className="font-mono text-[10px] accent-solid-text">STUB</span>
          </li>
        </ul>
      </section>
    </div>
  );
};

export function useIsAdmin(): boolean {
  const { profile } = useProfile();
  const adminUid = (import.meta.env.VITE_ADMIN_UID as string | undefined)?.trim() || '';
  return !!adminUid && profile?.id === adminUid;
}

export default AdminPanel;
