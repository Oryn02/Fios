import React, { useState } from 'react';
import { ExternalLink, CheckCircle2, ShieldCheck, Key, RefreshCw, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface WalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKey: (key: string) => void;
}

export const GeminiWalkthroughModal: React.FC<WalkthroughProps> = ({ isOpen, onClose, onSaveKey }) => {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ valid: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const testAndSave = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setStatus(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('ping');
      
      setStatus({ valid: true, message: 'API key verified successfully!' });
      setTimeout(() => {
        onSaveKey(apiKey.trim());
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatus({ valid: false, message: 'Invalid API key. Please check Google AI Studio.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connect Gemini API Key</h3>
            <p className="text-xs text-slate-400">Unlock unlimited AI flashcards, quizzes & code exams for free</p>
          </div>
        </div>

        <div className="space-y-4 my-6">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <div className="text-xs">
              <p className="font-semibold text-white">Get your free key from Google</p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline mt-1 font-medium"
              >
                Open Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <p className="text-xs text-slate-300 pt-0.5">
              Sign in with your Google Account and click <strong className="text-white">"Create API Key"</strong>.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <div className="w-full text-xs">
              <p className="text-slate-300 mb-2">Paste your key starting with <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">AIzaSy...</code></p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {status && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 border ${status.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            <CheckCircle2 className="w-4 h-4" />
            {status.message}
          </div>
        )}

        <button
          onClick={testAndSave}
          disabled={testing || !apiKey.trim()}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {testing ? 'Verifying Key...' : 'Test & Save API Key'}
        </button>
      </div>
    </div>
  );
};