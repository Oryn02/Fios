import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Sparkles, Loader2, BookOpen, MessageSquare, Send, Trash2, X, Bot, User, Upload, Tag,
} from 'lucide-react';
import { FileUpload } from './FileUpload';
import { summarizeText, askTutor } from '../services/aiApi';
import { getDocuments, saveDocument, deleteDocument } from '../lib/documentService';
import { getUserModules, type DBModule } from '../lib/moduleService';
import type { FiosDocument } from '../types/db';
import { GeminiGate } from './GeminiGate';
import { FormattedContent } from './FormattedContent';

interface ChatMessage { role: 'user' | 'assistant'; text: string; }

interface DocumentsInnerProps {
  initialDocId?: string | null;
  autoOpenTutor?: boolean;
}

const DocumentsInner: React.FC<DocumentsInnerProps> = ({ initialDocId, autoOpenTutor }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [modules, setModules] = useState<DBModule[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<FiosDocument[]>([]);
  const [active, setActive] = useState<FiosDocument | null>(null);

  // AI tutor drawer
  const [tutorOpen, setTutorOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);

  const load = useCallback(async () => {
    const d = await getDocuments();
    setDocs(d);
    return d;
  }, []);

  const openTutor = useCallback((doc: FiosDocument) => {
    setActive(doc);
    const greeting = doc.id === 'general-tutor'
      ? "Hi! How can I help you with your studies today?"
      : `Hi! Ask me anything about "${doc.title}". I'll answer based on your notes.`;
    setMessages([{ role: 'assistant', text: greeting }]);
    setTutorOpen(true);
  }, []);

  useEffect(() => {
    getUserModules().then(setModules).catch(() => setModules([]));
    load().then((docsList) => {
      let targetDoc: FiosDocument | null = null;

      if (initialDocId && docsList && docsList.length > 0) {
        targetDoc = docsList.find((doc) => doc.id === initialDocId) || null;
      } else if (autoOpenTutor && docsList && docsList.length > 0) {
        targetDoc = docsList[0];
      }

      if (targetDoc) {
        setActive(targetDoc);
        if (autoOpenTutor) {
          openTutor(targetDoc);
        }
      } else if (autoOpenTutor) {
        const fallbackDoc: FiosDocument = {
          id: 'general-tutor',
          user_id: 'general',
          title: 'General Study Assistant',
          content: 'You are a general academic tutor assisting a software development student.',
          summary: 'General Academic AI Tutor',
          glossary: [],
          created_at: new Date().toISOString(),
        };
        setActive(fallbackDoc);
        openTutor(fallbackDoc);
      }
    });
  }, [load, initialDocId, autoOpenTutor, openTutor]);

  const handleSummarize = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await summarizeText(text);
      const saved = await saveDocument({
        title: title.trim() || text.trim().slice(0, 40),
        content: text,
        summary: result.summary,
        glossary: result.glossary || [],
        module_code: moduleCode || null,
      });
      setDocs((prev) => [saved, ...prev]);
      setActive(saved);
      setText('');
      setTitle('');
    } catch (err: any) {
      setError(err.message || 'Failed to summarize.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDocument(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (active?.id === id) setActive(null);
  };

  const send = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setThinking(true);
    try {
      const context = active?.content || active?.summary || 'General computer science & study context.';
      const { answer } = await askTutor(q, context);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Sorry, I hit an error: ${err.message}` }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-[var(--fios-text)]">
      <div>
        <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 accent-solid-text" /> Smart Notes · AI Tutor
        </h2>
        <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
          Upload notes or PDFs to get an AI summary, a key-term glossary, and a grounded tutor chat.
        </p>
      </div>

      {/* Uploader */}
      <div className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title…"
            className="flex-1 bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3.5 py-2.5 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border"
          />
          <div className="flex items-center gap-2 bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3 py-2.5 shrink-0">
            <Tag className="w-3.5 h-3.5 accent-solid-text" />
            <select
              value={moduleCode}
              onChange={(e) => setModuleCode(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-[var(--fios-text)] focus:outline-none cursor-pointer uppercase"
            >
              <option value="" className="bg-[var(--fios-surface)] text-[var(--fios-text)]">General</option>
              {modules.map((m) => (
                <option key={m.id} value={m.code} className="bg-[var(--fios-surface)] text-[var(--fios-text)]">
                  {m.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FileUpload onTextExtracted={(t) => setText(t)} />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…or paste your notes here to summarize."
          className="w-full h-32 p-4 bg-[var(--fios-surface-2)] border fios-border rounded-xl text-[var(--fios-text)] placeholder:text-slate-500 focus:outline-none focus:accent-border font-mono text-xs"
        />

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={handleSummarize}
          disabled={busy || !text.trim()}
          className="w-full py-3 accent-bg text-slate-950 font-black italic uppercase text-xs rounded-xl transition-transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? 'Summarizing…' : 'Summarize & Save'}
        </motion.button>
        {error && <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-xs font-mono rounded-r-lg">{error}</div>}
      </div>

      {/* Active doc detail */}
      {active && active.id !== 'general-tutor' && (
        <div className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <BookOpen className="w-4 h-4 accent-solid-text" /> {active.title}
              </h3>
              {active.module_code && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {active.module_code}
                </span>
              )}
            </div>
            <button onClick={() => openTutor(active)} className="px-3 py-1.5 accent-bg text-slate-950 text-xs font-black uppercase rounded-lg flex items-center gap-1.5 cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5" /> Ask AI Tutor
            </button>
          </div>
          {active.summary && <p className="text-sm text-[var(--fios-text-muted)] leading-relaxed">{active.summary}</p>}
          {active.glossary?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {active.glossary.map((g, i) => (
                <div key={i} className="bg-[var(--fios-surface-2)] border fios-border rounded-lg p-3">
                  <p className="text-xs font-black accent-solid-text">{g.term}</p>
                  <p className="text-xs text-[var(--fios-text-muted)] mt-0.5">{g.definition}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved docs */}
      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 border-b fios-border pb-3">
          <FileText className="w-4 h-4 accent-solid-text" /> Documents <span className="text-xs font-mono text-[var(--fios-text-muted)] ml-auto">{docs.length}</span>
        </h3>
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed fios-border p-10 text-center space-y-2">
            <Upload className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs font-bold uppercase text-[var(--fios-text-muted)]">No documents yet</p>
            <p className="text-[11px] font-mono text-slate-500">Upload a PDF or paste notes above to build your AI-summarized library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map((doc) => (
              <motion.div key={doc.id} whileHover={{ y: -2 }} onClick={() => setActive(doc)}
                className="p-4 rounded-xl border fios-border bg-[var(--fios-surface)] hover:accent-border transition-colors cursor-pointer space-y-2 group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded accent-bg text-slate-950">{doc.glossary?.length || 0} terms</span>
                  <div className="flex items-center gap-2">
                    {doc.module_code && (
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{doc.module_code}</span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); openTutor(doc); }} className="text-slate-500 hover:accent-solid-text p-0.5 cursor-pointer" title="Ask AI Tutor"><MessageSquare className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleDelete(e, doc.id)} className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h4 className="text-sm font-bold line-clamp-1 group-hover:accent-solid-text transition-colors">{doc.title}</h4>
                <p className="text-[11px] text-[var(--fios-text-muted)] line-clamp-2">{doc.summary}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* AI Tutor drawer */}
      <AnimatePresence>
        {tutorOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60" onClick={() => setTutorOpen(false)} />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-[71] h-dvh w-full sm:w-[420px] bg-[var(--fios-surface)] border-l fios-border shadow-2xl flex flex-col safe-bottom"
            >
              <div className="p-4 border-b fios-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg accent-bg flex items-center justify-center text-slate-950"><Bot className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-black">Fios AI Tutor</p>
                    <p className="text-[10px] font-mono text-[var(--fios-text-muted)] truncate max-w-[240px]">{active?.title || 'General Assistant'}</p>
                  </div>
                </div>
                <button onClick={() => setTutorOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-touch">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-[var(--fios-surface-2)] text-[var(--fios-text)]' : 'accent-bg text-slate-950'}`}>
                      {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-[var(--fios-surface-2)]' : 'bg-[var(--fios-surface-2)] border fios-border'}`}>
                      {m.role === 'assistant' ? <FormattedContent text={m.text} /> : m.text}
                    </div>
                  </div>
                ))}
                {thinking && <div className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>}
              </div>

              <div className="p-3 border-t fios-border flex items-center gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                  placeholder="Ask a question..."
                  className="flex-1 bg-[var(--fios-surface-2)] border fios-border rounded-xl px-3 py-2.5 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border"
                />
                <button onClick={send} disabled={thinking || !question.trim()} className="p-2.5 accent-bg text-slate-950 rounded-xl cursor-pointer disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DocumentsView: React.FC<{ initialDocId?: string | null; autoOpenTutor?: boolean }> = ({ initialDocId, autoOpenTutor }) => (
  <GeminiGate feature="Smart Notes & AI Tutor">
    <DocumentsInner initialDocId={initialDocId} autoOpenTutor={autoOpenTutor} />
  </GeminiGate>
);

export default DocumentsView;