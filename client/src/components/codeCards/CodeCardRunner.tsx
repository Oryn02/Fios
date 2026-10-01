import React, { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { runCodeCard } from '../../services/studyApi';
import { toast } from '../../lib/toast';

const LANGS = [
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { value: 'java', label: 'Java', monaco: 'java' },
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'csharp', label: 'C#', monaco: 'csharp' },
] as const;

export interface CodeCardRunnerProps {
  language?: string | null;
  starterCode?: string | null;
  expectedOutput?: string | null;
  prompt?: string;
}

export const CodeCardRunner: React.FC<CodeCardRunnerProps> = ({
  language = 'javascript',
  starterCode = '',
  expectedOutput = '',
  prompt,
}) => {
  const { resolvedTheme } = useTheme();
  const lang = (language || 'javascript').toLowerCase();
  const monacoLang = useMemo(
    () => LANGS.find((l) => l.value === lang || l.monaco === lang)?.monaco || 'javascript',
    [lang]
  );
  const [code, setCode] = useState(starterCode || '');
  const [busy, setBusy] = useState(false);
  const [stdout, setStdout] = useState<string | null>(null);
  const [stderr, setStderr] = useState<string | null>(null);
  const [pass, setPass] = useState<boolean | null>(null);

  const handleRun = async () => {
    setBusy(true);
    setStdout(null);
    setStderr(null);
    setPass(null);
    try {
      const result = await runCodeCard({
        language: lang,
        code,
        expectedOutput: expectedOutput || undefined,
      });
      const out = String(result.stdout ?? result.output ?? '');
      const err = String(result.stderr ?? result.error ?? '');
      setStdout(out);
      setStderr(err || null);
      let ok = typeof result.pass === 'boolean' ? result.pass : null;
      if (ok == null && expectedOutput != null && expectedOutput !== '') {
        ok = out.trim() === String(expectedOutput).trim();
      }
      setPass(ok);
      if (ok === true) toast('Output matches expected', 'success');
      else if (ok === false) toast('Output does not match expected', 'info');
    } catch (e: any) {
      setStderr(e?.message || 'Run failed');
      setPass(false);
      toast(e?.message || 'Code run failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-3 text-left" onClick={(e) => e.stopPropagation()}>
      {prompt ? (
        <p className="text-xs text-[var(--fios-text-muted)] font-mono">{prompt}</p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
          {LANGS.find((l) => l.value === lang)?.label || lang}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRun()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 accent-bg text-slate-950 text-[10px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run
        </button>
      </div>
      <div className="h-48 rounded-xl overflow-hidden border fios-border">
        <Editor
          height="100%"
          theme={resolvedTheme === 'light' ? 'vs' : 'vs-dark'}
          language={monacoLang}
          value={code}
          onChange={(v) => setCode(v || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
      {(stdout != null || stderr || pass != null) && (
        <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3 space-y-2 font-mono text-[11px]">
          {pass != null && (
            <div className={`flex items-center gap-1.5 font-bold ${pass ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {pass ? 'PASS' : 'FAIL'}
            </div>
          )}
          {stdout != null && (
            <div>
              <p className="text-[9px] uppercase text-[var(--fios-text-muted)] mb-0.5">stdout</p>
              <pre className="whitespace-pre-wrap text-[var(--fios-text)]">{stdout || '(empty)'}</pre>
            </div>
          )}
          {expectedOutput ? (
            <div>
              <p className="text-[9px] uppercase text-[var(--fios-text-muted)] mb-0.5">expected</p>
              <pre className="whitespace-pre-wrap text-[var(--fios-text-muted)]">{expectedOutput}</pre>
            </div>
          ) : null}
          {stderr ? (
            <div>
              <p className="text-[9px] uppercase text-rose-400 mb-0.5">stderr</p>
              <pre className="whitespace-pre-wrap text-rose-300">{stderr}</pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CodeCardRunner;
