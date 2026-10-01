import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { shareResource } from '../../services/socialApi';
import { toast } from '../../lib/toast';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  resourceType: 'deck' | 'document' | 'quiz' | 'module' | 'link';
  resourceId?: string;
  moduleCode?: string;
  payload?: Record<string, unknown>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  title,
  resourceType,
  resourceId,
  moduleCode,
  payload,
}) => {
  const [visibility, setVisibility] = useState<'friends' | 'course_bank' | 'private'>('friends');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await shareResource({
        title,
        resourceType,
        resourceId,
        moduleCode,
        payload,
        visibility,
      });
      toast('Shared to study network', 'success');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Share failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--fios-surface)] border fios-border rounded-xl p-5 space-y-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <Share2 className="w-4 h-4 accent-solid-text" /> Share to friends
        </h3>
        <p className="text-xs text-[var(--fios-text-muted)] truncate">{title}</p>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)]">Visibility</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            className="w-full p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs text-[var(--fios-text)]"
          >
            <option value="friends">Friends</option>
            <option value="course_bank">Course bank</option>
            <option value="private">Private</option>
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-bold uppercase text-[var(--fios-text-muted)] cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="px-4 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-lg cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Share
          </button>
        </div>
      </div>
    </div>
  );
};
