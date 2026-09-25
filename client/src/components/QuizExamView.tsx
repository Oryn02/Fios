import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import { generateQuiz } from '../services/quizApi';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QuizExamView: React.FC = () => {
  const [studyNotes, setStudyNotes] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyNotes.trim()) return;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setQuizFinished(false);
    setCurrentIndex(0);
    setScore(0);

    try {
      const questionList = await generateQuiz(studyNotes);
      setQuestions(questionList);
    } catch (err: any) {
      setError(err.message || 'Error generating quiz questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);

    if (selectedOption === questions[currentIndex].correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setIsSubmitted(false);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans text-slate-100 my-6">
      <div>
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-emerald-400" />
          EXAM & QUIZ SIMULATOR
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Generate multiple-choice practice exams directly from your course notes
        </p>
      </div>

      {questions.length === 0 ? (
        <form 
          onSubmit={handleGenerateQuiz}
          className="bg-[#0e131f]/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <label className="text-xs font-mono font-black uppercase text-slate-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Paste Source Material
          </label>

          <textarea
            value={studyNotes}
            onChange={(e) => setStudyNotes(e.target.value)}
            placeholder="Paste your course notes or lecture content here to generate a practice exam..."
            className="w-full h-44 p-4 bg-[#07090e] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 font-mono text-xs sm:text-sm"
          />

          <button
            type="submit"
            disabled={loading || !studyNotes.trim()}
            className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                GENERATING PRACTICE EXAM...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Practice Quiz ↵
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 text-rose-300 text-xs font-mono font-bold uppercase">
              {error}
            </div>
          )}
        </form>
      ) : quizFinished ? (
        <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="space-y-2">
            <span className="text-xs font-mono font-black uppercase text-emerald-400 tracking-widest">
              EXAM COMPLETED
            </span>
            <h3 className="text-4xl font-black italic uppercase text-white">
              YOUR SCORE: {score} / {questions.length}
            </h3>
            <p className="text-slate-400 text-xs font-mono">
              ({Math.round((score / questions.length) * 100)}% Accuracy)
            </p>
          </div>

          <button
            onClick={() => setQuestions([])}
            className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Start New Exam
          </button>
        </div>
      ) : (
        <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between font-mono text-xs border-b border-slate-800 pb-3">
            <span className="text-emerald-400 font-bold">
              QUESTION {currentIndex + 1} OF {questions.length}
            </span>
            <span className="text-slate-500">SCORE: {score}</span>
          </div>

          <h3 className="text-lg font-bold text-white leading-relaxed">
            {currentQ.question}
          </h3>

          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              let btnStyle = 'border-slate-800 bg-[#07090e] hover:border-slate-700 text-slate-200';

              if (isSubmitted) {
                if (idx === currentQ.correctIndex) {
                  btnStyle = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-bold';
                } else if (idx === selectedOption) {
                  btnStyle = 'border-rose-500/80 bg-rose-500/10 text-rose-300';
                }
              } else if (selectedOption === idx) {
                btnStyle = 'border-cyan-400 bg-cyan-950/40 text-cyan-200 font-bold';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full p-4 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isSubmitted && idx === currentQ.correctIndex && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {isSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {isSubmitted && (
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
              <span className="font-bold text-cyan-400 uppercase">EXPLANATION:</span>
              <p className="text-slate-300">{currentQ.explanation}</p>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-800">
            {!isSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-xl disabled:opacity-30 cursor-pointer transition-all"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                Next Question <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizExamView;