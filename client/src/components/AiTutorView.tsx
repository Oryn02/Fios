import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import { askTutor } from '../services/aiApi';
import { queryRag } from '../lib/ragClient';
import { FormattedContent } from './FormattedContent';
import { GeminiGate } from './GeminiGate';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/demo';
import { toast } from '../lib/toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
}

const LS_KEY = 'fios_tutor_messages';

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

const AiTutorInner: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    const local = loadLocal();
    if (local.length) {
      setMessages(local);
      return;
    }
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      text: 'Hi! I\'m your independent Fios AI Tutor. Ask anything about your courses — I can also pull RAG-indexed note chunks when available.',
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
      /* table may not exist yet — localStorage is the fallback */
    }
  }, []);

  const send = async () => {
    if (!question.trim() || thinking) return;
    const q = question.trim();
    setQuestion('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: q,
      created_at: new Date().toISOString(),
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
        /* soft fail — tutor still works without RAG */
      }
      const context =
        ragContext.length > 0
          ? `Retrieved note passages:\n${ragContext.join('\n---\n')}`
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
    toast('Tutor history cleared', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100dvh-8rem)] md:h-[calc(100dvh-6rem)] flex flex-col font-sans text-[var(--fios-text)]">
      <header className="flex items-center justify-between gap-3 pb-4 border-b fios-border shrink-0">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 accent-solid-text" /> AI Tutor
          </h2>
          <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
            Full-screen tutor with persistent chat · optional RAG grounding
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

      <div className="pt-3 border-t fios-border flex items-center gap-2 shrink-0 safe-bottom">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Ask the tutor…"
          className="flex-1 bg-[var(--fios-surface)] border fios-border rounded-xl px-3.5 py-3 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border"
          aria-label="Tutor question"
        />
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => void send()}
          disabled={thinking || !question.trim()}
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
