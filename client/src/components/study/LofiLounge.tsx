import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Headphones, Loader2, Users, Timer } from 'lucide-react';
import { getApiOrigin } from '../../lib/apiBase';
import { soundscapeEngine } from '../../lib/soundscapes';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

type Phase = 'focus' | 'break' | 'idle';

interface LoungeState {
  roomId: string;
  phase: Phase;
  endsAt: number | null;
  studying: { id: string; name: string; topic?: string }[];
  chatLocked: boolean;
}

function socketUrl(): string {
  const origin = getApiOrigin();
  if (origin) return origin;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export const LofiLounge: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [topic, setTopic] = useState('');
  const [chat, setChat] = useState('');
  const [messages, setMessages] = useState<{ user: string; text: string; at: string }[]>([]);
  const [state, setState] = useState<LoungeState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      soundscapeEngine.stop();
    };
  }, []);

  const remaining = useMemo(() => {
    if (!state?.endsAt) return null;
    return Math.max(0, Math.floor((state.endsAt - now) / 1000));
  }, [state?.endsAt, now]);

  const mmss = remaining != null
    ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
    : '--:--';

  const connectRoom = async (id: string, create: boolean) => {
    setConnecting(true);
    try {
      await soundscapeEngine.unlock();
      soundscapeEngine.play('lofi');
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const name =
        data.session?.user?.user_metadata?.full_name ||
        data.session?.user?.email?.split('@')[0] ||
        'Student';
      const socket = io(socketUrl(), {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      socketRef.current?.disconnect();
      socketRef.current = socket;
      socket.on('connect', () => {
        socket.emit(create ? 'lounge:create' : 'lounge:join', {
          roomId: id,
          name,
          topic: topic.trim() || undefined,
        });
      });
      socket.on('lounge:state', (s: LoungeState) => {
        setState(s);
        setRoomId(s.roomId || id);
      });
      socket.on('lounge:chat', (msg: { user: string; text: string; at: string }) => {
        setMessages((m) => [...m.slice(-80), msg]);
      });
      socket.on('lounge:error', (err: { message?: string }) => {
        toast(err?.message || 'Lounge error', 'error');
      });
      socket.on('connect_error', () => {
        toast('Could not reach lounge socket — is the API online?', 'error');
      });
    } catch (e: any) {
      toast(e?.message || 'Failed to join lounge', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const sendChat = () => {
    if (!chat.trim() || state?.phase === 'focus') return;
    socketRef.current?.emit('lounge:chat', { text: chat.trim() });
    setChat('');
  };

  const chatLocked = state?.phase === 'focus';

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <Headphones className="w-4 h-4 accent-solid-text" /> Lofi Pomodoro lounge
        </h3>
        {state && (
          <span className="text-[10px] font-mono accent-solid-text uppercase">{state.phase}</span>
        )}
      </div>

      {!state ? (
        <div className="space-y-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What are you studying?"
            className="w-full p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={connecting}
              onClick={() => void connectRoom(`room-${Date.now().toString(36)}`, true)}
              className="px-3 py-2 accent-bg text-slate-950 text-[10px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-40 inline-flex items-center gap-1"
            >
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Create room
            </button>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Room code"
              className="flex-1 min-w-[120px] p-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono text-[var(--fios-text)]"
            />
            <button
              type="button"
              disabled={connecting || !joinCode.trim()}
              onClick={() => void connectRoom(joinCode.trim(), false)}
              className="px-3 py-2 border fios-border text-[10px] font-bold uppercase rounded-lg cursor-pointer text-[var(--fios-text)] disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-[var(--fios-surface-2)] border fios-border p-4 text-center space-y-1">
            <Timer className="w-5 h-5 accent-solid-text mx-auto" />
            <p className="text-3xl font-black font-mono tabular-nums text-[var(--fios-text)]">{mmss}</p>
            <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">Room {roomId}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Studying now
            </p>
            <ul className="space-y-1 max-h-24 overflow-y-auto scroll-touch">
              {(state.studying || []).map((s) => (
                <li key={s.id} className="text-[11px] text-[var(--fios-text)] truncate">
                  {s.name}{s.topic ? ` · ${s.topic}` : ''}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="max-h-28 overflow-y-auto scroll-touch space-y-1 text-[11px]">
              {messages.map((m, i) => (
                <p key={i} className="text-[var(--fios-text-muted)]">
                  <span className="font-bold text-[var(--fios-text)]">{m.user}:</span> {m.text}
                </p>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                disabled={chatLocked}
                placeholder={chatLocked ? 'Chat locked during focus' : 'Say something…'}
                className="flex-1 p-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs text-[var(--fios-text)] disabled:opacity-50"
              />
              <button
                type="button"
                disabled={chatLocked || !chat.trim()}
                onClick={sendChat}
                className="px-3 py-2 accent-bg text-slate-950 text-[10px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LofiLounge;
