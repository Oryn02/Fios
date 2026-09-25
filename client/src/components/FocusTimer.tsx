import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flame, Clock } from 'lucide-react';

export const FocusTimer: React.FC = () => {
  const [mode, setMode] = useState<'pomodoro' | 'deep' | 'shortBreak'>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  // Play ambient synthesized chime using Web Audio API on session completion
  const playAudioChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.4); // A5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  useEffect(() => {
    let timer: any = null;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setCompletedSessions((prev) => prev + 1);
      playAudioChime();

      // Log completed minutes to local storage for goal tracking
      const existing = Number(localStorage.getItem('fios_logged_focus_mins')) || 0;
      const sessionMins = mode === 'pomodoro' ? 25 : mode === 'deep' ? 50 : 5;
      localStorage.setItem('fios_logged_focus_mins', (existing + sessionMins).toString());
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, mode]);

  const changeMode = (newMode: 'pomodoro' | 'deep' | 'shortBreak') => {
    setMode(newMode);
    setIsActive(false);
    if (newMode === 'pomodoro') setTimeLeft(25 * 60);
    if (newMode === 'deep') setTimeLeft(50 * 60);
    if (newMode === 'shortBreak') setTimeLeft(5 * 60);
  };

  const resetTimer = () => {
    setIsActive(false);
    changeMode(mode);
  };

  const formatDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const initialTime = mode === 'pomodoro' ? 25 * 60 : mode === 'deep' ? 50 * 60 : 5 * 60;
  const progressPercent = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-w-xl mx-auto font-sans text-slate-100 my-6">
      
      {/* Mode Switcher */}
      <div className="flex items-center justify-center gap-2 bg-[#07090e] border border-slate-800 rounded-xl p-1">
        {[
          { id: 'pomodoro', label: '25m Pomodoro' },
          { id: 'deep', label: '50m Deep Work' },
          { id: 'shortBreak', label: '5m Break' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => changeMode(item.id as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              mode === item.id 
                ? 'bg-emerald-400 text-slate-950 font-black shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Circular HUD Display */}
      <div className="relative flex flex-col items-center justify-center py-6">
        <div className="text-6xl font-black font-mono tracking-tight text-white mb-2">
          {formatDisplay(timeLeft)}
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase">
          <Flame className={`w-4 h-4 ${isActive ? 'animate-bounce text-emerald-400' : 'text-slate-600'}`} />
          {isActive ? 'FOCUS SESSION IN PROGRESS' : 'PAUSED'}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setIsActive(!isActive)}
          className="px-8 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer active:scale-95"
        >
          {isActive ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
          {isActive ? 'PAUSE' : 'START SESSION'}
        </button>

        <button
          onClick={resetTimer}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer active:scale-95"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Footnote */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-800/80">
        <span>COMPLETED SESSIONS: {completedSessions}</span>
        <span className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400" /> LOGGED TO GOAL
        </span>
      </div>

    </div>
  );
};

export default FocusTimer;