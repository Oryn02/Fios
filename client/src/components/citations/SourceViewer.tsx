import React, { useEffect, useRef, useState } from 'react';
import { X, FileText, Highlighter } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

try {
  GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
} catch {
  /* ignore */
}

export interface SourceViewerProps {
  pdfUrl?: string | null;
  file?: File | null;
  arrayBuffer?: ArrayBuffer | null;
  page: number;
  quote?: string | null;
  onClose: () => void;
}

/**
 * Side-by-side citation viewer: left = PDF page canvas, right = quote highlight.
 */
export const SourceViewer: React.FC<SourceViewerProps> = ({
  pdfUrl,
  file,
  arrayBuffer,
  page,
  quote,
  onClose,
}) => {
  useBodyScrollLock(true, '[data-modal-scroll]');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let data: Uint8Array | { url: string };
        if (arrayBuffer) {
          data = new Uint8Array(arrayBuffer);
        } else if (file) {
          data = new Uint8Array(await file.arrayBuffer());
        } else if (pdfUrl) {
          data = { url: pdfUrl };
        } else {
          setError('No PDF source available for this card.');
          setLoading(false);
          return;
        }
        const pdf = await getDocument(data as any).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const pageNum = Math.min(Math.max(1, page || 1), pdf.numPages);
        const pdfPage = await pdf.getPage(pageNum);
        const viewport = pdfPage.getViewport({ scale: 1.25 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await pdfPage.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not render PDF page');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, file, arrayBuffer, page]);

  const highlightQuote = (text: string, q: string | null | undefined) => {
    if (!q?.trim()) return <p className="text-sm text-[var(--fios-text)] whitespace-pre-wrap">{text || 'No quote stored.'}</p>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase().slice(0, 40));
    if (idx < 0) {
      return (
        <mark className="bg-amber-400/30 text-[var(--fios-text)] px-0.5 rounded">{q}</mark>
      );
    }
    return (
      <p className="text-sm text-[var(--fios-text)] whitespace-pre-wrap leading-relaxed">
        {text.slice(0, idx)}
        <mark className="bg-amber-400/40 text-[var(--fios-text)] px-0.5 rounded">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-5xl max-h-[90dvh] flex flex-col rounded-2xl border fios-border bg-[var(--fios-surface)] shadow-sm overflow-hidden"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 border-b fios-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">Citations</p>
            <h3 className="text-sm font-black uppercase text-[var(--fios-text)] truncate flex items-center gap-2">
              <FileText className="w-4 h-4 accent-solid-text" /> View Source · Page {page || 1}
              {pageCount ? <span className="text-[10px] font-mono text-[var(--fios-text-muted)]">/ {pageCount}</span> : null}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="touch-target shrink-0 rounded-lg text-[var(--fios-text-muted)] cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div data-modal-scroll className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          <div className="overflow-auto scroll-touch p-3 border-b md:border-b-0 md:border-r fios-border bg-[var(--fios-surface-2)] flex justify-center items-start">
            {loading && <p className="text-xs font-mono text-[var(--fios-text-muted)] p-4">Rendering page…</p>}
            {error && <p className="text-xs text-rose-400 p-4">{error}</p>}
            <canvas ref={canvasRef} className={`max-w-full h-auto ${loading || error ? 'hidden' : ''}`} />
          </div>
          <div className="overflow-auto scroll-touch p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
              <Highlighter className="w-3.5 h-3.5" /> Source quote
            </div>
            <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-4">
              {highlightQuote(quote || '', quote)}
            </div>
            {!pdfUrl && !file && !arrayBuffer && (
              <p className="text-[11px] text-[var(--fios-text-muted)]">
                PDF binary not attached — showing stored quote only. Re-upload the source document to enable page preview.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceViewer;
