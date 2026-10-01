import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users, Check, X, Loader2 } from 'lucide-react';
import { listFriends, requestFriend, respondFriend } from '../../services/socialApi';
import { toast } from '../../lib/toast';

export const FriendManager: React.FC = () => {
  const [friendships, setFriendships] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { friendships: rows } = await listFriends();
      setFriendships(rows || []);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load friends', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const send = async () => {
    if (!userId.trim()) return;
    setBusy(true);
    try {
      await requestFriend(userId.trim());
      toast('Friend request sent', 'success');
      setUserId('');
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Request failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await respondFriend(id, status);
      toast(status === 'accepted' ? 'Friend added' : 'Request declined', 'success');
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-4 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <Users className="w-4 h-4 accent-solid-text" /> Friends
      </h3>
      <div className="flex gap-2">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Friend user UUID"
          className="flex-1 p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
        />
        <button
          type="button"
          disabled={busy || !userId.trim()}
          onClick={() => void send()}
          className="px-3 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-lg cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
          Add
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-[var(--fios-text-muted)] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      ) : friendships.length === 0 ? (
        <p className="text-xs text-[var(--fios-text-muted)]">No friendships yet.</p>
      ) : (
        <ul className="space-y-2">
          {friendships.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-[var(--fios-text-muted)] truncate">
                  {f.requester_id?.slice(0, 8)}… ↔ {f.addressee_id?.slice(0, 8)}…
                </p>
                <p className="text-xs font-bold capitalize text-[var(--fios-text)]">{f.status}</p>
              </div>
              {f.status === 'pending' && (
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void respond(f.id, 'accepted')}
                    className="p-1.5 rounded-md accent-bg text-slate-950 cursor-pointer"
                    aria-label="Accept"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void respond(f.id, 'declined')}
                    className="p-1.5 rounded-md border fios-border cursor-pointer text-[var(--fios-text-muted)]"
                    aria-label="Decline"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
