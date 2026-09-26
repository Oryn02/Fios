import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useProfile } from './ProfileContext';

export type WidgetId = 'flightPlan' | 'heatmap' | 'dueCards' | 'calendar';

/** Shortcuts / chips available in the Smart Quick Widget. */
export type SmartActionId =
  | 'flashcard'
  | 'note'
  | 'pomodoro'
  | 'tutor'
  | 'tasks'
  | 'schedule'
  | 'quiz'
  | 'modules'
  | 'grades'
  | 'flashcards'
  | 'timer'
  | 'calendar'
  | 'zen';

export type SmartMetricId = 'dueCards' | 'tasks' | 'streak' | 'timer' | 'upcoming';

export const DEFAULT_WIDGET_ORDER: WidgetId[] = ['flightPlan', 'heatmap', 'dueCards', 'calendar'];
export const DEFAULT_MOBILE_NAV = ['overview', 'modules', 'code', 'documents', 'tutor'];
export const DEFAULT_NAV_ORDER = [
  'overview', 'flashcards', 'modules', 'quiz', 'code', 'documents', 'tutor',
  'atu-calendar', 'grades', 'timer', 'schedule', 'settings', 'updates',
];

/** Default enabled shortcuts (subset of the full catalog). */
export const DEFAULT_SMART_ACTIONS: SmartActionId[] = ['flashcard', 'note', 'pomodoro', 'tutor'];

/** Full catalog users can enable / reorder in Settings. */
export const ALL_SMART_ACTIONS: SmartActionId[] = [
  'flashcard', 'note', 'pomodoro', 'tutor',
  'tasks', 'schedule', 'quiz', 'modules', 'grades', 'flashcards', 'timer', 'calendar', 'zen',
];

export const DEFAULT_SMART_METRICS: SmartMetricId[] = ['dueCards', 'tasks'];
export const ALL_SMART_METRICS: SmartMetricId[] = ['dueCards', 'tasks', 'streak', 'timer', 'upcoming'];

export const SMART_ACTION_LABELS: Record<SmartActionId, string> = {
  flashcard: 'Quick Add Flashcard',
  note: 'New Quick Note',
  pomodoro: 'Start Pomodoro',
  tutor: 'Ask AI Tutor',
  tasks: 'Open Tasks',
  schedule: 'College Schedule',
  quiz: 'Exam Mode',
  modules: 'Modules',
  grades: 'Grade Predictor',
  flashcards: 'Flashcard Decks',
  timer: 'Focus Timer',
  calendar: 'ATU Calendar',
  zen: 'Zen / Deep Focus',
};

export const SMART_METRIC_LABELS: Record<SmartMetricId, string> = {
  dueCards: 'Due SM-2 cards',
  tasks: 'Open tasks',
  streak: 'Study streak (days)',
  timer: 'Active Pomodoro clock',
  upcoming: 'Upcoming classes',
};

export interface PreferencesState {
  lowPower: boolean;
  zenMode: boolean;
  openDyslexic: boolean;
  widgetOrder: WidgetId[];
  widgetVisibility: Record<WidgetId, boolean>;
  mobileNavSlots: string[];
  /** Desktop sidebar order (and mobile drawer order). */
  navOrder: string[];
  /** Floating Pomodoro widget. */
  showPomodoroWidget: boolean;
  /** Floating Smart Quick Actions FAB. */
  showSmartWidget: boolean;
  /** Which Smart Quick actions appear, in order. */
  smartWidgetActions: SmartActionId[];
  /** Which metric chips appear on the Smart Quick panel / FAB. */
  smartWidgetMetrics: SmartMetricId[];
  /** Compact vs expanded default for Smart Quick metrics strip. */
  smartWidgetCompact: boolean;
  /** Show metrics chip(s) on the Smart Quick FAB. */
  smartWidgetShowMetrics: boolean;
}

/** Match DashboardLayout / Tailwind `md` — below this, floating widgets default off. */
export const MOBILE_WIDGET_MQ = '(max-width: 767px)';

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_WIDGET_MQ).matches;
}

/**
 * Desktop keeps floating Pomodoro + Smart Quick on by default.
 * Mobile defaults both off until the user saves an explicit preference.
 */
export function defaultFloatingWidgetsOn(): boolean {
  return !isMobileViewport();
}

const DEFAULTS: PreferencesState = {
  lowPower: false,
  zenMode: false,
  openDyslexic: false,
  widgetOrder: [...DEFAULT_WIDGET_ORDER],
  widgetVisibility: {
    flightPlan: true,
    heatmap: true,
    dueCards: true,
    calendar: true,
  },
  mobileNavSlots: [...DEFAULT_MOBILE_NAV],
  navOrder: [...DEFAULT_NAV_ORDER],
  showPomodoroWidget: true,
  showSmartWidget: true,
  smartWidgetActions: [...DEFAULT_SMART_ACTIONS],
  smartWidgetMetrics: [...DEFAULT_SMART_METRICS],
  smartWidgetCompact: false,
  smartWidgetShowMetrics: true,
};

const LS_KEY = 'fios_preferences';

function sanitizeActions(raw: unknown): SmartActionId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SMART_ACTIONS];
  const allowed = new Set(ALL_SMART_ACTIONS);
  return raw.filter((id): id is SmartActionId => typeof id === 'string' && allowed.has(id as SmartActionId));
}

function sanitizeMetrics(raw: unknown): SmartMetricId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SMART_METRICS];
  const allowed = new Set(ALL_SMART_METRICS);
  return raw.filter((id): id is SmartMetricId => typeof id === 'string' && allowed.has(id as SmartMetricId));
}

function cloneDefaults(): PreferencesState {
  const floatingOn = defaultFloatingWidgetsOn();
  return {
    ...DEFAULTS,
    widgetVisibility: { ...DEFAULTS.widgetVisibility },
    widgetOrder: [...DEFAULTS.widgetOrder],
    mobileNavSlots: [...DEFAULTS.mobileNavSlots],
    navOrder: [...DEFAULTS.navOrder],
    smartWidgetActions: [...DEFAULTS.smartWidgetActions],
    smartWidgetMetrics: [...DEFAULTS.smartWidgetMetrics],
    showPomodoroWidget: floatingOn,
    showSmartWidget: floatingOn,
  };
}

function loadLocal(): PreferencesState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    const floatingFallback = defaultFloatingWidgetsOn();
    return {
      ...DEFAULTS,
      ...parsed,
      widgetVisibility: { ...DEFAULTS.widgetVisibility, ...(parsed.widgetVisibility || {}) },
      widgetOrder: Array.isArray(parsed.widgetOrder) ? parsed.widgetOrder : [...DEFAULTS.widgetOrder],
      mobileNavSlots: Array.isArray(parsed.mobileNavSlots) ? parsed.mobileNavSlots : [...DEFAULTS.mobileNavSlots],
      navOrder: Array.isArray(parsed.navOrder) ? parsed.navOrder : [...DEFAULTS.navOrder],
      smartWidgetActions: sanitizeActions(parsed.smartWidgetActions),
      smartWidgetMetrics: sanitizeMetrics(parsed.smartWidgetMetrics),
      // Preserve explicit booleans; only viewport-default when the key was never saved
      showPomodoroWidget: typeof parsed.showPomodoroWidget === 'boolean'
        ? parsed.showPomodoroWidget
        : floatingFallback,
      showSmartWidget: typeof parsed.showSmartWidget === 'boolean'
        ? parsed.showSmartWidget
        : floatingFallback,
      smartWidgetCompact: !!parsed.smartWidgetCompact,
      smartWidgetShowMetrics: parsed.smartWidgetShowMetrics !== false,
    };
  } catch {
    return cloneDefaults();
  }
}

interface PreferencesContextValue extends PreferencesState {
  setLowPower: (v: boolean) => void;
  setZenMode: (v: boolean) => void;
  setOpenDyslexic: (v: boolean) => void;
  setWidgetOrder: (order: WidgetId[]) => void;
  setWidgetVisible: (id: WidgetId, visible: boolean) => void;
  setMobileNavSlots: (slots: string[]) => void;
  setNavOrder: (order: string[]) => void;
  setShowPomodoroWidget: (v: boolean) => void;
  setShowSmartWidget: (v: boolean) => void;
  setSmartWidgetActions: (actions: SmartActionId[]) => void;
  setSmartWidgetMetrics: (metrics: SmartMetricId[]) => void;
  setSmartWidgetCompact: (v: boolean) => void;
  setSmartWidgetShowMetrics: (v: boolean) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useProfile();
  const [prefs, setPrefs] = useState<PreferencesState>(() => loadLocal());

  useEffect(() => {
    const remote = (profile as any)?.prefs;
    if (remote && typeof remote === 'object') {
      setPrefs((prev) => {
        const next: PreferencesState = {
          ...prev,
          ...remote,
          widgetVisibility: { ...prev.widgetVisibility, ...(remote.widgetVisibility || {}) },
          widgetOrder: Array.isArray(remote.widgetOrder) ? remote.widgetOrder : prev.widgetOrder,
          mobileNavSlots: Array.isArray(remote.mobileNavSlots) ? remote.mobileNavSlots : prev.mobileNavSlots,
          navOrder: Array.isArray(remote.navOrder) ? remote.navOrder : prev.navOrder,
          smartWidgetActions: Array.isArray(remote.smartWidgetActions)
            ? sanitizeActions(remote.smartWidgetActions)
            : prev.smartWidgetActions,
          smartWidgetMetrics: Array.isArray(remote.smartWidgetMetrics)
            ? sanitizeMetrics(remote.smartWidgetMetrics)
            : prev.smartWidgetMetrics,
          showPomodoroWidget: typeof remote.showPomodoroWidget === 'boolean'
            ? remote.showPomodoroWidget
            : prev.showPomodoroWidget,
          showSmartWidget: typeof remote.showSmartWidget === 'boolean'
            ? remote.showSmartWidget
            : prev.showSmartWidget,
          smartWidgetCompact: typeof remote.smartWidgetCompact === 'boolean'
            ? remote.smartWidgetCompact
            : prev.smartWidgetCompact,
          smartWidgetShowMetrics: typeof remote.smartWidgetShowMetrics === 'boolean'
            ? remote.smartWidgetShowMetrics
            : prev.smartWidgetShowMetrics,
          zenMode: typeof remote.zenMode === 'boolean' ? remote.zenMode : prev.zenMode,
          lowPower: typeof remote.lowPower === 'boolean' ? remote.lowPower : prev.lowPower,
          openDyslexic: typeof remote.openDyslexic === 'boolean' ? remote.openDyslexic : prev.openDyslexic,
        };
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [profile]);

  const persist = useCallback((next: PreferencesState) => {
    setPrefs(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    updateProfile({ prefs: next } as any).catch(() => {
      /* prefs column may not exist yet */
    });
  }, [updateProfile]);

  const patch = useCallback((partial: Partial<PreferencesState>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      updateProfile({ prefs: next } as any).catch(() => {
        /* prefs column may not exist yet */
      });
      return next;
    });
  }, [updateProfile]);

  const setLowPower = useCallback((v: boolean) => patch({ lowPower: v }), [patch]);
  const setZenMode = useCallback((v: boolean) => patch({ zenMode: v }), [patch]);
  const setOpenDyslexic = useCallback((v: boolean) => patch({ openDyslexic: v }), [patch]);
  const setWidgetOrder = useCallback((order: WidgetId[]) => patch({ widgetOrder: order }), [patch]);
  const setWidgetVisible = useCallback((id: WidgetId, visible: boolean) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        widgetVisibility: { ...prev.widgetVisibility, [id]: visible },
      };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      updateProfile({ prefs: next } as any).catch(() => {});
      return next;
    });
  }, [updateProfile]);
  const setMobileNavSlots = useCallback((slots: string[]) => {
    const trimmed = slots.filter(Boolean).slice(0, 5);
    patch({ mobileNavSlots: trimmed.length ? trimmed : [...DEFAULT_MOBILE_NAV] });
  }, [patch]);
  const setNavOrder = useCallback((order: string[]) => patch({ navOrder: order }), [patch]);
  const setShowPomodoroWidget = useCallback((v: boolean) => patch({ showPomodoroWidget: v }), [patch]);
  const setShowSmartWidget = useCallback((v: boolean) => patch({ showSmartWidget: v }), [patch]);
  const setSmartWidgetActions = useCallback((actions: SmartActionId[]) => patch({ smartWidgetActions: actions }), [patch]);
  const setSmartWidgetMetrics = useCallback((metrics: SmartMetricId[]) => patch({ smartWidgetMetrics: metrics }), [patch]);
  const setSmartWidgetCompact = useCallback((v: boolean) => patch({ smartWidgetCompact: v }), [patch]);
  const setSmartWidgetShowMetrics = useCallback((v: boolean) => patch({ smartWidgetShowMetrics: v }), [patch]);
  const resetPreferences = useCallback(() => persist(cloneDefaults()), [persist]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.lowPower) root.setAttribute('data-low-power', 'true');
    else root.removeAttribute('data-low-power');
  }, [prefs.lowPower]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.openDyslexic) {
      root.setAttribute('data-opendyslexic', 'true');
      if (!document.getElementById('fios-opendyslexic')) {
        const link = document.createElement('link');
        link.id = 'fios-opendyslexic';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic.min.css';
        document.head.appendChild(link);
      }
    } else {
      root.removeAttribute('data-opendyslexic');
    }
  }, [prefs.openDyslexic]);

  const value = useMemo<PreferencesContextValue>(() => ({
    ...prefs,
    setLowPower,
    setZenMode,
    setOpenDyslexic,
    setWidgetOrder,
    setWidgetVisible,
    setMobileNavSlots,
    setNavOrder,
    setShowPomodoroWidget,
    setShowSmartWidget,
    setSmartWidgetActions,
    setSmartWidgetMetrics,
    setSmartWidgetCompact,
    setSmartWidgetShowMetrics,
    resetPreferences,
  }), [
    prefs, setLowPower, setZenMode, setOpenDyslexic, setWidgetOrder, setWidgetVisible,
    setMobileNavSlots, setNavOrder, setShowPomodoroWidget, setShowSmartWidget,
    setSmartWidgetActions, setSmartWidgetMetrics, setSmartWidgetCompact, setSmartWidgetShowMetrics, resetPreferences,
  ]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

export default PreferencesProvider;
