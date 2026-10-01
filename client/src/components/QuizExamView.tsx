import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, ArrowRight, Sparkles, Save, Folder, Trash2, Loader2, FileText, Radio } from 'lucide-react';
import { generateQuiz } from '../services/quizApi';
import { getQuizzes, saveQuiz, deleteQuiz, updateQuizTitle } from '../lib/mcqService';
import { getUserModules, type DBModule, moduleDisplayName, resolveModuleLabel } from '../lib/moduleService';
import type { MCQQuestion, MCQQuiz } from '../types/db';
import { FileUpload } from './FileUpload';
import { InlineEditableTitle } from './InlineEditableTitle';
import { useAiAuth } from '../context/AiAuthContext';
import { toast } from '../lib/toast';
import { GeminiLatencyHint } from './GeminiLatencyHint';
import { friendlyGeminiError } from '../lib/geminiUx';
import { MultiplayerLobby } from './quiz/MultiplayerLobby';

interface QuizExamViewProps {
  initialQuizId?: string | null;
}

export const QuizExamView: React.FC<QuizExamViewProps> = ({ initialQuizId }) => {
  const { requireAiAuth } = useAiAuth();
  const [studyNotes, setStudyNotes] = useState('');
  const [title, setTitle] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [modules, setModules] = useState<DBModule[]>([]);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [questionCount, setQuestionCount] = useState<5 | 10 | 20 | 40>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [savedQuizzes, setSavedQuizzes] = useState<MCQQuiz[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showLive, setShowLive] = useState(false);

  const loadSaved = useCallback(async () => {
    const q = await getQuizzes();
    setSavedQuizzes(q);
    return q;
  }, []);

  useEffect(() => {
    getUserModules().then(setModules).catch(() => setModules([]));
    loadSaved().then((quizzesList) => {
      if (initialQuizId && quizzesList && quizzesList.length > 0) {
        const target = quizzesList.find((q) => q.id === initialQuizId);
        if (target) {
          openSavedQuiz(target);
        }
      }
    });
  }, [loadSaved, initialQuizId]);

  const resetTaking = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsSubmitted(false);
    setQuizFinished(false);
  };

  const handleTextExtracted = (extractedText: string) => {
    setStudyNotes((prev) => (prev.trim() ? `${prev}\n\n${extractedText}` : extractedText));
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyNotes.trim()) return;
    if (!requireAiAuth()) return;
    setLoading(true);
    setError(null);
    setQuestions([]);
    resetTaking();
    try {
      const questionList = await generateQuiz(studyNotes, questionCount);
      setQuestions(questionList);
      if (!title.trim()) setTitle(studyNotes.trim().slice(0, 40));
    } catch (err: any) {
      setError(friendlyGeminiError(err.message || 'Error generating quiz questions.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    try {
      await saveQuiz(title || 'Untitled Quiz', questions, moduleCode || null);
      setSaveMsg('Quiz saved!');
      setTimeout(() => setSaveMsg(null), 2500);
      loadSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz.');
    }
  };

  const openSavedQuiz = (quiz: MCQQuiz) => {
    setQuestions(quiz.questions);
    setTitle(quiz.title);
    setModuleCode(quiz.module_code || '');
    resetTaking();
  };

  const handleDeleteSaved = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteQuiz(id);
    loadSaved();
  };

  const handleSelectOption = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    if (selectedOption === questions[currentIndex].correctIndex) setScore((p) => p + 1);
  };

  const handleNextQuestion = () => {
    setIsSubmitted(false);
    setSelectedOption(null);
    if (currentIndex < questions.length - 1) setCurrentIndex((p) => p + 1);
    else setQuizFinished(true);
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans text-foreground my-6">
      <div>
        <h2 className="text-2xl font-black italic text-foreground uppercase tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 accent-solid-text" /> Exam & Quiz Simulator
        </h2>
        <p className="text-xs font-mono text-muted-foreground mt-1">Generate multiple-choice practice exams from your notes and save them per module.</p>
      </div>

      {questions.length === 0 ? (
        <form onSubmit={handleGenerateQuiz} className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-none">
          {/* File Upload Zone */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-black uppercase text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 accent-solid-text" /> Upload Lecture Slides or PDF
            </label>
            <FileUpload onTextExtracted={handleTextExtracted} />
          </div>

          {/* Text Area Input */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-black uppercase text-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 accent-bg rounded-full" /> Source Material Content
            </label>
            <textarea
              value={studyNotes}
              onChange={(e) => setStudyNotes(e.target.value)}
              placeholder="Parsed PDF content or pasted course notes will appear here…"
            className="w-full h-44 p-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:accent-border font-mono text-base sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-black uppercase text-foreground">
              Number of questions
            </label>
            <div className="flex flex-wrap gap-2">
              {([5, 10, 20, 40] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`touch-target-row px-3 py-1.5 min-h-11 rounded-lg text-[10px] font-mono font-black uppercase border cursor-pointer transition-colors touch-manipulation ${
                    questionCount === n
                      ? 'accent-bg text-slate-950 border-transparent'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="fios-sticky-action">
            <motion.button
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || !studyNotes.trim()}
              className="fios-sticky-cta w-full py-3.5 min-h-11 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 touch-manipulation"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating practice exam…</> : <><Sparkles className="w-4 h-4" /> Generate Practice Quiz ↵</>}
            </motion.button>
          </div>
          {error && (
            <div className="space-y-2">
              <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-xs font-mono font-bold uppercase">{error}</div>
              <GeminiLatencyHint error={error} />
            </div>
          )}
          <GeminiLatencyHint busy={loading} />

          {savedQuizzes.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-muted-foreground">Saved Quizzes</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    onClick={() => openSavedQuiz(quiz)}
                    className="p-3 bg-background border border-border rounded-lg hover:accent-border cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableTitle
                        value={quiz.title}
                        onSave={async (next) => {
                          await updateQuizTitle(quiz.id, next);
                          setSavedQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, title: next } : q)));
                          toast('Quiz renamed', 'success');
                        }}
                        className="text-xs font-bold text-foreground truncate group-hover:accent-solid-text"
                        placeholder="Untitled Quiz"
                      />
                      <p className="text-[10px] font-mono text-muted-foreground">{quiz.questions.length} questions{quiz.module_code ? ` · ${resolveModuleLabel(modules, quiz.module_code)}` : ''}</p>
                    </div>
                    <button onClick={(e) => handleDeleteSaved(e, quiz.id)} className="text-muted-foreground hover:text-rose-400 p-1 cursor-pointer shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : quizFinished ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm dark:shadow-none">
          <span className="text-xs font-mono font-black uppercase accent-solid-text tracking-widest">Exam Completed</span>
          <h3 className="text-4xl font-black italic uppercase text-foreground">Your score: {score} / {questions.length}</h3>
          <p className="text-muted-foreground text-xs font-mono">({Math.round((score / questions.length) * 100)}% accuracy)</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={resetTaking} className="px-6 py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors">
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
            <button
              type="button"
              onClick={() => setShowLive(true)}
              className="px-6 py-3 bg-secondary hover:bg-muted text-foreground font-black italic uppercase text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors border border-border"
            >
              <Radio className="w-4 h-4" /> Host live quiz
            </button>
            <button onClick={() => setQuestions([])} className="px-6 py-3 bg-secondary hover:bg-muted text-foreground font-black italic uppercase text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors border border-border">
              New Exam
            </button>
          </div>
          {showLive && (
            <MultiplayerLobby
              seedQuestions={questions}
              seedTitle={title || 'Live quiz'}
              onClose={() => setShowLive(false)}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Save bar */}
          <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2 shadow-sm dark:shadow-none">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quiz title…"
              className="flex-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:accent-border"
            />
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-2 w-full sm:w-auto">
              <Folder className="w-3.5 h-3.5 accent-solid-text shrink-0" />
              <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none cursor-pointer w-full">
                <option value="" className="bg-background">General</option>
                {modules.map((m) => <option key={m.id} value={m.code} className="bg-background">{moduleDisplayName(m)}</option>)}
              </select>
            </div>
            <button onClick={handleSaveQuiz} className="w-full sm:w-auto px-4 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button
              type="button"
              onClick={() => setShowLive(true)}
              className="w-full sm:w-auto px-4 py-2 border border-border text-foreground font-black italic uppercase text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Radio className="w-3.5 h-3.5" /> Live
            </button>
          </div>
          {showLive && (
            <MultiplayerLobby
              seedQuestions={questions}
              seedTitle={title || 'Live quiz'}
              onClose={() => setShowLive(false)}
            />
          )}
          {saveMsg && <p className="text-[11px] font-mono accent-solid-text font-bold">{saveMsg}</p>}

          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between font-mono text-xs border-b border-border pb-3">
              <span className="accent-solid-text font-bold">Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-muted-foreground">Score: {score}</span>
            </div>

            <h3 className="text-lg font-bold text-foreground leading-relaxed">{currentQ.question}</h3>

            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => {
                let btnStyle = 'border-border bg-background hover:border-border text-foreground';
                if (isSubmitted) {
                  if (idx === currentQ.correctIndex) btnStyle = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-bold';
                  else if (idx === selectedOption) btnStyle = 'border-rose-500/80 bg-rose-500/10 text-rose-300';
                } else if (selectedOption === idx) {
                  btnStyle = 'accent-border bg-card accent-solid-text font-bold';
                }
                return (
                  <button key={idx} onClick={() => handleSelectOption(idx)} className={`w-full p-4 rounded-xl border text-left text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${btnStyle}`}>
                    <span>{opt}</span>
                    {isSubmitted && idx === currentQ.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {isSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {isSubmitted && (
              <div className="p-4 bg-card border border-border rounded-xl space-y-1 font-mono text-xs shadow-sm dark:shadow-none">
                <span className="font-bold accent-solid-text uppercase">Explanation:</span>
                <p className="text-foreground">{currentQ.explanation}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              {!isSubmitted ? (
                <button onClick={handleSubmitAnswer} disabled={selectedOption === null} className="px-6 py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl disabled:opacity-30 cursor-pointer transition-colors">
                  Submit Answer
                </button>
              ) : (
                <button onClick={handleNextQuestion} className="px-6 py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors">
                  Next Question <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizExamView;