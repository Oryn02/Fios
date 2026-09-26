import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { usePreferences, DEFAULT_NAV_ORDER } from '../context/PreferencesContext';
import { FiosLogo } from './FiosLogo';
import { Avatar } from './Avatar';
import { WeeklyGoalWidget } from './WeeklyGoalWidget';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { toast } from '../lib/toast';

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
  { id: 'updates', label: 'Updates v2.2.1', icon: Sparkles },
];

/** Tabs where Zen/Deep Focus may hide chrome. Global frames (Settings, Overview, …) keep nav. */
const ZEN_STUDY_TABS = new Set([
  'flashcards',
  'quiz',
  'code',
  'documents',
  'tutor',
  'timer',
]);

const DashboardLayoutInner: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile } = useProfile();
  const preferredName = usePreferredName();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const { zenMode, setZenMode, mobileNavSlots, navOrder, setNavOrder } = usePreferences();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const orderedNavItems = useMemo(() => {
    const byId = new Map(NAV_ITEMS.map((item) => [item.id, item]));
    const order = navOrder?.length ? navOrder : DEFAULT_NAV_ORDER;
    const seen = new Set<string>();
    const ordered: typeof NAV_ITEMS = [];
    for (const id of order) {
      const item = byId.get(id);
      if (item && !seen.has(id)) {
        ordered.push(item);
        seen.add(id);
      }
    }
    for (const item of NAV_ITEMS) {
      if (!seen.has(item.id)) ordered.push(item);
    }
    return ordered;
  }, [navOrder]);

  const moveNavItem = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = orderedNavItems.map((i) => i.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setNavOrder(next);
  }, [orderedNavItems, setNavOrder]);

  const moveNavByKeyboard = useCallback((id: string, direction: -1 | 1) => {
    const ids = orderedNavItems.map((i) => i.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [removed] = next.splice(idx, 1);
    next.splice(target, 0, removed);
    setNavOrder(next);
    toast(`Moved ${NAV_ITEMS.find((n) => n.id === id)?.label || 'item'}`, 'info');
  }, [orderedNavItems, setNavOrder]);

  // Only hide chrome on distraction-free study surfaces — never trap Settings/etc.
  const chromeHidden = zenMode && ZEN_STUDY_TABS.has(activeTab);

  const exitZen = useCallback(() => {
    if (!zenMode) return;
    setZenMode(false);
    toast('Zen mode off — navigation restored', 'info');
  }, [zenMode, setZenMode]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    if (IS_DEMO) { disableDemo(); window.location.reload(); return; }
    await supabase.auth.signOut();
  }, []);

  const navigate = useCallback((tab: string) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  }, [setActiveTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      // Escape exits Zen from any view (including Settings if somehow chrome-hidden)
      if (e.key === 'Escape' && zenMode) {
        e.preventDefault();
        exitZen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zenMode, exitZen]);

  const commandItems: CommandItem[] = useMemo(() => [
    ...orderedNavItems.map((item) => ({
      id: `nav-${item.id}`,
      label: item.label,
      hint: 'Navigate',
      keywords: [item.id],
      action: () => navigate(item.id),
    })),
    {
      id: 'action-exit-zen',
      label: zenMode ? 'Exit Zen / Deep Focus' : 'Enter Zen / Deep Focus',
      hint: 'Focus',
      keywords: ['zen', 'focus', 'escape'],
      action: () => {
        if (zenMode) exitZen();
        else {
          setZenMode(true);
          toast('Zen on — chrome hides on study views. Press Esc to exit.', 'info');
        }
      },
    },
    {
      id: 'action-theme',
      label: 'Toggle theme',
      hint: 'Action',
      keywords: ['dark', 'light'],
      action: () => toggleTheme(),
    },
    {
      id: 'action-logout',
      label: 'Sign out',
      hint: 'Action',
      keywords: ['logout'],
      action: () => { void handleLogout(); },
    },
  ], [orderedNavItems, navigate, toggleTheme, handleLogout, zenMode, exitZen, setZenMode]);

  const displayName = profile?.full_name?.trim() || preferredName;
  const ThemeIcon = theme === 'system' ? Monitor : (resolvedTheme === 'dark' ? Sun : Moon);

  const mobileItems = useMemo(() => {
    const slots = mobileNavSlots?.length ? mobileNavSlots : ['overview', 'modules', 'code', 'documents', 'tutor'];
    return slots
      .map((id) => NAV_ITEMS.find((n) => n.id === id))
      .filter(Boolean) as typeof NAV_ITEMS;
  }, [mobileNavSlots]);

  return (
    <div className="min-h-dvh fios-app-bg flex flex-col font-sans overflow-x-hidden">
      {/* Top HUD Bar — always visible outside study Zen surfaces */}
      {!chromeHidden && (
        <header className="h-16 border-b fios-border bg-[var(--fios-surface)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 safe-top">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              className="md:hidden p-1.5 rounded-lg text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] bg-[var(--fios-surface-2)] cursor-pointer"
              aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <FiosLogo size="md" />
            <span className="hidden sm:inline text-xs font-black not-italic accent-solid-text bg-[var(--fios-surface-2)] px-3 py-1 rounded-md border accent-border tracking-wider">v2.2.1</span>
            {zenMode && (
              <span className="hidden sm:inline text-[10px] font-mono font-bold uppercase tracking-wider accent-solid-text bg-[var(--fios-surface-2)] px-2 py-1 rounded-md border accent-border">
                Zen armed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              title="Command palette (Ctrl/Cmd+K)"
              aria-label="Open command palette"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] text-[10px] font-mono cursor-pointer"
            >
              <Command className="w-3.5 h-3.5" />
              <span>K</span>
            </button>

            {zenMode && (
              <button
                type="button"
                onClick={exitZen}
                title="Exit Zen mode (Esc)"
                aria-label="Exit Zen mode"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border accent-border accent-solid-text bg-[var(--fios-surface-2)] text-[10px] font-black uppercase cursor-pointer"
              >
                <Focus className="w-3.5 h-3.5" /> Exit Zen
              </button>
            )}

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

      <div className="flex flex-1 relative">
        {/* Mobile slide-out drawer */}
        <AnimatePresence>
          {drawerOpen && !chromeHidden && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="md:hidden fixed inset-0 z-40 bg-black/50"
                onClick={() => setDrawerOpen(false)}
                aria-hidden
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[80vw] max-w-xs bg-[var(--fios-surface)] border-r fios-border p-4 flex flex-col safe-top safe-bottom"
                aria-label="Mobile navigation"
              >
                <div className="flex items-center justify-between mb-4">
                  <FiosLogo size="sm" />
                  <button type="button" onClick={() => setDrawerOpen(false)} className="p-1.5 cursor-pointer text-[var(--fios-text-muted)]" aria-label="Close menu">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1 overflow-y-auto flex-1" aria-label="Primary">
                  {orderedNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-black italic uppercase tracking-wider cursor-pointer ${
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

        {/* Desktop Sidebar — drag handles reorder (md+ only); order shared with drawer */}
        {!chromeHidden && (
          <aside className="w-60 border-r fios-border bg-[var(--fios-surface)]/40 p-4 hidden md:flex flex-col justify-between" aria-label="Sidebar">
            <div className="space-y-6">
              <div className="px-3 space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--fios-text-muted)]">Navigation</div>
                <p className="text-[9px] font-mono text-[var(--fios-text-muted)] opacity-80">
                  Drag handles to reorder · Alt+↑/↓
                </p>
              </div>
              <nav className="space-y-1" aria-label="Primary" aria-describedby="nav-reorder-hint">
                <span id="nav-reorder-hint" className="sr-only">
                  Drag the grip handle to reorder navigation items. With a nav button focused, press Alt+Arrow Up or Alt+Arrow Down to move.
                </span>
                {orderedNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isDragging = draggingId === item.id;
                  const isDropTarget = dragOverId === item.id && draggingId !== item.id;
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(item.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverId !== item.id) setDragOverId(item.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverId === item.id) setDragOverId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer.getData('text/plain') || draggingId;
                        if (fromId) moveNavItem(fromId, item.id);
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      className={`flex items-stretch gap-0.5 rounded-lg transition-colors ${
                        isDropTarget ? 'ring-1 ring-[var(--fios-accent-solid)] bg-[var(--fios-surface-2)]' : ''
                      } ${isDragging ? 'opacity-50' : ''}`}
                    >
                      <span
                        className="hidden md:flex items-center px-1.5 text-[var(--fios-text-muted)] cursor-grab active:cursor-grabbing touch-none select-none"
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
                          if (!e.altKey) return;
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            moveNavByKeyboard(item.id, -1);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            moveNavByKeyboard(item.id, 1);
                          }
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                        className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-black italic uppercase tracking-wider transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[var(--fios-surface-2)] accent-solid-text border-l-2 accent-border shadow-md'
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

            <WeeklyGoalWidget compact />
          </aside>
        )}

        {/* Main Content Viewport */}
        <main className={`flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full relative ${chromeHidden ? 'pb-8' : 'pb-24 md:pb-8'}`} id="main-content">
          {!chromeHidden && (
            <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[100px] pointer-events-none opacity-40" style={{ backgroundColor: 'color-mix(in srgb, var(--fios-accent-solid) 8%, transparent)' }} />
          )}
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      {/* Hot-swappable mobile bottom nav */}
      {!chromeHidden && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--fios-surface)]/95 backdrop-blur-md border-t fios-border flex items-center justify-around px-2 pt-1.5 pb-1 safe-bottom"
          aria-label="Mobile shortcuts"
        >
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg cursor-pointer ${isActive ? 'accent-solid-text' : 'text-[var(--fios-text-muted)]'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wide">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Persistent escape hatch while study Zen chrome is hidden */}
      <AnimatePresence>
        {chromeHidden && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 safe-bottom"
          >
            <button
              type="button"
              onClick={exitZen}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl accent-bg text-slate-950 text-xs font-black uppercase tracking-wider shadow-xl cursor-pointer"
              aria-label="Exit Zen mode"
              title="Exit Zen mode (Esc)"
            >
              <Focus className="w-4 h-4" /> Exit Zen
              <span className="hidden sm:inline font-mono text-[10px] opacity-70 normal-case">Esc</span>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border fios-border bg-[var(--fios-surface)] text-[var(--fios-text-muted)] text-[10px] font-mono cursor-pointer"
              aria-label="Open command palette"
            >
              <Command className="w-3 h-3" /> Navigate
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} />
    </div>
  );
};

export const DashboardLayout = React.memo(DashboardLayoutInner);
export default DashboardLayout;
