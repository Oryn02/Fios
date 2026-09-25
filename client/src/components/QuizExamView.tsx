import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, ArrowRight, Sparkles, Save, Folder, Trash2, Loader2 } from 'lucide-react';
import { generateQuiz } from '../services/quizApi';
import { getQuizzes, saveQuiz, deleteQuiz } from '../lib/mcqService';
import { getUserModules, type DBModule } from '../lib/moduleService';
import type { MCQQuestion, MCQQuiz } from '../types/db';

export const QuizExamView: React.FC = () => {
  const [studyNotes, setStudyNotes] = useState('');
  const [title, setTitle] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [modules, setModules] = useState<DBModule[]>([]);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [savedQuizzes, setSavedQuizzes] = useState<MCQQuiz[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const loadSaved = useCallback(async () => {
    const q = await getQuizzes();
    setSavedQuizzes(q);
  }, []);

  useEffect(() => {
    getUserModules().then(setModules).catch(() => setModules([]));
    loadSaved();
  }, [loadSaved]);

  const resetTaking = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsSubmitted(false);
    setQuizFinished(false);
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyNotes.trim()) return;
    setLoading(true);
    setError(null);
    setQuestions([]);
    resetTaking();
    try {
      const questionList = await generateQuiz(studyNotes);
      setQuestions(questionList);
      if (!title.trim()) setTitle(studyNotes.trim().slice(0, 40));
    } catch (err: any) {
      setError(err.message || 'Error generating quiz questions.');
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
    <div className="space-y-8 max-w-4xl mx-auto font-sans text-slate-100 my-6">
      <div>
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-emerald-400" /> Exam & Quiz Simulator
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">Generate multiple-choice practice exams from your notes and save them per module.</p>
      </div>

      {questions.length === 0 ? (
        <form onSubmit={handleGenerateQuiz} className="bg-[#0e131f]/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <label className="text-xs font-mono font-black uppercase text-slate-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Paste Source Material
          </label>
          <textarea
            value={studyNotes}
            onChange={(e) => setStudyNotes(e.target.value)}
            placeholder="Paste your course notes or lecture content here…"
            className="w-full h-44 p-4 bg-[#07090e] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 font-mono text-xs sm:text-sm"
          />
          <motion.button
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading || !studyNotes.trim()}
            className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating practice exam…</> : <><Sparkles className="w-4 h-4" /> Generate Practice Quiz ↵</>}
          </motion.button>
          {error && <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-xs font-mono font-bold uppercase">{error}</div>}

          {savedQuizzes.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400">Saved Quizzes</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    onClick={() => openSavedQuiz(quiz)}
                    className="p-3 bg-[#07090e] border border-slate-800 rounded-lg hover:border-emerald-500/40 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate group-hover:text-emerald-300">{quiz.title}</p>
                      <p className="text-[10px] font-mono text-slate-500">{quiz.questions.length} questions{quiz.module_code ? ` · ${quiz.module_code}` : ''}</p>
                    </div>
                    <button onClick={(e) => handleDeleteSaved(e, quiz.id)} className="text-slate-600 hover:text-rose-400 p-1 cursor-pointer shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : quizFinished ? (
        <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <span className="text-xs font-mono font-black uppercase text-emerald-400 tracking-widest">Exam Completed</span>
          <h3 className="text-4xl font-black italic uppercase text-white">Your score: {score} / {questions.length}</h3>
          <p className="text-slate-400 text-xs font-mono">({Math.round((score / questions.length) * 100)}% accuracy)</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={resetTaking} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors">
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
            <button onClick={() => setQuestions([])} className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors">
              New Exam
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Save bar */}
          <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quiz title…"
              className="flex-1 w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400"
            />
            <div className="flex items-center gap-1.5 bg-[#07090e] border border-slate-800 rounded-lg px-2.5 py-2 w-full sm:w-auto">
              <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none cursor-pointer w-full">
                <option value="" className="bg-[#07090e]">General</option>
                {modules.map((m) => <option key={m.id} value={m.code} className="bg-[#07090e]">{m.code}</option>)}
              </select>
            </div>
            <button onClick={handleSaveQuiz} className="w-full sm:w-auto px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
          {saveMsg && <p className="text-[11px] font-mono text-emerald-400 font-bold">{saveMsg}</p>}

          <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between font-mono text-xs border-b border-slate-800 pb-3">
              <span className="text-emerald-400 font-bold">Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-slate-500">Score: {score}</span>
            </div>

            <h3 className="text-lg font-bold text-white leading-relaxed">{currentQ.question}</h3>

            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => {
                let btnStyle = 'border-slate-800 bg-[#07090e] hover:border-slate-700 text-slate-200';
                if (isSubmitted) {
                  if (idx === currentQ.correctIndex) btnStyle = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-bold';
                  else if (idx === selectedOption) btnStyle = 'border-rose-500/80 bg-rose-500/10 text-rose-300';
                } else if (selectedOption === idx) {
                  btnStyle = 'border-cyan-400 bg-cyan-950/40 text-cyan-200 font-bold';
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
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
                <span className="font-bold text-cyan-400 uppercase">Explanation:</span>
                <p className="text-slate-300">{currentQ.explanation}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              {!isSubmitted ? (
                <button onClick={handleSubmitAnswer} disabled={selectedOption === null} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-xl disabled:opacity-30 cursor-pointer transition-colors">
                  Submit Answer
                </button>
              ) : (
                <button onClick={handleNextQuestion} className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors">
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
