import React, { useRef, useState } from 'react';
import { Camera, Mic, Loader2 } from 'lucide-react';
import { getGeminiKey } from '../lib/geminiKey';
import { useAiAuth } from '../context/AiAuthContext';
import { toast } from '../lib/toast';

interface MediaStudyInputProps {
  /** Called with structured markdown/notes returned by the study engine. */
  onNotes: (markdown: string) => void;
}

/**
 * Multimodal voice/vision entry for Smart Notes — image or audio file →
 * `POST /api/media/process`. Guarded by AiAuth before any upload runs.
 */
export const MediaStudyInput: React.FC<MediaStudyInputProps> = ({ onNotes }) => {
  const { requireAiAuth } = useAiAuth();
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const processFile = async (file: File, mimeHint?: string) => {
    if (!requireAiAuth()) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const mediaBase64 = btoa(binary);
      const mimeType = mimeHint || file.type || 'application/octet-stream';

      const response = await fetch('/api/media/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaBase64,
          mimeType,
          apiKey: getGeminiKey(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Media process failed (${response.status})`);

      const markdown =
        (typeof data.markdown === 'string' && data.markdown) ||
        (typeof data.notes === 'string' && data.notes) ||
        (typeof data.text === 'string' && data.text) ||
        '';
      if (!markdown.trim()) throw new Error('No notes returned from vision/audio processing.');
      onNotes(markdown.trim());
      toast('Multimodal notes ready', 'success');
    } catch (err: any) {
      toast(err?.message || 'Could not process media', 'error');
    } finally {
      setBusy(false);
      if (imageRef.current) imageRef.current.value = '';
      if (audioRef.current) audioRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void processFile(f);
        }}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*,.webm,.mp3,.wav,.m4a"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void processFile(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!requireAiAuth()) return;
          imageRef.current?.click();
        }}
        className="px-3 py-2 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-xs font-bold text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 accent-solid-text" />}
        Vision
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!requireAiAuth()) return;
          audioRef.current?.click();
        }}
        className="px-3 py-2 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-xs font-bold text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5 accent-solid-text" />}
        Voice
      </button>
      <span className="text-[10px] font-mono text-[var(--fios-text-muted)]">Gemini Vision / audio → notes</span>
    </div>
  );
};

export default MediaStudyInput;
