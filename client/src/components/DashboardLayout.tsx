import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Layers, Calendar, Settings, BookOpen,
  LogOut, Menu, X, Timer, HelpCircle, Code2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/demo';
import { useProfile, usePreferredName } from '../context/ProfileContext';

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
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const DashboardLayoutInner: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile } = useProfile();
  const preferredName = usePreferredName();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    if (IS_DEMO) {
      window.location.reload();
      return;
    }
    await supabase.auth.signOut();
  }, []);

  const displayName = profile?.full_name?.trim() || preferredName;
  const userInitial = (preferredName || 'S').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top HUD Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-[#0e131f]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-400 p-[1.5px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#07090e] rounded-[7px] flex items-center justify-center">
              <span className="font-black italic text-transparent bg-clip-text bg-gradient-to-tr from-emerald-400 to-cyan-400 text-lg tracking-tighter">
                F
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black italic tracking-wide uppercase text-white flex items-center gap-2">
              Fios <span className="text-[10px] font-semibold not-italic text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">v2.0</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs font-black uppercase tracking-wider">
          <div className="hidden sm:flex items-center gap-2 bg-[#07090e] px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">Session Active</span>
          </div>

          <div className="flex items-center gap-2.5 bg-[#07090e] px-2.5 py-1 rounded-md border border-slate-800">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-[10px]">
              {userInitial}
            </div>
            <span className="text-slate-200 text-[11px] max-w-[120px] sm:max-w-none truncate normal-case">
              {displayName}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Sign Out"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-black tracking-wider transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </motion.button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-0 left-0 right-0 bg-[#0e131f] border-b border-slate-800 p-4 z-40 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-black italic uppercase tracking-wider ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-transparent text-emerald-400 border-l-4 border-emerald-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Sidebar Navigation */}
        <aside className="w-60 border-r border-slate-800/80 bg-[#0e131f]/40 p-4 hidden md:flex flex-col justify-between">
          <div className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3">
              Navigation
            </div>

            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-black italic uppercase tracking-wider transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-transparent text-emerald-400 border-l-4 border-emerald-400 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {item.label}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-300">
              <span>Weekly Study Goal</span>
              <span className="text-emerald-400">80%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 w-[80%]" />
            </div>
            <p className="text-[11px] font-medium text-slate-400 pt-1">
              4 of 5 study sessions completed this week.
            </p>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full relative">
          <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

export const DashboardLayout = React.memo(DashboardLayoutInner);
export default DashboardLayout;
