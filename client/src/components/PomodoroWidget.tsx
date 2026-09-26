import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, SkipForward, Settings2, Timer, ChevronDown,
  Check, X, Music, Volume2, Minimize2
} from 'lucide-react';
import {
  usePomodoroState, usePomodoroControls, formatClock, modeLabel, type PomodoroMode,
} from '../context/PomodoroContext';
import { useProfile } from '../context/ProfileContext';
import { soundscapeEngine, SOUNDSCAPES, type Soundscape } from '../lib/soundscapes';

const MODES: PomodoroMode[] = ['work', 'shortBreak', 'longBreak'];

// Glowing ring + clock — re-renders on timer ticks.
const RingTimer: React.FC<{ size: number; stroke: number }> = ({ size, stroke }) => {
  const { timeLeft, mode, durations } = usePomodoroState();
  const total = (mode === 'work' ? durations.work : mode === 'shortBreak' ? durations.shortBreak : durations.longBreak) * 60;
  const progress = total > 0 ? (total - timeLeft) / total : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--fios-accent-from)" />
            <stop offset="0.5" stopColor="var(--fios-accent-via)" />
            <stop offset="1" stopColor="var(--fios-accent-to)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fios-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--fios-accent-solid) 60%, transparent))' }}
        />
      </svg>
      <span className="absolute font-mono font-black text-[var(--fios-text)]" style={{ fontSize: size / 5.5 }}>
        {formatClock(timeLeft)}
      </span>
    </div>
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
      await updateProfile({ pomodoro_work_duration: work, pomodoro_short_break: shortBreak, pomodoro_long_break: longBreak });
      onClose();
    } finally { setSaving(false); }
  };

  const field = (label: string, value: number, setValue: (n: number) => void) => (
    <label className="flex items-center justify-between gap-3 text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">
      {label}
      <input type="number" min={1} max={120} value={value}
        onChange={(e) => setValue(Math.max(1, Math.min(120, Number(e.target.value))))}
        className="w-16 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2 py-1 text-xs text-[var(--fios-text)] focus:outline-none focus:accent-border text-center" />
    </label>
  );

  return (
    <div className="space-y-3 pt-3 border-t fios-border">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">Session Lengths (min)</span>
        <button onClick={onClose} className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
      </div>
      {field('Focus', work, setWork)}
      {field('Short break', shortBreak, setShortBreak)}
      {field('Long break', longBreak, setLongBreak)}
      <button onClick={save} disabled={saving} className="w-full py-2 accent-bg text-slate-950 font-black uppercase text-[11px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
        <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Preferences'}
      </button>
    </div>
  );
};

const SoundscapePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [current, setCurrent] = useState<Soundscape>(soundscapeEngine.getCurrent());
  const [volume, setVolume] = useState(soundscapeEngine.getVolume());

  const pick = (s: Soundscape) => { soundscapeEngine.play(s); setCurrent(s); };

  return (
    <div className="space-y-2.5 pt-3 border-t fios-border">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text flex items-center gap-1.5"><Music className="w-3.5 h-3.5" /> Soundscape</span>
        <button onClick={onClose} className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {SOUNDSCAPES.map((s) => (
          <button key={s.key} onClick={() => pick(s.key)}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
              current === s.key ? 'accent-bg text-slate-950 border-transparent' : 'bg-[var(--fios-surface-2)] fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)]'
            }`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Volume2 className="w-3.5 h-3.5 text-[var(--fios-text-muted)]" />
        <input type="range" min={0} max={1} step={0.01} value={volume}
          onChange={(e) => { const v = Number(e.target.value); setVolume(v); soundscapeEngine.setVolume(v); }}
          className="w-full accent-[color:var(--fios-accent-solid)] cursor-pointer" />
      </div>
    </div>
  );
};

export const PomodoroWidget: React.FC = () => {
  const { mode, isActive } = usePomodoroState();
  const { toggle, reset, skip, switchMode } = usePomodoroControls();
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState<'none' | 'settings' | 'sound'>('none');

  return (
    <>
      {/* Click-outside backdrop when open */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="hidden md:block fixed bottom-6 right-20 z-[70] select-none font-sans"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className={`rounded-3xl border fios-border bg-[var(--fios-surface)]/90 backdrop-blur-2xl shadow-2xl accent-glow overflow-hidden transition-all ${expanded ? 'w-[280px]' : 'w-auto'}`}>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Timer className={`w-4 h-4 ${isActive ? 'accent-solid-text' : 'text-[var(--fios-text-muted)]'}`} />
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text)]">
                {modeLabel(mode)}
              </span>
              {isActive && <span className="w-2 h-2 rounded-full accent-bg animate-pulse" />}
            </div>

            {!expanded ? (
              <RingTimer size={30} stroke={3.5} />
            ) : (
              <span className="text-[var(--fios-text-muted)] p-1 hover:text-[var(--fios-text)]">
                <Minimize2 className="w-3.5 h-3.5" />
              </span>
            )}
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
                <div className="px-3.5 pb-3.5 space-y-3 pt-1 border-t fios-border">
                  {/* Mode switcher */}
                  <div className="flex items-center gap-1 bg-[var(--fios-surface-2)] p-1 rounded-lg border fios-border">
                    {MODES.map((m) => (
                      <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className={`flex-1 py-1 rounded-md text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                          mode === m ? 'accent-bg text-slate-950' : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)]'
                        }`}
                      >
                        {m === 'work' ? 'Focus' : m === 'shortBreak' ? 'Short' : 'Long'}
                      </button>
                    ))}
                  </div>

                  {/* Ring timer */}
                  <div className="flex justify-center py-2">
                    <RingTimer size={124} stroke={9} />
                  </div>

                  {/* Control Bar */}
                  <div className="flex items-center justify-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={toggle}
                      className="flex-1 py-2 accent-bg text-slate-950 font-black uppercase text-[11px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {isActive ? <Pause className="w-3.5 h-3.5 fill-slate-950" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                      {isActive ? 'Pause' : 'Start'}
                    </motion.button>
                    <IconBtn onClick={reset} title="Reset"><RotateCcw className="w-3.5 h-3.5" /></IconBtn>
                    <IconBtn onClick={skip} title="Skip"><SkipForward className="w-3.5 h-3.5" /></IconBtn>
                    <IconBtn onClick={() => setPanel(panel === 'sound' ? 'none' : 'sound')} active={panel === 'sound'} title="Soundscapes"><Music className="w-3.5 h-3.5" /></IconBtn>
                    <IconBtn onClick={() => setPanel(panel === 'settings' ? 'none' : 'settings')} active={panel === 'settings'} title="Timer settings"><Settings2 className="w-3.5 h-3.5" /></IconBtn>
                  </div>

                  <AnimatePresence>
                    {panel === 'settings' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <DurationSettings onClose={() => setPanel('none')} />
                      </motion.div>
                    )}
                    {panel === 'sound' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <SoundscapePanel onClose={() => setPanel('none')} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

const IconBtn: React.FC<{ onClick: () => void; title: string; active?: boolean; children: React.ReactNode }> = ({ onClick, title, active, children }) => (
  <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} title={title}
    className={`p-2 rounded-lg transition-colors cursor-pointer ${active ? 'accent-bg text-slate-950' : 'bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)]'}`}>
    {children}
  </motion.button>
);

export default PomodoroWidget;