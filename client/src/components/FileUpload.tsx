import React, { useRef, useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { extractTextFromPDF } from '../lib/pdfExtractor';

interface FileUploadProps {
  onTextExtracted: (text: string, filename: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onTextExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('text/')) {
      setError('Please upload a PDF or plain text (.txt) file.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFileName(file.name);

    try {
      let extracted = '';
      if (file.type === 'application/pdf') {
        extracted = await extractTextFromPDF(file);
      } else {
        extracted = await file.text();
      }

      onTextExtracted(extracted, file.name);
    } catch (err: any) {
      setError(err.message || 'Failed to extract text from file.');
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
        accept=".pdf,.txt"
        className="hidden"
      />

      {!fileName ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={
            {
              '--tw-border-opacity': '1',
            } as React.CSSProperties
          }
          className="border-2 border-dashed border-slate-700 hover:border-[var(--fios-accent-solid)] rounded-xl p-5 text-center bg-[#07090e]/50 hover:bg-[#07090e] transition-all cursor-pointer group hover:shadow-[0_0_20px_color-mix(in_srgb,var(--fios-accent-solid)_25%,transparent)]"
        >
          <div className="flex flex-col items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-6 h-6 accent-solid-text animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-slate-500 group-hover:accent-solid-text transition-colors" />
            )}
            <p className="text-xs font-medium text-slate-400">
              <span className="accent-solid-text font-bold">Click to upload</span> or drag and drop lecture slides / PDFs
            </p>
            <p className="text-[10px] font-mono text-slate-600 uppercase">
              Supports PDF, TXT (Max 10MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-[var(--fios-surface-2)] border accent-border rounded-xl">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 accent-solid-text shrink-0" />
            <span className="text-xs font-mono text-[var(--fios-text)] truncate max-w-xs">
              {fileName}
            </span>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
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