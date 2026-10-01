import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Video, Mic } from 'lucide-react';
import { saasFetch, readJson } from '../../services/saasFetch';
import { toast } from '../../lib/toast';

const FILLERS = /\b(um+|uh+|erm+|like|you know|basically|literally)\b/gi;

interface VivaCoachProps {
  content: string;
}

export const VivaCoach: React.FC<VivaCoachProps> = ({ content }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wpm, setWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const startRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
    };
  }, [stream]);

  const startMedia = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Camera/mic permission required', 'error');
    }
  };

  const startListening = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast('SpeechRecognition not supported — type answers below', 'info');
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    startRef.current = Date.now();
    let text = '';
    rec.onresult = (ev: any) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript as string;
        if (ev.results[i].isFinal) text += t + ' ';
        else interim += t;
      }
      const full = (text + interim).trim();
      setTranscript(full);
      const words = full.split(/\s+/).filter(Boolean).length;
      const minutes = Math.max(0.05, (Date.now() - startRef.current) / 60000);
      setWpm(Math.round(words / minutes));
      const fillers = (full.match(FILLERS) || []).length;
      setFillerCount(fillers);
    };
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  const callTurn = async (spoken?: string) => {
    if (!content.trim()) {
      toast('Provide study content for the viva', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await saasFetch('/api/viva/turn', {
        method: 'POST',
        body: JSON.stringify({
          content,
          transcript: spoken ?? transcript,
          wpm,
          fillerCount,
          history,
        }),
      });
      const data = await readJson<{
        question?: string;
        feedback?: string;
        pacingNote?: string;
        fillerNote?: string;
        score?: number;
      }>(res);
      if (spoken || transcript) {
        setHistory((h) => [
          ...h,
          { role: 'student', content: spoken || transcript },
          { role: 'coach', content: data.question || '' },
        ]);
      } else {
        setHistory((h) => [...h, { role: 'coach', content: data.question || '' }]);
      }
      setQuestion(data.question || '');
      const bits = [data.feedback, data.pacingNote, data.fillerNote]
        .filter(Boolean)
        .join(' · ');
      setFeedback(bits + (data.score != null ? ` (score ${data.score})` : ''));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Viva turn failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <Video className="w-4 h-4 accent-solid-text" /> Viva coach
      </h3>
      <p className="text-[11px] text-[var(--fios-text-muted)]">
        Practice with cam/mic. Tracks WPM + filler words (um, uh, like…), then asks professor-style questions.
      </p>
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full max-h-48 rounded-lg bg-black object-cover"
      />
      <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[var(--fios-text-muted)]">
        <span>WPM {wpm}</span>
        <span>Fillers {fillerCount}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void startMedia()}
          className="px-3 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs font-bold cursor-pointer"
        >
          Enable cam/mic
        </button>
        {!listening ? (
          <button
            type="button"
            onClick={startListening}
            className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer inline-flex items-center gap-1"
          >
            <Mic className="w-3.5 h-3.5" /> Speak
          </button>
        ) : (
          <button
            type="button"
            onClick={stopListening}
            className="px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold cursor-pointer"
          >
            Stop speech
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void callTurn()}
          className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : history.length ? 'Submit turn' : 'Start viva'}
        </button>
      </div>
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={3}
        placeholder="Spoken / typed answer"
        className="w-full p-2.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs text-[var(--fios-text)]"
      />
      {question ? (
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--fios-text)]">{question}</p>
          {feedback ? <p className="text-[11px] text-[var(--fios-text-muted)]">{feedback}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

export default VivaCoach;
