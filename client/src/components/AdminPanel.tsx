import React, { useEffect, useState } from 'react';
import { Activity, Shield, ClipboardCheck, X } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

interface AdminPanelProps {
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { profile } = useProfile();
  const adminUid = (import.meta.env.VITE_ADMIN_UID as string | undefined)?.trim() || '';
  const isAdmin = !!adminUid && profile?.id === adminUid;
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    const lines = [
      `Fios admin · ${new Date().toISOString()}`,
      `Profile: ${profile?.id}`,
      `Theme: ${profile?.theme}`,
      `Online: ${navigator.onLine ? 'yes' : 'no'}`,
      `User agent: ${navigator.userAgent.slice(0, 80)}…`,
    ];
    setLogs(lines);
  }, [isAdmin, profile]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border fios-border bg-[var(--fios-surface)] p-4 text-xs text-[var(--fios-text-muted)] font-mono">
        Admin panel is not available for this account.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border accent-border bg-[var(--fios-surface)] p-5 space-y-4 shadow-xl font-sans">
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
          <li className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
            <span>Demo account credentials rotation</span>
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
