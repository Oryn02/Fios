import React, { useState } from 'react';
import { HelpCircle, CheckCircle, XCircle, ArrowRight, RotateCw } from 'lucide-react';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizModeProps {
  questions: Question[];
  onComplete?: (score: number) => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    if (selectedOption === currentQ.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setFinished(true);
      if (onComplete) onComplete(score);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto text-cyan-400">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black italic uppercase text-white">QUIZ RESULTS</h2>
          <p className="text-xs font-mono text-slate-400">
            YOU SCORED <span className="text-emerald-400 font-bold">{score}</span> OUT OF {questions.length} ({Math.round((score / questions.length) * 100)}%)
          </p>
        </div>
        <button
          onClick={restartQuiz}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto font-sans text-slate-100">
      
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-3">
        <span className="text-slate-400">
          QUESTION <span className="text-cyan-400 font-bold">{currentIndex + 1}</span> OF {questions.length}
        </span>
        <span className="text-slate-500">SCORE: {score}</span>
      </div>

      {/* Question Card */}
      <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 className="text-base font-bold text-white leading-relaxed">
          {currentQ.question}
        </h3>

        {/* Options */}
        <div className="space-y-2.5">
          {currentQ.options.map((opt, idx) => {
            let optionStyle = 'bg-[#07090e] border-slate-800 text-slate-300 hover:border-slate-700';

            if (selectedOption === idx) {
              optionStyle = 'bg-cyan-950/30 border-cyan-500/60 text-cyan-200';
            }

            if (isSubmitted) {
              if (idx === currentQ.correctIndex) {
                optionStyle = 'bg-emerald-950/40 border-emerald-400 text-emerald-200';
              } else if (selectedOption === idx && idx !== currentQ.correctIndex) {
                optionStyle = 'bg-rose-950/40 border-rose-500 text-rose-200';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isSubmitted}
                className={`w-full text-left p-3.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
              >
                <span>{opt}</span>
                {isSubmitted && idx === currentQ.correctIndex && (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                {isSubmitted && selectedOption === idx && idx !== currentQ.correctIndex && (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Banner */}
        {isSubmitted && (
          <div className="p-4 bg-[#07090e] border-l-4 border-cyan-400 rounded-r-xl space-y-1 text-xs font-mono animate-in fade-in">
            <span className="text-cyan-400 font-bold uppercase">EXPLANATION:</span>
            <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-30 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all cursor-pointer"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Next Question <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};