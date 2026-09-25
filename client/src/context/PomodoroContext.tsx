import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useProfile } from './ProfileContext';
import { DEFAULT_POMODORO } from '../types/db';

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroDurations {
  work: number; // minutes
  shortBreak: number;
  longBreak: number;
}

interface PomodoroState {
  mode: PomodoroMode;
  timeLeft: number; // seconds
  isActive: boolean;
  completedSessions: number;
  durations: PomodoroDurations;
}

interface PomodoroControls {
  toggle: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  switchMode: (mode: PomodoroMode) => void;
  skip: () => void;
}

const PomodoroStateContext = createContext<PomodoroState | undefined>(undefined);
const PomodoroControlsContext = createContext<PomodoroControls | undefined>(undefined);

const MODE_LABELS: Record<PomodoroMode, string> = {
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

export function modeLabel(mode: PomodoroMode): string {
  return MODE_LABELS[mode];
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    /* audio is best-effort */
  }
}

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();

  const durations: PomodoroDurations = useMemo(
    () => ({
      work: profile?.pomodoro_work_duration || DEFAULT_POMODORO.work,
      shortBreak: profile?.pomodoro_short_break || DEFAULT_POMODORO.shortBreak,
      longBreak: profile?.pomodoro_long_break || DEFAULT_POMODORO.longBreak,
    }),
    [profile?.pomodoro_work_duration, profile?.pomodoro_short_break, profile?.pomodoro_long_break]
  );

  const [mode, setMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(durations.work * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Refs so control callbacks stay referentially stable across ticks.
  const durationsRef = useRef(durations);
  const modeRef = useRef(mode);
  const isActiveRef = useRef(isActive);
  durationsRef.current = durations;
  modeRef.current = mode;
  isActiveRef.current = isActive;

  const secondsForMode = useCallback((m: PomodoroMode) => {
    const d = durationsRef.current;
    const mins = m === 'work' ? d.work : m === 'shortBreak' ? d.shortBreak : d.longBreak;
    return mins * 60;
  }, []);

  // Keep an idle timer in sync when the user changes their duration preferences.
  useEffect(() => {
    if (!isActiveRef.current) {
      setTimeLeft(secondsForMode(modeRef.current));
    }
  }, [durations, secondsForMode]);

  // Single global 1s tick; only components reading state re-render.
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // Session completion.
  useEffect(() => {
    if (isActive && timeLeft === 0) {
      setIsActive(false);
      if (modeRef.current === 'work') {
        setCompletedSessions((c) => c + 1);
        const existing = Number(localStorage.getItem('fios_logged_focus_mins')) || 0;
        localStorage.setItem(
          'fios_logged_focus_mins',
          (existing + durationsRef.current.work).toString()
        );
      }
      playChime();
    }
  }, [isActive, timeLeft]);

  const switchMode = useCallback(
    (m: PomodoroMode) => {
      setMode(m);
      setIsActive(false);
      setTimeLeft(secondsForMode(m));
    },
    [secondsForMode]
  );

  const controls = useMemo<PomodoroControls>(
    () => ({
      toggle: () => setIsActive((a) => !a),
      start: () => setIsActive(true),
      pause: () => setIsActive(false),
      reset: () => {
        setIsActive(false);
        setTimeLeft(secondsForMode(modeRef.current));
      },
      switchMode,
      skip: () => {
        setIsActive(false);
        setTimeLeft(0);
      },
    }),
    [secondsForMode, switchMode]
  );

  const stateValue = useMemo<PomodoroState>(
    () => ({ mode, timeLeft, isActive, completedSessions, durations }),
    [mode, timeLeft, isActive, completedSessions, durations]
  );

  return (
    <PomodoroControlsContext.Provider value={controls}>
      <PomodoroStateContext.Provider value={stateValue}>
        {children}
      </PomodoroStateContext.Provider>
    </PomodoroControlsContext.Provider>
  );
};

export function usePomodoroState(): PomodoroState {
  const ctx = useContext(PomodoroStateContext);
  if (!ctx) throw new Error('usePomodoroState must be used within a PomodoroProvider');
  return ctx;
}

export function usePomodoroControls(): PomodoroControls {
  const ctx = useContext(PomodoroControlsContext);
  if (!ctx) throw new Error('usePomodoroControls must be used within a PomodoroProvider');
  return ctx;
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
