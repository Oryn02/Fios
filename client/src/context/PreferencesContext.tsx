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
  'overview', 'flashcards', 'modules', 'quiz', 'code', 'documents', 'tutor', 'social',
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
  schedule: 'College Timetable',
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
  /** Floating Brain Dump inbox (shared FAB dock). */
  showBrainDumpInbox: boolean;
  /**
   * True when the *current* viewport has an intentional Settings toggle.
   * Derived from the desktop/mobile explicit flags below.
   */
  floatingWidgetsExplicit: boolean;
  /** User toggled Pomodoro / Smart Quick while on desktop (≥768px). */
  floatingWidgetsExplicitDesktop: boolean;
  /** User toggled Pomodoro / Smart Quick while on mobile (&lt;768px). */
  floatingWidgetsExplicitMobile: boolean;
  /**
   * True when the *current* viewport has an intentional Brain Dump Settings toggle.
   * Separate from Pomodoro/Smart Quick so one toggle never poisons the other.
   */
  brainDumpExplicit: boolean;
  /** User toggled Brain Dump while on desktop (≥768px). */
  brainDumpExplicitDesktop: boolean;
  /** User toggled Brain Dump while on mobile (&lt;768px). */
  brainDumpExplicitMobile: boolean;
  /** Which Smart Quick actions appear, in order. */
  smartWidgetActions: SmartActionId[];
  /** Which metric chips appear on the Smart Quick panel / FAB. */
  smartWidgetMetrics: SmartMetricId[];
  /** Compact vs expanded default for Smart Quick metrics strip. */
  smartWidgetCompact: boolean;
  /** Show metrics chip(s) on the Smart Quick FAB. */
  smartWidgetShowMetrics: boolean;
}

/**
 * Match Tailwind `md` (768px).
 * Use min-width for the desktop-ON check so a missing/failed matchMedia
 * never accidentally treats desktop as mobile (inverted max-width pitfall).
 */
export const DESKTOP_WIDGET_MQ = '(min-width: 768px)';
export const MOBILE_WIDGET_MQ = '(max-width: 767px)';

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia(DESKTOP_WIDGET_MQ).matches;
}

/**
 * Desktop (≥768px) keeps floating Pomodoro + Smart Quick ON by default.
 * Mobile defaults both OFF until the user saves an explicit Settings toggle
 * (`floatingWidgetsExplicit`).
 */
export function defaultFloatingWidgetsOn(): boolean {
  if (typeof window === 'undefined') return true; // desktop-first when no viewport
  return window.matchMedia(DESKTOP_WIDGET_MQ).matches;
}

/**
 * Resolve floating-widget visibility.
 *
 * Root cause (v3.1.0 still broken for some users): a single global
 * `floatingWidgetsExplicit` flag. Mobile OFF (viewport default written into
 * profile, or a Settings tap on phone) synced to desktop and stuck OFF.
 *
 * v3.1.1 scopes explicitness per viewport:
 * - Desktop (≥768px): default ON unless `floatingWidgetsExplicitDesktop`
 * - Mobile: default OFF unless `floatingWidgetsExplicitMobile`
 * - Legacy global `floatingWidgetsExplicit` + both widgets OFF → treat as
 *   mobile-only explicit (desktop re-applies ON). Any ON under legacy
 *   explicit applies to both viewports.
 */
export function resolveFloatingWidgets(raw: {
  showPomodoroWidget?: unknown;
  showSmartWidget?: unknown;
  floatingWidgetsExplicit?: unknown;
  floatingWidgetsExplicitDesktop?: unknown;
  floatingWidgetsExplicitMobile?: unknown;
} | null | undefined): {
  showPomodoroWidget: boolean;
  showSmartWidget: boolean;
  floatingWidgetsExplicit: boolean;
  floatingWidgetsExplicitDesktop: boolean;
  floatingWidgetsExplicitMobile: boolean;
} {
  const desktopViewport = defaultFloatingWidgetsOn();
  let explicitDesktop = raw?.floatingWidgetsExplicitDesktop === true;
  let explicitMobile = raw?.floatingWidgetsExplicitMobile === true;

  // Migrate legacy single-flag prefs (pre-3.1.1).
  if (
    raw?.floatingWidgetsExplicit === true
    && raw?.floatingWidgetsExplicitDesktop !== true
    && raw?.floatingWidgetsExplicitMobile !== true
  ) {
    const pomoOn = raw?.showPomodoroWidget === true;
    const smartOn = raw?.showSmartWidget === true;
    if (!pomoOn && !smartOn) {
      // Sticky mobile OFF — do not poison desktop defaults.
      explicitMobile = true;
      explicitDesktop = false;
    } else {
      explicitDesktop = true;
      explicitMobile = true;
    }
  }

  const explicitHere = desktopViewport ? explicitDesktop : explicitMobile;
  if (explicitHere) {
    return {
      showPomodoroWidget: raw?.showPomodoroWidget === true,
      showSmartWidget: raw?.showSmartWidget === true,
      floatingWidgetsExplicit: true,
      floatingWidgetsExplicitDesktop: explicitDesktop,
      floatingWidgetsExplicitMobile: explicitMobile,
    };
  }

  const on = desktopViewport;
  return {
    showPomodoroWidget: on,
    showSmartWidget: on,
    floatingWidgetsExplicit: false,
    floatingWidgetsExplicitDesktop: explicitDesktop,
    floatingWidgetsExplicitMobile: explicitMobile,
  };
}

/**
 * Brain Dump inbox — same viewport defaults as Pomodoro / Smart Quick
 * (desktop ON, mobile OFF) with independent per-viewport explicit flags
 * so a phone OFF never sticks on desktop via profile sync.
 */
export function resolveBrainDumpInbox(raw: {
  showBrainDumpInbox?: unknown;
  brainDumpExplicit?: unknown;
  brainDumpExplicitDesktop?: unknown;
  brainDumpExplicitMobile?: unknown;
} | null | undefined): {
  showBrainDumpInbox: boolean;
  brainDumpExplicit: boolean;
  brainDumpExplicitDesktop: boolean;
  brainDumpExplicitMobile: boolean;
} {
  const desktopViewport = defaultFloatingWidgetsOn();
  let explicitDesktop = raw?.brainDumpExplicitDesktop === true;
  let explicitMobile = raw?.brainDumpExplicitMobile === true;

  // Legacy single-flag (if any early prefs wrote only brainDumpExplicit).
  if (
    raw?.brainDumpExplicit === true
    && raw?.brainDumpExplicitDesktop !== true
    && raw?.brainDumpExplicitMobile !== true
  ) {
    if (raw?.showBrainDumpInbox === true) {
      explicitDesktop = true;
      explicitMobile = true;
    } else {
      explicitMobile = true;
      explicitDesktop = false;
    }
  }

  const explicitHere = desktopViewport ? explicitDesktop : explicitMobile;
  if (explicitHere) {
    return {
      showBrainDumpInbox: raw?.showBrainDumpInbox === true,
      brainDumpExplicit: true,
      brainDumpExplicitDesktop: explicitDesktop,
      brainDumpExplicitMobile: explicitMobile,
    };
  }

  const on = desktopViewport;
  return {
    showBrainDumpInbox: on,
    brainDumpExplicit: false,
    brainDumpExplicitDesktop: explicitDesktop,
    brainDumpExplicitMobile: explicitMobile,
  };
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
  showBrainDumpInbox: true,
  floatingWidgetsExplicit: false,
  floatingWidgetsExplicitDesktop: false,
  floatingWidgetsExplicitMobile: false,
  brainDumpExplicit: false,
  brainDumpExplicitDesktop: false,
  brainDumpExplicitMobile: false,
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
  const floating = resolveFloatingWidgets(null);
  const brainDump = resolveBrainDumpInbox(null);
  return {
    ...DEFAULTS,
    widgetVisibility: { ...DEFAULTS.widgetVisibility },
    widgetOrder: [...DEFAULTS.widgetOrder],
    mobileNavSlots: [...DEFAULTS.mobileNavSlots],
    navOrder: [...DEFAULTS.navOrder],
    smartWidgetActions: [...DEFAULTS.smartWidgetActions],
    smartWidgetMetrics: [...DEFAULTS.smartWidgetMetrics],
    ...floating,
    ...brainDump,
  };
}

function loadLocal(): PreferencesState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    const floating = resolveFloatingWidgets(parsed);
    const brainDump = resolveBrainDumpInbox(parsed);
    return {
      ...DEFAULTS,
      ...parsed,
      widgetVisibility: { ...DEFAULTS.widgetVisibility, ...(parsed.widgetVisibility || {}) },
      widgetOrder: Array.isArray(parsed.widgetOrder) ? parsed.widgetOrder : [...DEFAULTS.widgetOrder],
      mobileNavSlots: Array.isArray(parsed.mobileNavSlots) ? parsed.mobileNavSlots : [...DEFAULTS.mobileNavSlots],
      navOrder: Array.isArray(parsed.navOrder) ? parsed.navOrder : [...DEFAULTS.navOrder],
      smartWidgetActions: sanitizeActions(parsed.smartWidgetActions),
      smartWidgetMetrics: sanitizeMetrics(parsed.smartWidgetMetrics),
      ...floating,
      ...brainDump,
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
  setShowBrainDumpInbox: (v: boolean) => void;
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
        // Merge remote + local explicit-by-viewport flags, then re-resolve
        // visibility for *this* viewport (never bake the other viewport’s OFF).
        const mergedRaw = {
          showPomodoroWidget: remote.showPomodoroWidget ?? prev.showPomodoroWidget,
          showSmartWidget: remote.showSmartWidget ?? prev.showSmartWidget,
          floatingWidgetsExplicit: remote.floatingWidgetsExplicit ?? prev.floatingWidgetsExplicit,
          floatingWidgetsExplicitDesktop:
            remote.floatingWidgetsExplicitDesktop === true
            || prev.floatingWidgetsExplicitDesktop === true,
          floatingWidgetsExplicitMobile:
            remote.floatingWidgetsExplicitMobile === true
            || prev.floatingWidgetsExplicitMobile === true,
        };
        // If only legacy global explicit exists on one side, keep it for migration.
        if (
          remote.floatingWidgetsExplicit === true
          && remote.floatingWidgetsExplicitDesktop !== true
          && remote.floatingWidgetsExplicitMobile !== true
        ) {
          mergedRaw.floatingWidgetsExplicit = true;
        } else if (
          prev.floatingWidgetsExplicitDesktop !== true
          && prev.floatingWidgetsExplicitMobile !== true
          && prev.floatingWidgetsExplicit === true
          && remote.floatingWidgetsExplicit !== true
        ) {
          mergedRaw.floatingWidgetsExplicit = true;
          mergedRaw.showPomodoroWidget = prev.showPomodoroWidget;
          mergedRaw.showSmartWidget = prev.showSmartWidget;
        }

        const floating = resolveFloatingWidgets(mergedRaw);

        const brainMerged = {
          showBrainDumpInbox: remote.showBrainDumpInbox ?? prev.showBrainDumpInbox,
          brainDumpExplicit: remote.brainDumpExplicit ?? prev.brainDumpExplicit,
          brainDumpExplicitDesktop:
            remote.brainDumpExplicitDesktop === true
            || prev.brainDumpExplicitDesktop === true,
          brainDumpExplicitMobile:
            remote.brainDumpExplicitMobile === true
            || prev.brainDumpExplicitMobile === true,
        };
        if (
          remote.brainDumpExplicit === true
          && remote.brainDumpExplicitDesktop !== true
          && remote.brainDumpExplicitMobile !== true
        ) {
          brainMerged.brainDumpExplicit = true;
        } else if (
          prev.brainDumpExplicitDesktop !== true
          && prev.brainDumpExplicitMobile !== true
          && prev.brainDumpExplicit === true
          && remote.brainDumpExplicit !== true
        ) {
          brainMerged.brainDumpExplicit = true;
          brainMerged.showBrainDumpInbox = prev.showBrainDumpInbox;
        }
        const brainDump = resolveBrainDumpInbox(brainMerged);

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
          ...floating,
          ...brainDump,
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
  const setShowPomodoroWidget = useCallback((v: boolean) => {
    const desktop = defaultFloatingWidgetsOn();
    patch({
      showPomodoroWidget: v,
      floatingWidgetsExplicit: true,
      ...(desktop
        ? { floatingWidgetsExplicitDesktop: true }
        : { floatingWidgetsExplicitMobile: true }),
    });
  }, [patch]);
  const setShowSmartWidget = useCallback((v: boolean) => {
    const desktop = defaultFloatingWidgetsOn();
    patch({
      showSmartWidget: v,
      floatingWidgetsExplicit: true,
      ...(desktop
        ? { floatingWidgetsExplicitDesktop: true }
        : { floatingWidgetsExplicitMobile: true }),
    });
  }, [patch]);
  const setShowBrainDumpInbox = useCallback((v: boolean) => {
    const desktop = defaultFloatingWidgetsOn();
    patch({
      showBrainDumpInbox: v,
      brainDumpExplicit: true,
      ...(desktop
        ? { brainDumpExplicitDesktop: true }
        : { brainDumpExplicitMobile: true }),
    });
  }, [patch]);
  const setSmartWidgetActions = useCallback((actions: SmartActionId[]) => patch({ smartWidgetActions: actions }), [patch]);
  const setSmartWidgetMetrics = useCallback((metrics: SmartMetricId[]) => patch({ smartWidgetMetrics: metrics }), [patch]);
  const setSmartWidgetCompact = useCallback((v: boolean) => patch({ smartWidgetCompact: v }), [patch]);
  const setSmartWidgetShowMetrics = useCallback((v: boolean) => patch({ smartWidgetShowMetrics: v }), [patch]);
  const resetPreferences = useCallback(() => persist(cloneDefaults()), [persist]);

  // If the user never explicitly chose floating widgets, keep them aligned with
  // the current viewport (mobile OFF / desktop ON) across resize / rotate.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(DESKTOP_WIDGET_MQ);
    const syncViewportDefaults = () => {
      setPrefs((prev) => {
        // Re-resolve from stored per-viewport explicit flags (not a blank slate),
        // so desktop can turn ON while mobile explicit OFF stays recorded.
        const floating = resolveFloatingWidgets(prev);
        const brainDump = resolveBrainDumpInbox(prev);
        if (
          prev.showPomodoroWidget === floating.showPomodoroWidget
          && prev.showSmartWidget === floating.showSmartWidget
          && prev.floatingWidgetsExplicit === floating.floatingWidgetsExplicit
          && prev.floatingWidgetsExplicitDesktop === floating.floatingWidgetsExplicitDesktop
          && prev.floatingWidgetsExplicitMobile === floating.floatingWidgetsExplicitMobile
          && prev.showBrainDumpInbox === brainDump.showBrainDumpInbox
          && prev.brainDumpExplicit === brainDump.brainDumpExplicit
          && prev.brainDumpExplicitDesktop === brainDump.brainDumpExplicitDesktop
          && prev.brainDumpExplicitMobile === brainDump.brainDumpExplicitMobile
        ) {
          return prev;
        }
        const next = { ...prev, ...floating, ...brainDump };
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        return next;
      });
    };
    syncViewportDefaults();
    mq.addEventListener('change', syncViewportDefaults);
    return () => mq.removeEventListener('change', syncViewportDefaults);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.lowPower) root.setAttribute('data-low-power', 'true');
    else root.removeAttribute('data-low-power');
  }, [prefs.lowPower]);

  // OpenDyslexic: attribute only — faces are self-hosted in index.css /public/fonts
  // (CDN open-dyslexic.min.css 404'd and never loaded on mobile/PWA).
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.openDyslexic) root.setAttribute('data-opendyslexic', 'true');
    else root.removeAttribute('data-opendyslexic');
    // Drop legacy CDN stylesheet if a prior session injected it.
    document.getElementById('fios-opendyslexic')?.remove();
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
    setShowBrainDumpInbox,
    setSmartWidgetActions,
    setSmartWidgetMetrics,
    setSmartWidgetCompact,
    setSmartWidgetShowMetrics,
    resetPreferences,
  }), [
    prefs, setLowPower, setZenMode, setOpenDyslexic, setWidgetOrder, setWidgetVisible,
    setMobileNavSlots, setNavOrder, setShowPomodoroWidget, setShowSmartWidget, setShowBrainDumpInbox,
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
