import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, Settings2, Timer, ChevronDown, Check, X } from 'lucide-react';
import {
  usePomodoroState,
  usePomodoroControls,
  formatClock,
  modeLabel,
  type PomodoroMode,
} from '../context/PomodoroContext';
import { useProfile } from '../context/ProfileContext';

const MODE_ACCENT: Record<PomodoroMode, string> = {
  work: 'from-emerald-400 to-cyan-400',
  shortBreak: 'from-cyan-400 to-sky-400',
  longBreak: 'from-indigo-400 to-purple-400',
};

const MODES: PomodoroMode[] = ['work', 'shortBreak', 'longBreak'];

// Timer readout is split out so only this tiny node re-renders on each tick.
const TimerReadout: React.FC = () => {
  const { timeLeft, mode } = usePomodoroState();
  return (
    <span
      className={`font-mono font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${MODE_ACCENT[mode]}`}
      style={{ willChange: 'contents' }}
    >
      {formatClock(timeLeft)}
    </span>
  );
};

const DurationSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { profile, updateProfile } = useProfile();
  const [work, setWork] = useState(profile?.pomodoro_work_duration ?? 25);
  const [shortBreak, setShortBreak] = useState(profile?.pomodoro_short_break ?? 5);
  const [longBreak, setLongBreak] = useState(profile?.pomodoro_long_break ?? 15);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        pomodoro_work_duration: work,
        pomodoro_short_break: shortBreak,
        pomodoro_long_break: longBreak,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save durations:', err);
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: number, setValue: (n: number) => void) => (
    <label className="flex items-center justify-between gap-3 text-[11px] font-mono font-bold uppercase text-slate-400">
      {label}
      <input
        type="number"
        min={1}
        max={120}
        value={value}
        onChange={(e) => setValue(Math.max(1, Math.min(120, Number(e.target.value))))}
        className="w-16 bg-[#07090e] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 text-center"
      />
    </label>
  );

  return (
    <div className="space-y-3 pt-3 border-t border-slate-800/70">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">
          Session Lengths (min)
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {field('Focus', work, setWork)}
      {field('Short break', shortBreak, setShortBreak)}
      {field('Long break', longBreak, setLongBreak)}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black uppercase text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Preferences'}
      </button>
    </div>
  );
};

export const PomodoroWidget: React.FC = () => {
  const { mode, isActive } = usePomodoroState();
  const { toggle, reset, skip, switchMode } = usePomodoroControls();
  const [expanded, setExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="fixed bottom-4 right-4 z-[60] w-[248px] select-none"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="rounded-2xl border border-slate-800 bg-[#0e131f]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className={`h-[3px] w-full bg-gradient-to-r ${MODE_ACCENT[mode]}`} />

        {/* Header row */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest text-slate-300">
            <Timer className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
            {modeLabel(mode)}
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </span>
          <motion.span animate={{ rotate: expanded ? 0 : -90 }} className="text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-3.5 pb-3.5 space-y-3">
                {/* Mode switcher */}
                <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-slate-800">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`flex-1 py-1 rounded-md text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                        mode === m ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m === 'work' ? 'Focus' : m === 'shortBreak' ? 'Short' : 'Long'}
                    </button>
                  ))}
                </div>

                {/* Clock */}
                <div className="text-center text-4xl py-1">
                  <TimerReadout />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={toggle}
                    className="flex-1 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black uppercase text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isActive ? <Pause className="w-3.5 h-3.5 fill-slate-950" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                    {isActive ? 'Pause' : 'Start'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={reset}
                    title="Reset"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={skip}
                    title="Skip"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSettings((s) => !s)}
                    title="Timer settings"
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      showSettings ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <DurationSettings onClose={() => setShowSettings(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PomodoroWidget;
