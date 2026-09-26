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

export const DEFAULT_WIDGET_ORDER: WidgetId[] = ['flightPlan', 'heatmap', 'dueCards', 'calendar'];
export const DEFAULT_MOBILE_NAV = ['overview', 'modules', 'code', 'documents', 'tutor'];

export interface PreferencesState {
  lowPower: boolean;
  zenMode: boolean;
  openDyslexic: boolean;
  widgetOrder: WidgetId[];
  widgetVisibility: Record<WidgetId, boolean>;
  mobileNavSlots: string[];
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
};

const LS_KEY = 'fios_preferences';

function loadLocal(): PreferencesState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS, widgetVisibility: { ...DEFAULTS.widgetVisibility }, widgetOrder: [...DEFAULTS.widgetOrder], mobileNavSlots: [...DEFAULTS.mobileNavSlots] };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      widgetVisibility: { ...DEFAULTS.widgetVisibility, ...(parsed.widgetVisibility || {}) },
      widgetOrder: Array.isArray(parsed.widgetOrder) ? parsed.widgetOrder : [...DEFAULTS.widgetOrder],
      mobileNavSlots: Array.isArray(parsed.mobileNavSlots) ? parsed.mobileNavSlots : [...DEFAULTS.mobileNavSlots],
    };
  } catch {
    return { ...DEFAULTS, widgetVisibility: { ...DEFAULTS.widgetVisibility }, widgetOrder: [...DEFAULTS.widgetOrder], mobileNavSlots: [...DEFAULTS.mobileNavSlots] };
  }
}

interface PreferencesContextValue extends PreferencesState {
  setLowPower: (v: boolean) => void;
  setZenMode: (v: boolean) => void;
  setOpenDyslexic: (v: boolean) => void;
  setWidgetOrder: (order: WidgetId[]) => void;
  setWidgetVisible: (id: WidgetId, visible: boolean) => void;
  setMobileNavSlots: (slots: string[]) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useProfile();
  const [prefs, setPrefs] = useState<PreferencesState>(() => loadLocal());

  // Hydrate from profile.prefs when available
  useEffect(() => {
    const remote = (profile as any)?.prefs;
    if (remote && typeof remote === 'object') {
      setPrefs((prev) => {
        const next = {
          ...prev,
          ...remote,
          widgetVisibility: { ...prev.widgetVisibility, ...(remote.widgetVisibility || {}) },
          widgetOrder: Array.isArray(remote.widgetOrder) ? remote.widgetOrder : prev.widgetOrder,
          mobileNavSlots: Array.isArray(remote.mobileNavSlots) ? remote.mobileNavSlots : prev.mobileNavSlots,
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
    persist({ ...prefs, ...partial });
  }, [prefs, persist]);

  const setLowPower = useCallback((v: boolean) => patch({ lowPower: v }), [patch]);
  const setZenMode = useCallback((v: boolean) => patch({ zenMode: v }), [patch]);
  const setOpenDyslexic = useCallback((v: boolean) => patch({ openDyslexic: v }), [patch]);
  const setWidgetOrder = useCallback((order: WidgetId[]) => patch({ widgetOrder: order }), [patch]);
  const setWidgetVisible = useCallback((id: WidgetId, visible: boolean) => {
    patch({ widgetVisibility: { ...prefs.widgetVisibility, [id]: visible } });
  }, [patch, prefs.widgetVisibility]);
  const setMobileNavSlots = useCallback((slots: string[]) => patch({ mobileNavSlots: slots.slice(0, 5) }), [patch]);
  const resetPreferences = useCallback(() => persist({
    ...DEFAULTS,
    widgetVisibility: { ...DEFAULTS.widgetVisibility },
    widgetOrder: [...DEFAULTS.widgetOrder],
    mobileNavSlots: [...DEFAULTS.mobileNavSlots],
  }), [persist]);

  // low-power + dyslexia attributes on <html>
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
    resetPreferences,
  }), [prefs, setLowPower, setZenMode, setOpenDyslexic, setWidgetOrder, setWidgetVisible, setMobileNavSlots, resetPreferences]);

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
