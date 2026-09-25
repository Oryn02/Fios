import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Layers, Calendar, Settings, BookOpen,
  LogOut, Menu, X, Timer, HelpCircle, Code2, FileText, Target,
  Sun, Moon, GraduationCap, Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IS_DEMO, disableDemo } from '../lib/demo';
import { useProfile, usePreferredName } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { FiosLogo } from './FiosLogo';
import { Avatar } from './Avatar';
import { WeeklyGoalWidget } from './WeeklyGoalWidget';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'modules', label: 'Modules', icon: BookOpen },
  { id: 'quiz', label: 'Exam Mode', icon: HelpCircle },
  { id: 'code', label: 'Code Lab', icon: Code2 },
  { id: 'documents', label: 'AI Tutor', icon: FileText },
  { id: 'atu-calendar', label: 'ATU Calendar', icon: GraduationCap },
  { id: 'grades', label: 'Grades', icon: Target },
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'updates', label: 'Updates v2.1', icon: Sparkles },
];

// Subset shown in the mobile bottom navigation bar.
const MOBILE_NAV = ['overview', 'modules', 'code', 'documents', 'atu-calendar'];

const DashboardLayoutInner: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile } = useProfile();
  const preferredName = usePreferredName();
  const { theme, toggleTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    if (IS_DEMO) { disableDemo(); window.location.reload(); return; }
    await supabase.auth.signOut();
  }, []);

  const displayName = profile?.full_name?.trim() || preferredName;

  return (
    <div className="min-h-dvh fios-app-bg flex flex-col font-sans overflow-x-hidden">
      {/* Top HUD Bar */}
      <header className="h-16 border-b fios-border bg-[var(--fios-surface)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-1.5 rounded-lg text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] bg-[var(--fios-surface-2)] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <FiosLogo size="md" />
          <span className="hidden sm:inline text-xs font-black not-italic accent-solid-text bg-[var(--fios-surface-2)] px-3 py-1 rounded-md border accent-border tracking-wider">v2.1</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button onClick={() => setActiveTab('settings')} className="flex items-center gap-2.5 bg-[var(--fios-surface-2)] pl-1 pr-2.5 py-1 rounded-full border fios-border cursor-pointer">
            <Avatar url={profile?.avatar_url} name={preferredName} size={26} />
            <span className="text-[var(--fios-text)] text-[11px] font-bold max-w-[120px] truncate hidden sm:inline">{displayName}</span>
          </button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Sign Out"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-black tracking-wider transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </motion.button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-0 left-0 right-0 bg-[var(--fios-surface)] border-b fios-border p-4 z-40 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-black italic uppercase tracking-wider ${
                    isActive ? 'accent-bg text-slate-950' : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Sidebar Navigation */}
        <aside className="w-60 border-r fios-border bg-[var(--fios-surface)]/40 p-4 hidden md:flex flex-col justify-between">
          <div className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--fios-text-muted)] px-3">Navigation</div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black italic uppercase tracking-wider transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--fios-surface-2)] accent-solid-text border-l-2 accent-border shadow-md'
                        : 'text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'accent-solid-text' : ''}`} />
                    {item.label}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          <WeeklyGoalWidget compact />
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full relative pb-24 md:pb-8">
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[100px] pointer-events-none opacity-40" style={{ backgroundColor: 'color-mix(in srgb, var(--fios-accent-solid) 8%, transparent)' }} />
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--fios-surface)]/95 backdrop-blur-md border-t fios-border flex items-center justify-around px-2 pt-1.5 pb-1 safe-bottom">
        {NAV_ITEMS.filter((n) => MOBILE_NAV.includes(n.id)).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg cursor-pointer ${isActive ? 'accent-solid-text' : 'text-[var(--fios-text-muted)]'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export const DashboardLayout = React.memo(DashboardLayoutInner);
export default DashboardLayout;