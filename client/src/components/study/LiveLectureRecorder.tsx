import React, { useCallback, useRef, useState } from 'react';
import { Loader2, Mic, Square, Sparkles } from 'lucide-react';
import { saasFetch, readJson } from '../../services/saasFetch';
import { toast } from '../../lib/toast';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const b64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(b64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

interface LiveLectureRecorderProps {
  moduleCode?: string;
  onDeckReady?: (deck: { title: string; cards: { front: string; back: string }[] }) => void;
}

export const LiveLectureRecorder: React.FC<LiveLectureRecorderProps> = ({
  moduleCode,
  onDeckReady,
}) => {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const flushChunk = useCallback(async (blob: Blob) => {
    if (!blob.size) return;
    try {
      const mediaBase64 = await blobToBase64(blob);
      const res = await saasFetch('/api/lecture/transcribe-chunk', {
        method: 'POST',
        body: JSON.stringify({ mediaBase64, mimeType: blob.type || 'audio/webm' }),
      });
      const data = await readJson<{ transcript?: string; markdown?: string }>(res);
      const piece = data.transcript || data.markdown || '';
      if (piece) setTranscript((t) => (t ? `${t}\n\n${piece}` : piece));
    } catch (e) {
      console.warn('chunk transcribe failed', e);
    }
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data?.size) {
          chunksRef.current.push(ev.data);
          void flushChunk(ev.data);
        }
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = rec;
      rec.start(12000);
      setRecording(true);
      toast('Recording lecture…', 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Microphone permission required', 'error');
    }
  };

  const stopAndFinalize = async () => {
    const rec = mediaRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
    setRecording(false);
    setBusy(true);
    try {
      // Wait briefly for last chunk
      await new Promise((r) => setTimeout(r, 400));
      let full = transcript;
      if (!full && chunksRef.current.length) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const mediaBase64 = await blobToBase64(blob);
        const res = await saasFetch('/api/lecture/transcribe-chunk', {
          method: 'POST',
          body: JSON.stringify({ mediaBase64, mimeType: 'audio/webm' }),
        });
        const data = await readJson<{ transcript?: string; markdown?: string }>(res);
        full = data.transcript || data.markdown || '';
        setTranscript(full);
      }
      if (!full.trim()) {
        toast('No transcript captured — try again closer to the mic', 'error');
        return;
      }
      const res = await saasFetch('/api/lecture/finalize', {
        method: 'POST',
        body: JSON.stringify({
          transcript: full,
          title: `Live lecture ${new Date().toLocaleDateString()}`,
          moduleCode,
        }),
      });
      const data = await readJson<{
        summary?: { summary?: string } | string;
        deck?: { title: string; cards: { front: string; back: string }[] };
      }>(res);
      const sum =
        typeof data.summary === 'string'
          ? data.summary
          : data.summary?.summary || null;
      setSummary(sum);
      if (data.deck?.cards?.length) {
        onDeckReady?.(data.deck);
        toast(`Deck ready (${data.deck.cards.length} cards)`, 'success');
      } else {
        toast('Lecture summarized', 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Finalize failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <Mic className="w-4 h-4 accent-solid-text" /> Live lecture
      </h3>
      <p className="text-[11px] text-[var(--fios-text-muted)]">
        Record audio chunks → Gemini transcription → summary + flashcard deck on stop.
      </p>
      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer inline-flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" /> Start
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stopAndFinalize()}
            className="px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase cursor-pointer inline-flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" /> Stop & process
          </button>
        )}
        {busy && (
          <span className="text-xs text-[var(--fios-text-muted)] inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…
          </span>
        )}
      </div>
      {transcript ? (
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={6}
          className="w-full p-2.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs font-mono text-[var(--fios-text)]"
        />
      ) : null}
      {summary ? (
        <div className="text-xs text-[var(--fios-text)] space-y-1">
          <p className="font-bold inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 accent-solid-text" /> Summary
          </p>
          <p className="text-[var(--fios-text-muted)] whitespace-pre-wrap">{summary}</p>
        </div>
      ) : null}
    </div>
  );
};

export default LiveLectureRecorder;
