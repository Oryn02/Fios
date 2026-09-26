import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Code2, Sparkles, Play, Save, RotateCcw, CheckCircle2, XCircle,
  Trophy, Bug, Terminal, PencilRuler, Trash2, Folder, Loader2, Eye,
} from 'lucide-react';
import { generateCodeExam, gradeCodeExam, type CodeGradeResult } from '../services/codeApi';
import { getCodeExams, saveCodeExam, deleteCodeExam } from '../lib/codeExamService';
import { getUserModules, type DBModule } from '../lib/moduleService';
import {
  CODE_LANGUAGES, CODE_EXAM_TYPES,
  type CodeLanguage, type CodeExamType, type CodeExam,
} from '../types/db';
import { useTheme } from '../context/ThemeContext';
import { FormattedContent } from './FormattedContent';

const EXAM_ICON: Record<CodeExamType, React.ReactNode> = {
  bug_fix: <Bug className="w-3.5 h-3.5" />,
  output_prediction: <Terminal className="w-3.5 h-3.5" />,
  logic_completion: <PencilRuler className="w-3.5 h-3.5" />,
};

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

export const CodeExamView: React.FC<CodeExamViewProps> = ({ initialExamId }) => {
  const { resolvedTheme } = useTheme();
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
    setChallenge({
      title: exam.title,
      language: exam.language,
      examType: exam.exam_type,
      prompt: exam.prompt,
      starterCode: exam.starter_code || '',
      solutionCode: exam.solution_code || '',
    });
    setUserCode(exam.user_code || exam.starter_code || '');
    setLanguage(exam.language);
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
        if (target) {
          openSaved(target);
        }
      }
    });
  }, [loadSaved, initialExamId, openSaved]);

  const handleGenerate = useCallback(async () => {
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
      const active: ActiveChallenge = {
        title: result.title,
        language: (result.language as CodeLanguage) || language,
        examType: (result.examType as CodeExamType) || examType,
        prompt: result.prompt,
        starterCode: result.starterCode,
        solutionCode: result.solutionCode,
        expectedOutput: result.expectedOutput,
        explanation: result.explanation,
      };
      setChallenge(active);
      setUserCode(result.starterCode || '');
    } catch (err: any) {
      setError(err.message || 'Failed to generate challenge.');
    } finally {
      setGenerating(false);
    }
  }, [language, examType, topic, customPrompt]);

  const handleGrade = useCallback(async () => {
    if (!challenge) return;
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
  }, [challenge, userCode]);

  const handleSave = useCallback(async () => {
    if (!challenge) return;
    try {
      await saveCodeExam({
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
      setSaveMsg('Saved to your Code Exams!');
      setTimeout(() => setSaveMsg(null), 2500);
      loadSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save exam.');
    }
  }, [challenge, userCode, moduleCode, grade, loadSaved]);

  const handleDeleteSaved = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteCodeExam(id);
    loadSaved();
  }, [loadSaved]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-slate-100">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight flex items-center gap-2">
          <Code2 className="w-6 h-6 text-emerald-400" />
          Code Lab · AI Exams
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Generate Gemini-powered coding challenges, solve them in the editor, and grade your solution.
        </p>
      </div>

      {/* Generator controls */}
      <div className="bg-[#0e131f]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              {CODE_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Challenge Type</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value as CodeExamType)}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              {CODE_EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Topic (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. recursion, pointers…"
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
              <Folder className="w-3 h-3 text-cyan-400" /> Module
            </label>
            <select
              value={moduleCode}
              onChange={(e) => setModuleCode(e.target.value)}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="">General</option>
              {modules.map((m) => (
                <option key={m.id} value={m.code}>{m.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Custom challenge prompt (optional)</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe a targeted challenge — e.g. ‘Write a recursive DFS that detects cycles in an adjacency list’…"
            rows={3}
            className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 resize-y"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CODE_EXAM_TYPES.filter((t) => t.value === examType).map((t) => (
            <span key={t.value} className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
              {EXAM_ICON[t.value]} {t.description}
            </span>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating challenge…' : 'Generate Code Challenge'}
        </motion.button>

        {error && (
          <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-xs font-mono rounded-r-lg">
            {error}
          </div>
        )}
      </div>

      {/* Active challenge */}
      <AnimatePresence mode="wait">
        {challenge && (
          <motion.div
            key={challenge.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Prompt + editor */}
            <div className="space-y-3">
              <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    {EXAM_ICON[challenge.examType]} {challenge.examType.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {challenge.language}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">{challenge.title}</h3>
                <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">{challenge.prompt}</p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-800">
                <div className="flex items-center justify-between px-3 py-2 bg-[#07090e] border-b border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">solution.{challenge.language === 'python' ? 'py' : challenge.language === 'c' ? 'c' : 'ts'}</span>
                  <button
                    onClick={() => setUserCode(challenge.starterCode)}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset code
                  </button>
                </div>
                <Editor
                  height="320px"
                  theme={monacoTheme}
                  language={monacoLanguage}
                  value={userCode}
                  onChange={(v) => setUserCode(v ?? '')}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    fontFamily: 'JetBrains Mono, monospace',
                    smoothScrolling: true,
                    automaticLayout: true,
                  }}
                  loading={<div className="p-6 text-xs font-mono text-slate-500">Loading editor…</div>}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGrade}
                  disabled={grading}
                  className="flex-1 py-2.5 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                  {grading ? 'Grading…' : 'Submit & Grade'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" /> Save
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSolution((s) => !s)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" /> {showSolution ? 'Hide' : 'Solution'}
                </motion.button>
              </div>
              {saveMsg && <p className="text-[11px] font-mono text-emerald-400 font-bold">{saveMsg}</p>}
            </div>

            {/* Feedback / solution column */}
            <div className="space-y-3">
              <AnimatePresence>
                {grade && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-2xl p-5 border ${
                      grade.correct
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                        {grade.correct ? (
                          <><Trophy className="w-5 h-5 text-emerald-400" /> <span className="text-emerald-300">Passed</span></>
                        ) : (
                          <><XCircle className="w-5 h-5 text-amber-400" /> <span className="text-amber-300">Keep going</span></>
                        )}
                      </span>
                      <span className="text-2xl font-black font-mono text-white">{grade.score}<span className="text-sm text-slate-500">/100</span></span>
                    </div>
                    <p className="text-xs text-slate-200 font-mono leading-relaxed mt-3 whitespace-pre-wrap">{grade.feedback}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {showSolution && (
                <div className="rounded-2xl overflow-hidden border border-slate-800">
                  <div className="px-3 py-2 bg-[#07090e] border-b border-slate-800 text-[10px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Reference Solution
                  </div>
                  <Editor
                    height="240px"
                    theme={monacoTheme}
                    language={monacoLanguage}
                    value={challenge.solutionCode}
                    options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 }, automaticLayout: true }}
                  />
                  {challenge.explanation && (
                    <div className="p-3 bg-[#0e131f] text-xs text-slate-300 leading-relaxed border-t border-slate-800">
                      <span className="text-amber-400 font-bold uppercase">Why: </span>
                      <FormattedContent text={challenge.explanation} />
                    </div>
                  )}
                </div>
              )}

              {!grade && !showSolution && (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs font-mono text-slate-500">
                  Submit your solution to get an AI grade and feedback, or reveal the reference solution.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved exams */}
      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Code2 className="w-4 h-4 text-emerald-400" /> Saved Code Exams
          <span className="text-xs font-mono text-slate-500 ml-auto">{savedExams.length}</span>
        </h3>
        {savedExams.length === 0 ? (
          <p className="text-xs font-mono text-slate-600 py-4">No saved code exams yet. Generate one above and hit Save.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedExams.map((exam) => (
              <motion.div
                key={exam.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => openSaved(exam)}
                className="p-4 bg-[#0e131f]/90 border border-slate-800 rounded-xl hover:border-emerald-500/40 transition-colors cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {exam.language}
                  </span>
                  <div className="flex items-center gap-2">
                    {exam.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <button
                      onClick={(e) => handleDeleteSaved(e, exam.id)}
                      className="text-slate-600 hover:text-rose-400 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-100 line-clamp-1 group-hover:text-emerald-300 transition-colors">{exam.title}</h4>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                  {EXAM_ICON[exam.exam_type]} {exam.exam_type.replace('_', ' ')}
                  {exam.module_code && <span className="ml-auto text-emerald-400">{exam.module_code}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeExamView;