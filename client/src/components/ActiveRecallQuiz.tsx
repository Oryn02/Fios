import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Trophy, ArrowRight, ShieldCheck } from 'lucide-react';
import { Flashcard } from '../types/api';

interface ActiveRecallQuizProps {
  cards: Flashcard[];
  onFinish?: () => void;
}

export const ActiveRecallQuiz: React.FC<ActiveRecallQuizProps> = ({ cards, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!cards || cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  // Safe fallbacks covering both AI API payload {front, back} and Supabase payload {question, answer}
  const questionText = currentCard?.front || (currentCard as any)?.question || '';
  const answerText = currentCard?.back || (currentCard as any)?.answer || '';

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }

    setShowAnswer(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsCompleted(false);
  };

  if (isCompleted) {
    const total = cards.length;
    const scorePercentage = Math.round((correctCount / total) * 100);

    return (
      <div className="bg-[#0e131f]/90 border border-slate-800 rounded-2xl p-8 text-center space-y-6 animate-fadeIn font-sans">
        <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black italic uppercase text-white">Session Complete</h3>
          <p className="text-slate-400 text-xs font-mono">
            Active recall performance breakdown for this deck
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto bg-[#07090e]/80 p-4 rounded-xl border border-slate-800">
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500">Score</p>
            <p className="text-xl font-black text-emerald-400">{scorePercentage}%</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500">Mastered</p>
            <p className="text-xl font-black text-emerald-300">{correctCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500">Review</p>
            <p className="text-xl font-black text-rose-400">{incorrectCount}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2 font-mono">
          <button
            onClick={resetQuiz}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Restart Session
          </button>
          {onFinish && (
            <button
              onClick={onFinish}
              className="px-5 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black uppercase rounded-xl transition-colors cursor-pointer"
            >
              Back to Deck ↵
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ACTIVE RECALL MODE
        </span>
        <span>
          Card {currentIndex + 1} of {cards.length}
        </span>
      </div>

      <div className="w-full bg-slate-800/60 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-8 min-h-[220px] flex flex-col justify-between space-y-6 relative overflow-hidden">
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            {showAnswer ? 'Answer' : 'Question'}
          </span>
          <p className="text-base font-semibold text-slate-100 leading-relaxed">
            {showAnswer ? answerText : questionText}
          </p>
        </div>

        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            Reveal Answer <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4 animate-fadeIn font-mono">
            <button
              onClick={() => handleAnswer(false)}
              className="py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <XCircle className="w-4 h-4" /> Needs Review
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Got It Right
            </button>
          </div>
        )}
      </div>
    </div>
  );
};