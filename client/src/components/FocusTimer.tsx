import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Flame, Clock, SkipForward } from 'lucide-react';
import {
  usePomodoroState,
  usePomodoroControls,
  formatClock,
  modeLabel,
  type PomodoroMode,
} from '../context/PomodoroContext';

const MODES: PomodoroMode[] = ['work', 'shortBreak', 'longBreak'];

// Isolated readout — re-renders each tick without touching the rest of the tab.
const BigReadout: React.FC = () => {
  const { timeLeft, isActive, mode, durations } = usePomodoroState();
  const total =
    (mode === 'work' ? durations.work : mode === 'shortBreak' ? durations.shortBreak : durations.longBreak) * 60;
  const progress = total > 0 ? ((total - timeLeft) / total) * 100 : 0;

  return (
    <>
      <div className="text-7xl font-black font-mono tracking-tight text-white mb-2">{formatClock(timeLeft)}</div>
      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase">
        <Flame className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-600'}`} />
        {isActive ? 'Focus session in progress' : 'Paused'}
      </div>
      <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[var(--fios-accent-from)] via-[var(--fios-accent-via)] to-[var(--fios-accent-to)] h-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%`, willChange: 'width' }}
        />
      </div>
    </>
  );
};

export const FocusTimer: React.FC = () => {
  const { mode, completedSessions } = usePomodoroState();
  const { toggle, reset, skip, switchMode } = usePomodoroControls();

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-w-xl mx-auto font-sans text-slate-100 my-6">
      <div className="flex items-center justify-center gap-2 bg-[#07090e] border border-slate-800 rounded-xl p-1">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
              mode === m ? 'bg-emerald-400 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {modeLabel(m)}
          </button>
        ))}
      </div>

      <div className="relative flex flex-col items-center justify-center py-6">
        <BigReadout />
      </div>

      <div className="flex items-center justify-center gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggle}
          className="px-8 py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
        >
          <PlayPause />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={skip}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
          title="Skip"
        >
          <SkipForward className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-800/80">
        <span>COMPLETED SESSIONS: {completedSessions}</span>
        <span className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400" /> Synced with floating timer
        </span>
      </div>
    </div>
  );
};

// Small helper that reads only isActive to label the toggle button.
const PlayPause: React.FC = () => {
  const { isActive } = usePomodoroState();
  return (
    <span className="flex items-center gap-2">
      {isActive ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
      {isActive ? 'Pause' : 'Start Session'}
    </span>
  );
};

export default FocusTimer;
