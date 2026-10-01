import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { apiUrl } from '../../lib/apiBase';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

type BuddyState = {
  code: string;
  moduleCode: string;
  phase: 'waiting' | 'focus' | 'checkin';
  remainingMs: number | null;
  members: { socketId: string; displayName: string; goal?: string }[];
};

function formatMs(ms: number | null | undefined) {
  if (ms == null) return '—';
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Body Doubling — match by module, 50m silent focus, goals, end check-in chat.
 */
export const BodyDouble: React.FC<{ defaultModule?: string }> = ({ defaultModule = '' }) => {
  const [moduleCode, setModuleCode] = useState(defaultModule);
  const [goal, setGoal] = useState('');
  const [state, setState] = useState<BuddyState | null>(null);
  const [chat, setChat] = useState<{ text: string; from: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => {
    void tick;
    if (!state?.remainingMs || state.phase !== 'focus') return state?.remainingMs ?? null;
    // Client-side countdown from last server remaining snapshot is approximate;
    // prefer endsAt-driven remaining from server sync.
    return state.remainingMs;
  }, [state, tick]);

  const connect = useCallback(async () => {
    if (!moduleCode.trim()) {
      toast('Enter a module code to match', 'info');
      return;
    }
    setConnecting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      const displayName =
        (user?.user_metadata?.full_name as string) ||
        user?.email?.split('@')[0] ||
        'Student';

      const origin = apiUrl('/').replace(/\/$/, '');
      const s = io(origin, { path: '/lounge', transports: ['websocket', 'polling'] });
      setSocket(s);

      s.on('connect', () => {
        s.emit('buddy:find', {
          moduleCode: moduleCode.trim(),
          displayName,
          userId: user?.id,
          goal: goal.trim() || undefined,
        });
      });
      s.on('buddy:matched', (st: BuddyState) => setState(st));
      s.on('buddy:state', (st: BuddyState) => setState(st));
      s.on('buddy:checkin', (p: { message?: string }) => {
        toast(p.message || 'Check-in unlocked', 'success');
      });
      s.on('buddy:chat', (msg: { text: string; from?: { displayName?: string } }) => {
        setChat((c) => [
          ...c,
          { text: msg.text, from: msg.from?.displayName || 'Buddy' },
        ]);
      });
      s.on('buddy:error', (e: { error?: string }) => {
        toast(e.error || 'Buddy error', 'error');
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Connect failed', 'error');
    } finally {
      setConnecting(false);
    }
  }, [moduleCode, goal]);

  const leave = useCallback(() => {
    socket?.emit('buddy:leave');
    socket?.disconnect();
    setSocket(null);
    setState(null);
    setChat([]);
  }, [socket]);

  const sendChat = useCallback(() => {
    if (!draft.trim() || !socket) return;
    socket.emit('buddy:chat', { text: draft.trim() });
    setDraft('');
  }, [draft, socket]);

  useEffect(() => {
    return () => {
      socket?.emit('buddy:leave');
      socket?.disconnect();
    };
  }, [socket]);

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <Users className="w-4 h-4 accent-solid-text" /> Body Double
      </h3>
      <p className="text-xs text-[var(--fios-text-muted)]">
        Match with someone on the same module for a silent 50-minute focus block. Chat unlocks at
        check-in.
      </p>
      {!state ? (
        <div className="space-y-2">
          <input
            value={moduleCode}
            onChange={(e) => setModuleCode(e.target.value)}
            placeholder="Module code"
            className="w-full px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-sm"
          />
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Session goal (optional)"
            className="w-full px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-sm"
          />
          <button
            type="button"
            disabled={connecting}
            onClick={connect}
            className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null} Find buddy
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="uppercase text-[var(--fios-text-muted)]">{state.phase}</span>
            <span className="text-lg font-black accent-solid-text">{formatMs(remaining)}</span>
          </div>
          <ul className="text-xs space-y-1">
            {state.members.map((m) => (
              <li key={m.socketId}>
                <span className="font-bold">{m.displayName}</span>
                {m.goal ? ` — ${m.goal}` : ''}
              </li>
            ))}
          </ul>
          {state.phase === 'checkin' || state.phase === 'waiting' ? (
            <div className="space-y-2">
              <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                {chat.map((c, i) => (
                  <p key={i}>
                    <span className="font-bold">{c.from}:</span> {c.text}
                  </p>
                ))}
              </div>
              {state.phase === 'checkin' && (
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Check-in message…"
                    className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-sm"
                  />
                  <button
                    type="button"
                    onClick={sendChat}
                    className="px-3 py-1.5 rounded-lg border fios-border text-xs font-bold cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--fios-text-muted)]">Silent mode — headphones on.</p>
          )}
          <button
            type="button"
            onClick={leave}
            className="text-xs font-bold text-rose-400 cursor-pointer"
          >
            Leave
          </button>
        </div>
      )}
    </div>
  );
};

export default BodyDouble;
