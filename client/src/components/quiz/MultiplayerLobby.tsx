import React, { useCallback, useEffect, useState } from 'react';
import { Radio, Users, Loader2, Play, Send } from 'lucide-react';
import {
  createLiveQuiz,
  joinLiveQuiz,
  startLiveQuiz,
  submitLiveQuiz,
  getLiveQuiz,
} from '../../services/liveQuizApi';
import { toast } from '../../lib/toast';

interface MultiplayerLobbyProps {
  seedQuestions?: any[];
  seedTitle?: string;
  onClose?: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  seedQuestions = [],
  seedTitle = 'Live quiz',
  onClose,
}) => {
  const [session, setSession] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [invite, setInvite] = useState('');
  const [name, setName] = useState('Player');
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  const refresh = useCallback(async (id: string) => {
    const data = await getLiveQuiz(id);
    setSession(data.session);
    setParticipants(data.participants || []);
  }, []);

  useEffect(() => {
    if (!session?.id || session.status === 'finished') return;
    const t = setInterval(() => {
      void refresh(session.id).catch(() => undefined);
    }, 4000);
    return () => clearInterval(t);
  }, [session?.id, session?.status, refresh]);

  const host = async () => {
    if (!seedQuestions.length) {
      toast('Generate a solo quiz first, then host it live', 'info');
      return;
    }
    setBusy(true);
    try {
      const { session: s } = await createLiveQuiz({
        title: seedTitle,
        questions: seedQuestions,
        displayName: name,
      });
      setSession(s);
      await refresh(s.id);
      toast(`Lobby code ${s.invite_code}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Host failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    try {
      const { session: s } = await joinLiveQuiz(invite.trim().toUpperCase(), name);
      setSession(s);
      await refresh(s.id);
      toast('Joined lobby', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Join failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const { session: s } = await startLiveQuiz(session.id);
      setSession(s);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Start failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const payload = Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex,
      }));
      const out = await submitLiveQuiz(session.id, payload);
      setResult({ score: out.score, total: out.total });
      await refresh(session.id);
      toast(`Score ${out.score}/${out.total}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Submit failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const questions = Array.isArray(session?.questions) ? session.questions : [];

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 md:p-5 space-y-4 shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 accent-solid-text" /> Live quiz lobby
          </h3>
          <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">Invite code · shared scoreboard</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs font-mono text-[var(--fios-text-muted)] cursor-pointer">
            Close
          </button>
        )}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Display name"
        className="w-full p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs text-[var(--fios-text)]"
      />

      {!session ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void host()}
            className="py-3 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Host from current quiz
          </button>
          <div className="flex gap-2">
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Invite code"
              className="flex-1 p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono uppercase"
            />
            <button
              type="button"
              disabled={busy || !invite.trim()}
              onClick={() => void join()}
              className="px-3 border fios-border rounded-lg text-xs font-bold uppercase cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-mono accent-solid-text text-sm tracking-widest">{session.invite_code}</span>
            <span className="capitalize text-[var(--fios-text-muted)]">{session.status}</span>
            {session.status === 'lobby' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void start()}
                className="px-3 py-1.5 accent-bg text-slate-950 text-[10px] font-black uppercase rounded-lg cursor-pointer"
              >
                Start quiz
              </button>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)] flex items-center gap-1">
              <Users className="w-3 h-3" /> Players
            </p>
            <ul className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <li key={p.user_id} className="px-2 py-1 rounded-md bg-[var(--fios-surface-2)] border fios-border text-[11px]">
                  {p.display_name || 'Player'} · {p.score}
                </li>
              ))}
            </ul>
          </div>

          {session.status === 'active' && (
            <div className="space-y-3">
              {questions.map((q: any, idx: number) => (
                <div key={q.id || idx} className="p-3 rounded-lg border fios-border bg-[var(--fios-surface-2)] space-y-2">
                  <p className="text-xs font-bold text-[var(--fios-text)]">{q.question}</p>
                  <div className="grid gap-1.5">
                    {(q.options || []).map((opt: string, oi: number) => (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                        className={`text-left text-[11px] px-2.5 py-2 rounded-md border cursor-pointer ${
                          answers[q.id] === oi ? 'accent-border accent-bg/20' : 'fios-border'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                className="w-full py-2.5 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit answers
              </button>
              {result && (
                <p className="text-center text-sm font-black accent-solid-text">
                  {result.score}/{result.total}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
