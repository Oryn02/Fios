import React, { useRef, useState } from 'react';
import { Upload, FileText, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { extractTextFromPDF } from '../lib/pdfExtractor';
import { uploadPdfToServer } from '../lib/ragClient';
import { apiUrl } from '../lib/apiBase';
import { getGeminiKey } from '../lib/geminiKey';
import { useAiAuth } from '../context/AiAuthContext';

interface FileUploadProps {
  onTextExtracted: (text: string, filename?: string) => void;
}

function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function processImageViaVision(file: File): Promise<string> {
  const mediaBase64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';
  const response = await fetch(apiUrl('/api/media/process'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaBase64,
      mimeType,
      apiKey: getGeminiKey(),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any)?.error || `Image processing failed (${response.status})`);
  }
  const markdown =
    (typeof (data as any).markdown === 'string' && (data as any).markdown) ||
    (typeof (data as any).notes === 'string' && (data as any).notes) ||
    (typeof (data as any).text === 'string' && (data as any).text) ||
    '';
  if (!markdown.trim()) throw new Error('No notes returned from Vision for this image.');
  return markdown.trim();
}

/**
 * Study-material upload: PDF / TXT / images (Photos + Android).
 * iOS PDF prefers server extraction; client PDF.js remains a fast path elsewhere.
 * No platform hard-block — Android is never gated.
 */
export const FileUpload: React.FC<FileUploadProps> = ({ onTextExtracted }) => {
  const { requireAiAuth } = useAiAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    if (!requireAiAuth()) return;

    const lower = file.name.toLowerCase();
    const isPDF = file.type === 'application/pdf' || lower.endsWith('.pdf');
    const isText = file.type.startsWith('text/') || lower.endsWith('.txt');
    const isImage =
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(file.name);

    if (!isPDF && !isText && !isImage) {
      setError('Please upload a PDF, plain text (.txt), or image (Photos / gallery).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError('File too large (max ~12MB). Try a smaller PDF or image.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFileName(file.name);

    try {
      let extracted = '';

      if (isImage) {
        extracted = await processImageViaVision(file);
      } else if (isText) {
        extracted = await file.text();
      } else if (isPDF) {
        // iOS / iPadOS: prefer server extract (Files picker → multipart).
        // Other platforms: try client PDF.js first, fall back to server.
        const preferServer = isIosLike();
        if (preferServer) {
          const res = await uploadPdfToServer(file);
          const data = (res.data || {}) as { text?: string; error?: string };
          if (res.ok && typeof data.text === 'string' && data.text.trim()) {
            extracted = data.text.trim();
          } else {
            // Soft fallback to client extract if server could not parse
            try {
              extracted = await extractTextFromPDF(file);
            } catch {
              throw new Error(
                data.error ||
                  'Could not extract text from this PDF. Try another file, paste notes, or upload a photo for Vision.'
              );
            }
          }
        } else {
          try {
            extracted = await extractTextFromPDF(file);
            void uploadPdfToServer(file, extracted).then((res) => {
              if (!res.ok) console.info('[FileUpload] server PDF upload soft-failed', res.data);
            });
          } catch (clientErr: any) {
            const res = await uploadPdfToServer(file);
            const data = (res.data || {}) as { text?: string; error?: string };
            if (res.ok && typeof data.text === 'string' && data.text.trim()) {
              extracted = data.text.trim();
            } else {
              throw new Error(
                data.error ||
                  clientErr?.message ||
                  'Could not extract text from this PDF on device or server.'
              );
            }
          }
        }
      }

      if (!extracted.trim()) {
        throw new Error('No text could be extracted from this file.');
      }

      onTextExtracted(extracted, file.name);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract text from file.');
      setFileName(null);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,.pdf,text/plain,.txt,image/*,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
        className="hidden"
      />

      {!fileName ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => {
            if (!requireAiAuth()) return;
            fileInputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!requireAiAuth()) return;
              fileInputRef.current?.click();
            }
          }}
          style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
          className="border-2 border-dashed border-border hover:border-[var(--fios-accent-solid)] rounded-xl p-5 text-center bg-background/50 hover:bg-background transition-all cursor-pointer group hover:shadow-[0_0_20px_color-mix(in_srgb,var(--fios-accent-solid)_25%,transparent)]"
        >
          <div className="flex flex-col items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-6 h-6 accent-solid-text animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground group-hover:accent-solid-text transition-colors" />
            )}
            <p className="text-xs font-medium text-muted-foreground">
              <span className="accent-solid-text font-bold">Click to upload</span> or drag and drop lecture slides / PDFs / photos
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase">
              Supports PDF, TXT, Images · Photos & Files · Max ~12MB
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-[var(--fios-surface-2)] border accent-border rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            {/\.(png|jpe?g|gif|webp|heic|heif)$/i.test(fileName) ? (
              <ImageIcon className="w-4 h-4 accent-solid-text shrink-0" />
            ) : (
              <FileText className="w-4 h-4 accent-solid-text shrink-0" />
            )}
            <span className="text-xs font-mono text-[var(--fios-text)] truncate max-w-xs">
              {fileName}
            </span>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
            aria-label="Clear uploaded file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wide">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
