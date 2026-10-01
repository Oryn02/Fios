import React, { useCallback, useRef, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Loader2 } from 'lucide-react';
import { occlusionMask } from '../../services/saasAiApi';
import { toast } from '../../lib/toast';

type Region = { id: string; label: string; x: number; y: number; w: number; h: number };

export const DiagramOcclusion: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [mime, setMime] = useState('image/png');
  const [regions, setRegions] = useState<Region[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState('');

  const onFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setSrc(dataUrl);
      setMime(file.type || 'image/png');
      setRegions([]);
      setRevealed({});
    };
    reader.readAsDataURL(file);
  }, []);

  const generate = useCallback(async () => {
    if (!src) return;
    setLoading(true);
    try {
      const base64 = src.includes(',') ? src.split(',')[1] : src;
      const result = await occlusionMask({ imageBase64: base64, mimeType: mime, hint: hint || undefined });
      setRegions(result.regions || []);
      setRevealed({});
      toast(`${result.regions?.length || 0} regions ready`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Occlusion failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [src, mime, hint]);

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 md:p-5 space-y-4 shadow-sm dark:shadow-none">
      <div>
        <h3 className="text-lg font-black italic uppercase tracking-tight">Diagram Occlusion</h3>
        <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
          Hide labels · tap to reveal · Gemini vision
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />

      {!src ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-10 border border-dashed fios-border rounded-xl text-xs font-bold uppercase text-[var(--fios-text-muted)] hover:accent-solid-text cursor-pointer flex flex-col items-center gap-2"
        >
          <ImagePlus className="w-6 h-6" /> Upload diagram
        </button>
      ) : (
        <>
          <div className="relative w-full overflow-hidden rounded-xl border fios-border bg-black/20">
            <img src={src} alt="Study diagram" className="w-full h-auto block" />
            {regions.map((r) => {
              const open = revealed[r.id];
              return (
                <button
                  key={r.id}
                  type="button"
                  title={open ? r.label : 'Reveal'}
                  onClick={() => setRevealed((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                  className={`absolute border-2 cursor-pointer transition-colors ${
                    open
                      ? 'border-emerald-400/80 bg-emerald-500/10'
                      : 'border-[var(--fios-accent-solid)] bg-[var(--fios-surface)]/90'
                  }`}
                  style={{
                    left: `${r.x}%`,
                    top: `${r.y}%`,
                    width: `${r.w}%`,
                    height: `${r.h}%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold px-1 text-center">
                    {open ? (
                      <>
                        <Eye className="w-3 h-3 mr-1 shrink-0" /> {r.label}
                      </>
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Optional focus hint (e.g. cranial nerves)"
            className="w-full p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs text-[var(--fios-text)] focus:outline-none focus:accent-border"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void generate()}
              className="px-4 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-lg cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Generate masks
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 border fios-border text-xs font-bold uppercase rounded-lg cursor-pointer text-[var(--fios-text-muted)]"
            >
              Change image
            </button>
            {regions.length > 0 && (
              <button
                type="button"
                onClick={() => setRevealed({})}
                className="px-4 py-2 border fios-border text-xs font-bold uppercase rounded-lg cursor-pointer text-[var(--fios-text-muted)]"
              >
                Hide all
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
