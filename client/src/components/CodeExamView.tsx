import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Code2, Sparkles, Play, Save, RotateCcw, CheckCircle2, XCircle,
  Trophy, Bug, Terminal, PencilRuler, Trash2, Folder, Loader2, Eye, EyeOff,
} from 'lucide-react';
import { generateCodeExam, gradeCodeExam, type CodeGradeResult } from '../services/codeApi';
import { useAiAuth } from '../context/AiAuthContext';
import { getCodeExams, saveCodeExam, deleteCodeExam } from '../lib/codeExamService';
import { getUserModules, type DBModule } from '../lib/moduleService';
import {
  CODE_LANGUAGES, CODE_EXAM_TYPES,
  type CodeLanguage, type CodeExamType, type CodeExam,
} from '../types/db';
import { useTheme } from '../context/ThemeContext';
import { FormattedContent } from './FormattedContent';
import { formatSeededCode } from '../lib/formatSeededCode';

const EXAM_ICON: Record<CodeExamType, React.ReactNode> = {
  bug_fix: <Bug className="w-3.5 h-3.5" />,
  output_prediction: <Terminal className="w-3.5 h-3.5" />,
  logic_completion: <PencilRuler className="w-3.5 h-3.5" />,
};

const fieldLabel =
  'block text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wide text-[var(--fios-text)]';

const fieldControl =
  'w-full bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2.5 text-xs font-mono text-[var(--fios-text)] placeholder:text-[var(--fios-text-muted)]/70 focus:outline-none focus:accent-border cursor-pointer';

interface ActiveChallenge {
  title: string;
  language: CodeLanguage;
  examType: CodeExamType;
  prompt: string;
  starterCode: string;
  solutionCode: string;
  expectedOutput?: string;
  explanation?: string;
}

interface CodeExamViewProps {
  initialExamId?: string | null;
}

function fileExt(lang: CodeLanguage): string {
  if (lang === 'python') return 'py';
  if (lang === 'c') return 'c';
  if (lang === 'typescript') return 'ts';
  return 'js';
}

export const CodeExamView: React.FC<CodeExamViewProps> = ({ initialExamId }) => {
  const { resolvedTheme } = useTheme();
  const { requireAiAuth } = useAiAuth();
  const monacoTheme = resolvedTheme === 'light' ? 'vs' : 'vs-dark';
  const [language, setLanguage] = useState<CodeLanguage>('javascript');
  const [examType, setExamType] = useState<CodeExamType>('bug_fix');
  const [topic, setTopic] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [modules, setModules] = useState<DBModule[]>([]);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [userCode, setUserCode] = useState('');
  const [showSolution, setShowSolution] = useState(false);

  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<CodeGradeResult | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [savedExams, setSavedExams] = useState<CodeExam[]>([]);

  const monacoLanguage = useMemo(
    () => CODE_LANGUAGES.find((l) => l.value === language)?.monaco || 'javascript',
    [language]
  );

  const loadSaved = useCallback(async () => {
    const exams = await getCodeExams();
    setSavedExams(exams);
    return exams;
  }, []);

  const openSaved = useCallback((exam: CodeExam) => {
    const lang = exam.language;
    const starter = formatSeededCode(exam.starter_code || '', lang);
    const solution = formatSeededCode(exam.solution_code || '', lang);
    setChallenge({
      title: exam.title,
      language: lang,
      examType: exam.exam_type,
      prompt: exam.prompt,
      starterCode: starter,
      solutionCode: solution,
    });
    setUserCode(formatSeededCode(exam.user_code || exam.starter_code || '', lang));
    setLanguage(lang);
    setExamType(exam.exam_type);
    setModuleCode(exam.module_code || '');
    setGrade(null);
    setShowSolution(false);
  }, []);

  useEffect(() => {
    getUserModules().then(setModules).catch(() => setModules([]));
    loadSaved().then((examsList) => {
      if (initialExamId && examsList && examsList.length > 0) {
        const target = examsList.find((e) => e.id === initialExamId);
        if (target) openSaved(target);
      }
    });
  }, [loadSaved, initialExamId, openSaved]);

  const handleGenerate = useCallback(async () => {
    if (!requireAiAuth()) return;
    setGenerating(true);
    setError(null);
    setGrade(null);
    setShowSolution(false);
    try {
      const result = await generateCodeExam({
        language,
        examType,
        topic,
        customPrompt: customPrompt.trim() || undefined,
      });
      const lang = (result.language as CodeLanguage) || language;
      const starter = formatSeededCode(result.starterCode, lang);
      const solution = formatSeededCode(result.solutionCode, lang);
      const active: ActiveChallenge = {
        title: result.title,
        language: lang,
        examType: (result.examType as CodeExamType) || examType,
        prompt: result.prompt,
        starterCode: starter,
        solutionCode: solution,
        expectedOutput: result.expectedOutput,
        explanation: result.explanation,
      };
      setChallenge(active);
      setUserCode(starter);
      setLanguage(lang);
    } catch (err: any) {
      setError(err.message || 'Failed to generate challenge.');
    } finally {
      setGenerating(false);
    }
  }, [language, examType, topic, customPrompt, requireAiAuth]);

  const handleGrade = useCallback(async () => {
    if (!challenge) return;
    if (!requireAiAuth()) return;
    setGrading(true);
    setError(null);
    try {
      const result = await gradeCodeExam({
        language: challenge.language,
        prompt: challenge.prompt,
        solutionCode: challenge.solutionCode,
        userCode,
      });
      setGrade(result);
    } catch (err: any) {
      setError(err.message || 'Failed to grade submission.');
    } finally {
      setGrading(false);
    }
  }, [challenge, userCode, requireAiAuth]);

  const handleSave = useCallback(async () => {
    if (!challenge) return;
    try {
      const saved = await saveCodeExam({
        title: challenge.title,
        language: challenge.language,
        exam_type: challenge.examType,
        prompt: challenge.prompt,
        starter_code: challenge.starterCode,
        solution_code: challenge.solutionCode,
        user_code: userCode,
        module_code: moduleCode || null,
        completed: grade?.correct ?? false,
      });
      setSaveMsg(`Saved · id ${saved.id.slice(0, 8)}…`);
      setTimeout(() => setSaveMsg(null), 2500);
      const list = await loadSaved();
      const fresh = (list || []).find((e) => e.id === saved.id);
      if (fresh) openSaved(fresh);
    } catch (err: any) {
      setError(err.message || 'Failed to save exam.');
    }
  }, [challenge, userCode, moduleCode, grade, loadSaved, openSaved]);

  const handleDeleteSaved = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteCodeExam(id);
    loadSaved();
  }, [loadSaved]);

  const editorOptions = {
    fontSize: 13,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    smoothScrolling: true,
    automaticLayout: true,
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-[var(--fios-text)]">
      {/* Header */}
      <div className="space-y-1.5">
        <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2 text-[var(--fios-text)]">
          <Code2 className="w-6 h-6 accent-solid-text" />
          Code Lab · AI Exams
        </h2>
        <p className="text-sm font-mono text-[var(--fios-text-muted)]">
          Generate Gemini-powered coding challenges, solve them in the editor, and grade your solution.
        </p>
      </div>

      {/* Generator controls */}
      <section className="bg-[var(--fios-surface)] border fios-border rounded-2xl p-5 sm:p-6 shadow-[var(--fios-shadow-md)] space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className={fieldLabel}>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
              className={fieldControl}
            >
              {CODE_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className={fieldLabel}>Challenge Type</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value as CodeExamType)}
              className={fieldControl}
            >
              {CODE_EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className={fieldLabel}>Topic (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. recursion, pointers…"
              className={fieldControl}
            />
          </div>

          <div className="space-y-2">
            <label className={`${fieldLabel} flex items-center gap-1.5`}>
              <Folder className="w-3.5 h-3.5 accent-solid-text" /> Module
            </label>
            <select
              value={moduleCode}
              onChange={(e) => setModuleCode(e.target.value)}
              className={fieldControl}
            >
              <option value="">General</option>
              {modules.map((m) => (
                <option key={m.id} value={m.code}>{m.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className={fieldLabel}>Custom challenge prompt (optional)</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe a targeted challenge — e.g. ‘Write a recursive DFS that detects cycles in an adjacency list’…"
            rows={3}
            className={`${fieldControl} resize-y min-h-[88px] cursor-text`}
          />
        </div>

        <p className="text-xs font-mono text-[var(--fios-text-muted)] flex items-center gap-1.5">
          {EXAM_ICON[examType]}
          {CODE_EXAM_TYPES.find((t) => t.value === examType)?.description}
        </p>

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="w-full py-3.5 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors shadow-[var(--fios-shadow-md)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating challenge…' : 'Generate Code Challenge'}
        </motion.button>

        {error && (
          <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-xs font-mono rounded-r-lg">
            {error}
          </div>
        )}
      </section>

      {/* Active challenge workspace */}
      <AnimatePresence mode="wait">
        {challenge && (
          <motion.section
            key={challenge.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
          >
            {/* Left: task + editor + actions */}
            <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
              <div className="bg-[var(--fios-surface)] border fios-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-[var(--fios-shadow-sm)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    {EXAM_ICON[challenge.examType]} {challenge.examType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/25">
                    {challenge.language}
                  </span>
                </div>
                <h3 className="text-base font-black uppercase tracking-wide text-[var(--fios-text)]">
                  {challenge.title}
                </h3>
                <p className="text-sm text-[var(--fios-text-muted)] font-mono leading-relaxed whitespace-pre-wrap">
                  {challenge.prompt}
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border fios-border bg-[var(--fios-surface)] flex-1 flex flex-col shadow-[var(--fios-shadow-sm)] min-h-[360px]">
                <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--fios-surface-2)] border-b fios-border">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wide text-[var(--fios-text)]">
                    solution.{fileExt(challenge.language)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserCode(challenge.starterCode)}
                    className="text-[11px] font-mono font-semibold text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset code
                  </button>
                </div>
                <div className="flex-1 min-h-[320px]">
                  <Editor
                    height="100%"
                    theme={monacoTheme}
                    language={monacoLanguage}
                    value={userCode}
                    onChange={(v) => setUserCode(v ?? '')}
                    options={editorOptions}
                    loading={<div className="p-6 text-xs font-mono text-[var(--fios-text-muted)]">Loading editor…</div>}
                  />
                </div>
              </div>

              {/* Action hierarchy: primary full-width, secondary row */}
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => void handleGrade()}
                  disabled={grading}
                  className="w-full py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-[var(--fios-shadow-sm)]"
                >
                  {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                  {grading ? 'Grading…' : 'Submit & Grade'}
                </motion.button>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => void handleSave()}
                    className="py-2.5 px-4 bg-[var(--fios-surface-2)] border fios-border hover:accent-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 accent-solid-text" /> Save exam
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowSolution((s) => !s)}
                    className="py-2.5 px-4 bg-[var(--fios-surface-2)] border fios-border hover:accent-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {showSolution ? (
                      <><EyeOff className="w-3.5 h-3.5 text-amber-400" /> Hide solution</>
                    ) : (
                      <><Eye className="w-3.5 h-3.5 text-amber-400" /> Show solution</>
                    )}
                  </motion.button>
                </div>
                {saveMsg && (
                  <p className="text-xs font-mono accent-solid-text font-bold text-center">{saveMsg}</p>
                )}
              </div>
            </div>

            {/* Right: grade + reference — stretch to match left column */}
            <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
              <AnimatePresence>
                {grade && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-2xl p-5 border shadow-[var(--fios-shadow-sm)] ${
                      grade.correct
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                        {grade.correct ? (
                          <><Trophy className="w-5 h-5 text-emerald-400" /> <span className="text-emerald-300">Passed</span></>
                        ) : (
                          <><XCircle className="w-5 h-5 text-amber-400" /> <span className="text-amber-300">Keep going</span></>
                        )}
                      </span>
                      <span className="text-2xl font-black font-mono text-[var(--fios-text)]">
                        {grade.score}<span className="text-sm text-[var(--fios-text-muted)]">/100</span>
                      </span>
                    </div>
                    <p className="text-sm text-[var(--fios-text)] font-mono leading-relaxed mt-3 whitespace-pre-wrap">
                      {grade.feedback}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-2xl overflow-hidden border fios-border bg-[var(--fios-surface)] flex-1 flex flex-col min-h-[420px] shadow-[var(--fios-shadow-sm)]">
                <div className="px-3 py-2.5 bg-[var(--fios-surface-2)] border-b fios-border text-[11px] font-mono font-bold uppercase tracking-wide text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {showSolution ? 'Reference Solution' : 'Reference panel'}
                </div>
                {showSolution ? (
                  <>
                    <div className="flex-1 min-h-[280px]">
                      <Editor
                        height="100%"
                        theme={monacoTheme}
                        language={monacoLanguage}
                        value={challenge.solutionCode}
                        options={{ ...editorOptions, readOnly: true }}
                      />
                    </div>
                    {challenge.explanation && (
                      <div className="p-4 bg-[var(--fios-surface)] text-sm text-[var(--fios-text-muted)] leading-relaxed border-t fios-border">
                        <span className="text-amber-400 font-bold uppercase text-[11px] tracking-wide">Why · </span>
                        <FormattedContent text={challenge.explanation} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <Eye className="w-8 h-8 text-[var(--fios-text-muted)] opacity-40" />
                    <p className="text-sm font-mono text-[var(--fios-text-muted)] max-w-xs leading-relaxed">
                      Submit your solution for an AI grade, or reveal the reference solution when you are ready.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSolution(true)}
                      className="mt-1 text-xs font-bold uppercase tracking-wide accent-solid-text hover:underline cursor-pointer"
                    >
                      Show reference solution
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Saved exams */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-[var(--fios-text)] flex items-center gap-2 border-b fios-border pb-3">
          <Code2 className="w-4 h-4 accent-solid-text" /> Saved Code Exams
          <span className="text-xs font-mono text-[var(--fios-text-muted)] ml-auto">{savedExams.length}</span>
        </h3>
        {savedExams.length === 0 ? (
          <p className="text-sm font-mono text-[var(--fios-text-muted)] py-6 text-center border border-dashed fios-border rounded-2xl">
            No saved code exams yet. Generate one above and hit Save exam.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedExams.map((exam) => (
              <motion.div
                key={exam.id}
                whileHover={{ y: -2 }}
                onClick={() => openSaved(exam)}
                className="p-4 bg-[var(--fios-surface)] border fios-border rounded-xl hover:accent-border transition-colors cursor-pointer space-y-3 group shadow-[var(--fios-shadow-sm)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/25">
                    {exam.language}
                  </span>
                  <div className="flex items-center gap-2">
                    {exam.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <button
                      type="button"
                      onClick={(e) => void handleDeleteSaved(e, exam.id)}
                      className="text-[var(--fios-text-muted)] hover:text-rose-400 p-1 cursor-pointer"
                      aria-label="Delete exam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[var(--fios-text)] line-clamp-2 group-hover:accent-solid-text transition-colors">
                  {exam.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--fios-text-muted)]">
                  {EXAM_ICON[exam.exam_type]} {exam.exam_type.replace(/_/g, ' ')}
                  {exam.module_code && (
                    <span className="ml-auto accent-solid-text font-bold">{exam.module_code}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CodeExamView;
