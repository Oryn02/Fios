import React, { useState } from 'react';
import { Flashcard } from '../types/api';

interface FlashcardDeckProps {
  cards: Flashcard[];
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards || cards.length === 0) return null;

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto my-6">
      
      {/* High-Contrast FIFA Counter Bar */}
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400 bg-[#0e131f]/60 px-4 py-2.5 rounded-lg border border-slate-800/80">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          CARD <span className="text-white">{currentIndex + 1}</span> / {cards.length}
        </span>
        <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Flashcard Tile */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-72 bg-[#0e131f] rounded-xl p-8 flex flex-col justify-between text-center cursor-pointer border border-slate-800 hover:border-emerald-400/50 shadow-2xl transition-all duration-200 group relative overflow-hidden select-none active:scale-[0.99]"
      >
        {/* Glow corner indicator */}
        <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${isFlipped ? 'from-emerald-400/20' : 'from-cyan-400/20'} to-transparent rounded-tr-xl pointer-events-none`} />

        {/* Card Header Status */}
        <div className="w-full flex justify-between items-center z-10">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border ${
            isFlipped 
              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' 
              : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
          }`}>
            {isFlipped ? 'ANSWER' : 'QUESTION'}
          </span>
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
            FLIP [SPACE]
          </span>
        </div>

        {/* Card Body Text */}
        <div className="my-auto px-2 z-10">
          {isFlipped ? (
            <p className="text-lg sm:text-xl font-bold text-emerald-300 leading-relaxed">
              {currentCard.back}
            </p>
          ) : (
            <p className="text-lg sm:text-xl font-extrabold text-white leading-relaxed">
              {currentCard.front}
            </p>
          )}
        </div>

        {/* Bottom Banner Prompt */}
        <div className="w-full flex justify-center z-10">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
            Click tile to flip card
          </span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handlePrev}
          className="py-3.5 bg-[#0e131f] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-extrabold italic uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer text-center active:scale-[0.98]"
        >
          ← PREVIOUS
        </button>

        <button
          onClick={handleNext}
          className="py-3.5 bg-[#0e131f] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-extrabold italic uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer text-center active:scale-[0.98]"
        >
          NEXT →
        </button>
      </div>

    </div>
  );
};