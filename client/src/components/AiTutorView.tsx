import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, User, Send, Loader2, Trash2, Sparkles, Paperclip, FileText, Image as ImageIcon, X,
} from 'lucide-react';
import { askTutor } from '../services/aiApi';
import { queryRag } from '../lib/ragClient';
import { FormattedContent } from './FormattedContent';
import { GeminiGate } from './GeminiGate';
import { useAiAuth } from '../context/AiAuthContext';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/demo';
import { toast } from '../lib/toast';
import { getGeminiKey } from '../lib/geminiKey';
import { apiUrl } from '../lib/apiBase';
import { extractTextFromPDF } from '../lib/pdfExtractor';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
  attachmentLabel?: string;
}

interface PendingAttachment {
  name: string;
  kind: 'pdf' | 'txt' | 'image';
  /** Extracted text or vision markdown notes */
  text: string;
}

const LS_KEY = 'fios_tutor_messages';
const MAX_ATTACH_CHARS = 24_000;

function loadLocal(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(msgs: ChatMessage[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(msgs.slice(-80)));
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const b64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(b64);
    };
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

async function processAttachment(file: File): Promise<PendingAttachment> {
  const name = file.name || 'attachment';
  const lower = name.toLowerCase();
  const mime = file.type || '';

  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(lower)) {
    const mediaBase64 = await fileToBase64(file);
    const response = await fetch(apiUrl('/api/media/process'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaBase64,
        mimeType: mime || 'image/jpeg',
        apiKey: getGeminiKey(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Vision failed (${response.status})`);
    const text =
      (typeof data.markdown === 'string' && data.markdown) ||
      (typeof data.notes === 'string' && data.notes) ||
      (typeof data.text === 'string' && data.text) ||
      '';
    if (!text.trim()) throw new Error('No notes returned from image.');
    return { name, kind: 'image', text: text.trim().slice(0, MAX_ATTACH_CHARS) };
  }

  if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
    let text = '';
    try {
      text = await extractTextFromPDF(file);
    } catch {
      /* fall through to server */
    }
    if (!text.trim()) {
      const fd = new FormData();
      fd.append('file', file);
      const key = getGeminiKey();
      const response = await fetch(apiUrl('/api/upload/pdf'), {
        method: 'POST',
        headers: key ? { 'x-gemini-key': key } : undefined,
        body: fd,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `PDF extract failed (${response.status})`);
      text = data.text || data.content || '';
    }
    if (!text.trim()) throw new Error('Could not extract text from PDF.');
    return { name, kind: 'pdf', text: text.trim().slice(0, MAX_ATTACH_CHARS) };
  }

  // TXT / plain text
  const text = await file.text();
  if (!text.trim()) throw new Error('Empty text file.');
  return { name, kind: 'txt', text: text.trim().slice(0, MAX_ATTACH_CHARS) };
}

const AiTutorInner: React.FC = () => {
  const { requireAiAuth } = useAiAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const local = loadLocal();
    if (local.length) {
      setMessages(local);
      return;
    }
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      text: 'Hi! I\'m your independent Fios AI Tutor. Ask anything about your courses — attach PDFs, photos of slides, or TXT notes and I\'ll use them as context.',
      created_at: new Date().toISOString(),
    }]);
  }, []);

  useEffect(() => {
    if (messages.length) saveLocal(messages);
  }, [messages]);

  const persistRemote = useCallback(async (msg: ChatMessage) => {
    if (IS_DEMO) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('tutor_messages').insert({
        user_id: user.id,
        role: msg.role,
        content: msg.text,
      });
    } catch {
      /* table may not exist yet */
    }
  }, []);

  const ingestFile = async (file: File) => {
    if (!requireAiAuth()) return;
    setAttaching(true);
    try {
      const att = await processAttachment(file);
      setAttachment(att);
      toast(`${att.kind.toUpperCase()} ready — ask a question`, 'success');
    } catch (err: any) {
      toast(err?.message || 'Could not process file', 'error');
    } finally {
      setAttaching(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const send = async () => {
    if ((!question.trim() && !attachment) || thinking) return;
    if (!requireAiAuth()) return;
    const q = question.trim() || (attachment ? `Please explain the attached ${attachment.kind}: ${attachment.name}` : '');
    setQuestion('');
    const label = attachment ? attachment.name : undefined;
    const attachText = attachment?.text;
    setAttachment(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: label ? `[📎 ${label}]\n${q}` : q,
      created_at: new Date().toISOString(),
      attachmentLabel: label,
    };
    setMessages((prev) => [...prev, userMsg]);
    void persistRemote(userMsg);
    setThinking(true);
    try {
      let ragContext: string[] = [];
      try {
        const rag = await queryRag({ query: q, k: 4 });
        ragContext = rag.passages || [];
      } catch {
        /* soft fail */
      }
      const parts: string[] = [];
      if (attachText) {
        parts.push(`Attached ${label || 'material'}:\n${attachText}`);
      }
      if (ragContext.length) {
        parts.push(`Retrieved note passages:\n${ragContext.join('\n---\n')}`);
      }
      const context =
        parts.length > 0
          ? parts.join('\n\n')
          : 'General computer science and university study context.';
      const { answer } = await askTutor(q, context);
      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: answer,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
      void persistRemote(botMsg);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: `Sorry — ${err?.message || 'request failed'}.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setThinking(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(LS_KEY);
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      text: 'Chat cleared. What would you like to study?',
      created_at: new Date().toISOString(),
    }]);
    setAttachment(null);
    toast('Tutor history cleared', 'info');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void ingestFile(f);
  };

  return (
    <div
      className={`max-w-3xl mx-auto h-[calc(100dvh-8rem)] md:h-[calc(100dvh-6rem)] flex flex-col font-sans text-[var(--fios-text)] ${
        dragOver ? 'ring-2 ring-[var(--fios-accent-solid)] rounded-xl' : ''
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <header className="flex items-center justify-between gap-3 pb-4 border-b fios-border shrink-0">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 accent-solid-text" /> AI Tutor
          </h2>
          <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
            Multi-modal · PDF / TXT / photos · drag-drop or camera
          </p>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          className="px-3 py-2 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-xs font-bold text-[var(--fios-text-muted)] hover:text-rose-400 cursor-pointer flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 scroll-touch">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-[var(--fios-surface-2)]' : 'accent-bg text-slate-950'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] bg-[var(--fios-surface)] border fios-border`}>
              {m.role === 'assistant' ? <FormattedContent text={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      {attachment && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl border fios-border bg-[var(--fios-surface-2)] text-xs">
          {attachment.kind === 'image' ? <ImageIcon className="w-3.5 h-3.5 accent-solid-text" /> : <FileText className="w-3.5 h-3.5 accent-solid-text" />}
          <span className="font-mono truncate flex-1">{attachment.name}</span>
          <button type="button" onClick={() => setAttachment(null)} className="p-1 cursor-pointer text-[var(--fios-text-muted)]" aria-label="Remove attachment">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="pt-3 border-t fios-border flex items-center gap-2 shrink-0 safe-bottom">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,text/plain,application/pdf,image/*,.png,.jpg,.jpeg,.webp,.gif,.heic"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void ingestFile(f);
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void ingestFile(f);
          }}
        />
        <button
          type="button"
          disabled={attaching || thinking}
          onClick={() => {
            if (!requireAiAuth()) return;
            fileRef.current?.click();
          }}
          className="p-3 rounded-xl border fios-border bg-[var(--fios-surface-2)] text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer disabled:opacity-40"
          aria-label="Attach PDF, TXT, or photo"
          title="Attach PDF / TXT / photo"
        >
          {attaching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
        <button
          type="button"
          disabled={attaching || thinking}
          onClick={() => {
            if (!requireAiAuth()) return;
            cameraRef.current?.click();
          }}
          className="p-3 rounded-xl border fios-border bg-[var(--fios-surface-2)] text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer disabled:opacity-40 md:hidden"
          aria-label="Take or choose photo"
          title="Camera / gallery"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Ask about slides, diagrams, notes…"
          className="flex-1 bg-[var(--fios-surface)] border fios-border rounded-xl px-3.5 py-3 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border shadow-sm dark:shadow-none"
          aria-label="Tutor question"
        />
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => void send()}
          disabled={thinking || (!question.trim() && !attachment)}
          className="p-3 accent-bg text-slate-950 rounded-xl cursor-pointer disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};

export const AiTutorView: React.FC = () => (
  <GeminiGate feature="AI Tutor">
    <AiTutorInner />
  </GeminiGate>
);

export default AiTutorView;
