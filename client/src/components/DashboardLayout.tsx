import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Layers, Calendar, Settings, BookOpen,
  LogOut, Menu, X, Timer, HelpCircle, Code2, FileText, Target,
  Sun, Moon, GraduationCap, Sparkles, Bot, Monitor, Command, Focus, GripVertical,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IS_DEMO, disableDemo } from '../lib/demo';
import { useProfile, usePreferredName } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences, DEFAULT_NAV_ORDER, DEFAULT_MOBILE_NAV } from '../context/PreferencesContext';
import { FiosLogo } from './FiosLogo';
import { Avatar } from './Avatar';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { HolidayAmbience } from './HolidayAmbience';
import { HolidayMotif } from './HolidayMotif';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string, options?: { openTutor?: boolean }) => void;
}

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'modules', label: 'Modules', icon: BookOpen },
  { id: 'quiz', label: 'Exam Mode', icon: HelpCircle },
  { id: 'code', label: 'Code Lab', icon: Code2 },
  { id: 'documents', label: 'Smart Notes', icon: FileText },
  { id: 'tutor', label: 'AI Tutor', icon: Bot },
  { id: 'atu-calendar', label: 'ATU Calendar', icon: GraduationCap },
  { id: 'grades', label: 'Grades', icon: Target },
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'updates', label: 'Updates v3.1.10', icon: Sparkles },
];

/** True when the event target is a text-entry control (skip ⌘K / Ctrl+K while typing). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest?.('[contenteditable="true"]')) return true;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    // Non-textual inputs should still allow the palette chord.
    if (['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'color', 'range', 'hidden'].includes(type)) {
      return false;
    }
    return true;
  }
  return false;
}

/** ⌘K (Mac) / Ctrl+K (Win/Linux) — never bare K. */
function isQuickNavChord(e: KeyboardEvent): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false;
  if (e.code === 'KeyK') return true;
  const key = typeof e.key === 'string' ? e.key : '';
  return key.length === 1 && key.toLowerCase() === 'k';
}

/** Tabs where Zen may hide chrome (study surfaces). Settings/Overview always keep nav. */
const ZEN_STUDY_TABS = new Set([
  'flashcards', 'quiz', 'code', 'documents', 'tutor', 'timer',
]);

const DashboardLayoutInner: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile } = useProfile();
  const preferredName = usePreferredName();
  const { theme, resolvedTheme, toggleTheme, holidayTheme } = useTheme();
  const { zenMode, setZenMode, mobileNavSlots, navOrder, setNavOrder } = usePreferences();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** Desktop sidebar visibility (hamburger toggles this on md+). */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  // Refs so the global shortcut listener stays mounted (no rebind gap on open/close).
  const paletteOpenRef = useRef(paletteOpen);
  const drawerOpenRef = useRef(drawerOpen);
  const zenModeRef = useRef(zenMode);
  paletteOpenRef.current = paletteOpen;
  drawerOpenRef.current = drawerOpen;
  zenModeRef.current = zenMode;

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);

  const hideChrome = zenMode && ZEN_STUDY_TABS.has(activeTab);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /**
   * Mobile: edge swipe from left (or clear rightward swipe on content) opens the
   * nav drawer. Vertical scroll wins; flashcard / horizontal surfaces are skipped.
   */
  useEffect(() => {
    if (isDesktop || typeof window === 'undefined') return;

    const EDGE_PX = 28;
    const MIN_DX = 64;
    const start = { x: 0, y: 0, tracking: false, fromEdge: false };

    const shouldIgnore = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      if (isTypingTarget(target)) return true;
      return !!target.closest?.(
        [
          '[data-no-drawer-swipe]',
          '.fios-swipe-card',
          '.fios-fab-dock',
          '.fios-agenda-scroll',
          '.fios-month-grid',
          '[data-mobile-drawer-scroll]',
          'canvas',
          '.monaco-editor',
        ].join(',')
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (drawerOpenRef.current) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t || shouldIgnore(e.target)) return;
      start.x = t.clientX;
      start.y = t.clientY;
      start.fromEdge = t.clientX <= EDGE_PX;
      // Content swipe: only when the gesture begins in the left half (less accidental opens).
      start.tracking = start.fromEdge || t.clientX < window.innerWidth * 0.55;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!start.tracking || drawerOpenRef.current) {
        start.tracking = false;
        return;
      }
      start.tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      // Vertical scroll / ambiguous diagonals win — do not open the drawer.
      if (dx < MIN_DX) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.35) return;
      if (!start.fromEdge && dx < 88) return;
      setDrawerOpen(true);
    };

    const onTouchCancel = () => {
      start.tracking = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [isDesktop]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    if (IS_DEMO) { disableDemo(); window.location.reload(); return; }
    await supabase.auth.signOut();
  }, []);

  const navigate = useCallback((tab: string) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  }, [setActiveTab]);

  const exitZen = useCallback(() => setZenMode(false), [setZenMode]);

  /** Header hamburger / X — mobile drawer or desktop sidebar. */
  const toggleNavChrome = useCallback(() => {
    if (isDesktop) {
      setSidebarOpen((v) => !v);
      setDrawerOpen(false);
    } else {
      setDrawerOpen((v) => !v);
    }
  }, [isDesktop]);

  const navToggleOpen = isDesktop ? sidebarOpen : drawerOpen;

  /** Lock background page scroll while the mobile drawer/overlay is open (iOS-safe). */
  useEffect(() => {
    if (!drawerOpen || isDesktop) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as Element | null;
      // Allow scrolling inside the drawer panel itself
      if (target?.closest?.('[data-mobile-drawer-scroll]')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [drawerOpen, isDesktop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — same Quick Nav state as the header chip.
      // Capture phase + preventDefault so Chrome/Firefox find/omnibox bindings don't win.
      if (isQuickNavChord(e)) {
        // Don't steal the chord while typing, unless the palette is already open (toggle/close).
        if (isTypingTarget(e.target) && !paletteOpenRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        // Beat any other capture listeners on this target (e.g. editors).
        e.stopImmediatePropagation();
        togglePalette();
        return;
      }
      if (e.key !== 'Escape') return;
      // Esc stack: drawer → palette (handled there) → exit Zen.
      if (drawerOpenRef.current) {
        e.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (paletteOpenRef.current) return;
      if (zenModeRef.current) {
        e.preventDefault();
        exitZen();
      }
    };
    // document capture is the reliable target for beating browser search chords.
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [exitZen, togglePalette]);

  const [draftNavOrder, setDraftNavOrder] = useState<string[] | null>(null);
  const effectiveNavOrder = draftNavOrder ?? (navOrder?.length ? navOrder : DEFAULT_NAV_ORDER);

  const orderedNav = useMemo(() => {
    const order = effectiveNavOrder;
    const byId = new Map(NAV_ITEMS.map((n) => [n.id, n]));
    const seen = new Set<string>();
    const list: typeof NAV_ITEMS = [];
    for (const id of order) {
      const item = byId.get(id);
      if (item && !seen.has(id)) {
        list.push(item);
        seen.add(id);
      }
    }
    for (const item of NAV_ITEMS) {
      if (!seen.has(item.id)) list.push(item);
    }
    return list;
  }, [effectiveNavOrder]);

  const moveNav = useCallback((id: string, dir: -1 | 1) => {
    const order = [...(navOrder?.length ? navOrder : DEFAULT_NAV_ORDER)];
    const idx = order.indexOf(id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= order.length) return;
    [order[idx], order[next]] = [order[next], order[idx]];
    setNavOrder(order);
  }, [navOrder, setNavOrder]);

  const onDragStart = useCallback((id: string) => {
    setDragId(id);
    setDraftNavOrder([...(navOrder?.length ? navOrder : DEFAULT_NAV_ORDER)]);
  }, [navOrder]);

  const onDragOver = useCallback((e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setDraftNavOrder((prev) => {
      const order = [...(prev ?? (navOrder?.length ? navOrder : DEFAULT_NAV_ORDER))];
      const from = order.indexOf(dragId);
      const to = order.indexOf(overId);
      if (from < 0 || to < 0 || from === to) return prev;
      order.splice(from, 1);
      order.splice(to, 0, dragId);
      return order;
    });
  }, [dragId, navOrder]);

  const onDragEnd = useCallback(() => {
    if (draftNavOrder) setNavOrder(draftNavOrder);
    setDraftNavOrder(null);
    setDragId(null);
  }, [draftNavOrder, setNavOrder]);

  const commandItems: CommandItem[] = useMemo(() => [
    ...orderedNav.map((item) => ({
      id: `nav-${item.id}`,
      label: item.label,
      hint: 'Navigate',
      keywords: [item.id],
      action: () => navigate(item.id),
    })),
    {
      id: 'action-theme',
      label: 'Toggle theme',
      hint: 'Action',
      keywords: ['dark', 'light'],
      action: () => toggleTheme(),
    },
    {
      id: 'action-zen',
      label: zenMode ? 'Exit Zen / Deep Focus' : 'Enter Zen / Deep Focus',
      hint: 'Action',
      keywords: ['zen', 'focus', 'escape'],
      action: () => setZenMode(!zenMode),
    },
    {
      id: 'action-logout',
      label: 'Sign out',
      hint: 'Action',
      keywords: ['logout'],
      action: () => { void handleLogout(); },
    },
  ], [orderedNav, navigate, toggleTheme, handleLogout, zenMode, setZenMode]);

  const displayName = profile?.full_name?.trim() || preferredName;
  const ThemeIcon = theme === 'system' ? Monitor : (resolvedTheme === 'dark' ? Sun : Moon);

  const mobileItems = useMemo(() => {
    const slots = mobileNavSlots?.length ? mobileNavSlots : DEFAULT_MOBILE_NAV;
    return slots
      .map((id) => NAV_ITEMS.find((n) => n.id === id))
      .filter(Boolean) as typeof NAV_ITEMS;
  }, [mobileNavSlots]);

  return (
    <div className="min-h-dvh fios-app-bg flex flex-col font-sans overflow-x-hidden">
      <HolidayAmbience />
      {/* Top HUD Bar — always visible unless Zen is hiding study chrome */}
      {!hideChrome && (
        <header className="h-14 sm:h-16 border-b fios-border bg-[var(--fios-surface)]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 fixed top-0 left-0 right-0 z-[60] safe-top">
          {/* Brand cluster: logo may shrink; version badge never hides / never shrinks away */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 overflow-visible self-center">
            <button
              type="button"
              onClick={toggleNavChrome}
              className={`relative z-[70] inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-md bg-[var(--fios-surface-2)] border transition-colors cursor-pointer self-center ${
                navToggleOpen
                  ? 'accent-border accent-solid-text'
                  : 'fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:accent-border'
              }`}
              aria-label={navToggleOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={navToggleOpen}
              aria-controls={isDesktop ? 'fios-desktop-sidebar' : 'fios-mobile-drawer'}
            >
              {navToggleOpen ? <X className="w-3.5 h-3.5" strokeWidth={2.25} /> : <Menu className="w-3.5 h-3.5" strokeWidth={2.25} />}
            </button>
            <button
              type="button"
              onClick={() => navigate('overview')}
              className="min-w-0 max-w-full overflow-hidden cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fios-accent-solid)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fios-surface)]"
              aria-label="Go to Overview"
              title="Overview"
            >
              {/* Compact logo on narrow phones so the version badge always fits beside it */}
              <span className="sm:hidden">
                <FiosLogo size="md" className="leading-none min-w-0 pointer-events-none" />
              </span>
              <span className="hidden sm:inline">
                <FiosLogo size="lg" className="leading-none min-w-0 pointer-events-none" />
              </span>
            </button>
            <span
              data-fios-version-badge
              className="relative z-[65] inline-flex items-center gap-1 shrink-0 text-[9px] sm:text-xs font-black not-italic accent-solid-text bg-[var(--fios-surface-2)] px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-md border accent-border tracking-wider"
              title="Fios version"
              aria-label="Fios version 3.1.10"
            >
              <HolidayMotif themeFamily={holidayTheme?.themeFamily} size={12} className="hidden sm:inline" />
              v3.1.10
            </span>
            {zenMode && (
              <button
                type="button"
                onClick={exitZen}
                className="touch-target-row flex items-center gap-1.5 px-3 py-2 rounded-md border accent-border accent-solid-text text-[10px] font-black uppercase tracking-wider cursor-pointer bg-[var(--fios-surface-2)] active:opacity-80 shrink-0"
                aria-label="Exit Zen mode"
              >
                <Focus className="w-3.5 h-3.5" /> Exit Zen
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={openPalette}
              title="Command palette (⌘K / Ctrl+K)"
              aria-label="Open command palette (Control or Command K)"
              aria-keyshortcuts="Meta+K Control+K"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] text-[10px] font-mono cursor-pointer"
            >
              <Command className="w-3.5 h-3.5" aria-hidden />
              <span>K</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
              className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] transition-colors cursor-pointer"
            >
              <ThemeIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('settings')}
              className="flex items-center gap-2.5 bg-[var(--fios-surface-2)] pl-1 pr-2.5 py-1 rounded-full border fios-border cursor-pointer"
              aria-label="Open settings"
            >
              <Avatar url={profile?.avatar_url} name={preferredName} size={26} />
              <span className="text-[var(--fios-text)] text-[11px] font-bold max-w-[120px] truncate hidden sm:inline">{displayName}</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign Out"
              aria-label="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-black tracking-wider transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Logout</span>
            </motion.button>
          </div>
        </header>
      )}
      {/* Spacer for fixed header so content isn't under the bar (iOS-safe) */}
      {!hideChrome && <div className="h-14 sm:h-16 shrink-0" aria-hidden />}

      {/* Persistent Zen escape — always reachable when chrome is hidden */}
      {hideChrome && (
        <div className="fixed top-3 right-3 z-[80] flex items-center gap-2 safe-top">
          <button
            type="button"
            onClick={openPalette}
            className="touch-target p-2.5 rounded-xl border fios-border bg-[var(--fios-surface)]/95 text-[var(--fios-text-muted)] shadow-xl cursor-pointer active:opacity-80"
            aria-label="Open navigation (command palette)"
            title="Navigate (⌘K / Ctrl+K)"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={exitZen}
            className="touch-target-row flex items-center gap-1.5 min-h-11 px-3 py-2.5 rounded-xl border accent-border bg-[var(--fios-surface)]/95 accent-solid-text text-[10px] font-black uppercase tracking-wider shadow-xl cursor-pointer active:opacity-80"
            aria-label="Exit Zen mode"
          >
            <Focus className="w-3.5 h-3.5" /> Exit Zen
          </button>
        </div>
      )}

      <div className="flex flex-1 relative">
        <AnimatePresence>
          {drawerOpen && !hideChrome && !isDesktop && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 top-14 sm:top-16 z-40 bg-black/50"
                onClick={() => setDrawerOpen(false)}
                onTouchMove={(e) => e.preventDefault()}
                aria-hidden
              />
              <motion.aside
                id="fios-mobile-drawer"
                data-mobile-drawer-scroll
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed top-14 sm:top-16 left-0 bottom-0 z-50 w-[80vw] max-w-xs bg-[var(--fios-surface)] border-r fios-border p-4 flex flex-col safe-bottom"
                aria-label="Mobile navigation"
              >
                <div className="flex items-center justify-between mb-4">
                  <FiosLogo size="sm" />
                  <button type="button" onClick={() => setDrawerOpen(false)} className="touch-target p-2 cursor-pointer text-[var(--fios-text-muted)] active:bg-[var(--fios-surface-2)] rounded-lg" aria-label="Close menu">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1 overflow-y-auto flex-1 scroll-touch" aria-label="Primary">
                  {orderedNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full touch-target-row flex items-center gap-3 px-4 py-3.5 rounded-lg text-xs font-black italic uppercase tracking-wider cursor-pointer active:opacity-90 ${
                          isActive ? 'accent-bg text-slate-950' : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {!hideChrome && sidebarOpen && (
          <aside id="fios-desktop-sidebar" className="w-60 border-r fios-border bg-[var(--fios-surface)]/40 p-4 hidden md:flex flex-col" aria-label="Sidebar">
            <div className="space-y-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--fios-text-muted)] px-3">
                Navigation
                <span id="nav-reorder-hint" className="sr-only">Drag handles to reorder. Alt+Up or Alt+Down moves the focused item.</span>
              </div>
              <nav className="space-y-1" aria-label="Primary" aria-describedby="nav-reorder-hint">
                {orderedNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => onDragStart(item.id)}
                      onDragOver={(e) => onDragOver(e, item.id)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center gap-1 rounded-lg ${dragId === item.id ? 'opacity-60' : ''}`}
                    >
                      <span
                        className="p-1 cursor-grab text-[var(--fios-text-muted)] shrink-0"
                        title="Drag to reorder"
                        aria-hidden
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                      <motion.button
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => navigate(item.id)}
                        onKeyDown={(e) => {
                          if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); moveNav(item.id, -1); }
                          if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); moveNav(item.id, 1); }
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-black italic uppercase tracking-wider transition-colors cursor-pointer fios-tab ${
                          isActive
                            ? 'bg-[var(--fios-surface-2)] accent-solid-text border-l-2 accent-border shadow-md fios-tab-active'
                            : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'accent-solid-text' : ''}`} />
                        {item.label}
                      </motion.button>
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}

        <main className={`flex-1 min-w-0 p-4 sm:p-8 max-w-7xl mx-auto w-full relative ${hideChrome ? 'pb-24 md:pb-8' : 'pb-24 md:pb-8'}`} id="main-content">
          {!hideChrome && (
            <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[100px] pointer-events-none opacity-40" style={{ backgroundColor: 'color-mix(in srgb, var(--fios-accent-solid) 8%, transparent)' }} />
          )}
          <div className="relative z-10 min-w-0">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav — keep a Settings escape even in Zen study mode */}
      {(!hideChrome || zenMode) && (
        <nav
          className={`fios-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--fios-surface)]/95 backdrop-blur-md border-t fios-border flex items-center justify-around px-1 pt-1 pb-1 safe-bottom overflow-x-auto ${hideChrome ? 'shadow-2xl' : ''}`}
          aria-label="Mobile shortcuts"
        >
          {hideChrome ? (
            <>
              <button
                type="button"
                onClick={() => { setDrawerOpen(true); }}
                className="touch-target flex flex-col items-center gap-0.5 min-w-[4.5rem] px-3 py-2 rounded-lg cursor-pointer text-[var(--fios-text-muted)] active:bg-[var(--fios-surface-2)]"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wide">Menu</span>
              </button>
              <button
                type="button"
                onClick={exitZen}
                className="touch-target flex flex-col items-center gap-0.5 min-w-[4.5rem] px-3 py-2 rounded-lg cursor-pointer accent-solid-text active:opacity-80"
                aria-label="Exit Zen"
              >
                <Focus className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wide">Exit Zen</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('settings')}
                className="touch-target flex flex-col items-center gap-0.5 min-w-[4.5rem] px-3 py-2 rounded-lg cursor-pointer text-[var(--fios-text-muted)] active:bg-[var(--fios-surface-2)]"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wide">Settings</span>
              </button>
            </>
          ) : (
            mobileItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={`touch-target flex flex-col items-center gap-0.5 min-w-[3.5rem] px-2 py-2 rounded-lg cursor-pointer active:bg-[var(--fios-surface-2)] ${isActive ? 'accent-solid-text' : 'text-[var(--fios-text-muted)]'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-bold uppercase tracking-wide">{item.label.split(' ')[0]}</span>
                </button>
              );
            })
          )}
        </nav>
      )}

      {/* When Zen hides chrome on mobile, still allow drawer via Menu above */}
      <AnimatePresence>
        {drawerOpen && hideChrome && !isDesktop && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setDrawerOpen(false)}
              onTouchMove={(e) => e.preventDefault()}
              aria-hidden
            />
            <motion.aside
              id="fios-mobile-drawer-zen"
              data-mobile-drawer-scroll
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-[80vw] max-w-xs bg-[var(--fios-surface)] border-r fios-border p-4 flex flex-col safe-top safe-bottom"
              aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between mb-4">
                <FiosLogo size="sm" />
                <button type="button" onClick={() => setDrawerOpen(false)} className="touch-target p-2 cursor-pointer text-[var(--fios-text-muted)] active:bg-[var(--fios-surface-2)] rounded-lg" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1 overflow-y-auto flex-1" aria-label="Primary">
                {orderedNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full touch-target-row flex items-center gap-3 px-4 py-3.5 rounded-lg text-xs font-black italic uppercase tracking-wider cursor-pointer active:opacity-90 ${
                        isActive ? 'accent-bg text-slate-950' : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onClose={closePalette} items={commandItems} />
    </div>
  );
};

export const DashboardLayout = React.memo(DashboardLayoutInner);
export default DashboardLayout;
