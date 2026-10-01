import React, { useRef, useState } from 'react';
import { Loader2, Upload, Film } from 'lucide-react';
import { saasFetch, readJson } from '../../services/saasFetch';
import { toast } from '../../lib/toast';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface MultiFormatIngestProps {
  onDeckReady?: (deck: { title: string; cards: { front: string; back: string }[] }) => void;
}

export const MultiFormatIngest: React.FC<MultiFormatIngestProps> = ({ onDeckReady }) => {
  const [url, setUrl] = useState('');
  const [transcriptPaste, setTranscriptPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ingest = async (body: Record<string, unknown>) => {
    setBusy(true);
    setHint(null);
    try {
      const res = await saasFetch('/api/lecture/ingest', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await readJson<{
        title?: string;
        cards?: { front: string; back: string }[];
        error?: string;
        hint?: string;
      }>(res);
      if (data.cards?.length) {
        onDeckReady?.({ title: data.title || 'Ingested deck', cards: data.cards });
        toast(`Imported ${data.cards.length} cards`, 'success');
      } else {
        toast('No cards generated', 'info');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ingest failed';
      setHint(msg);
      toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    const mediaBase64 = await fileToBase64(file);
    await ingest({
      mediaBase64,
      mimeType: file.type || 'audio/mpeg',
      title: file.name.replace(/\.[^.]+$/, ''),
      transcript: transcriptPaste || undefined,
    });
  };

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <Film className="w-4 h-4 accent-solid-text" /> Multi-format ingest
      </h3>
      <p className="text-[11px] text-[var(--fios-text-muted)]">
        YouTube URL (captions when available), MP3/MP4 upload, or paste a transcript → cloze + Q&A cards.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="flex-1 p-2.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs font-mono text-[var(--fios-text)]"
        />
        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() =>
            void ingest({
              url: url.trim(),
              transcript: transcriptPaste || undefined,
            })
          }
          className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Ingest URL'}
        </button>
      </div>
      <textarea
        value={transcriptPaste}
        onChange={(e) => setTranscriptPaste(e.target.value)}
        rows={3}
        placeholder="Optional / fallback: paste YouTube transcript or lecture notes"
        className="w-full p-2.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs font-mono text-[var(--fios-text)]"
      />
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,video/mp4,video/webm,.mp3,.mp4,.m4a,.wav"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          if (fileRef.current) fileRef.current.value = '';
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="px-3 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
      >
        <Upload className="w-3.5 h-3.5 accent-solid-text" /> Upload MP3 / MP4
      </button>
      {hint ? <p className="text-[11px] text-amber-400 font-mono">{hint}</p> : null}
    </div>
  );
};

export default MultiFormatIngest;
