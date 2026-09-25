import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Calendar, LogOut, Save, Trash2, 
  Sliders, Cpu, Sparkles, Database, Check, RefreshCw 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSavedCalendarUrl, saveCalendarUrl } from '../lib/calendarService';

export const SettingsTab: React.FC = () => {
  // Account & Feed state
  const [email, setEmail] = useState<string>('Loading...');
  const [userId, setUserId] = useState<string>('Loading...');
  const [icalUrl, setIcalUrl] = useState<string>('');
  const [feedStatus, setFeedStatus] = useState<string | null>(null);

  // Preference states (stored in localStorage)
  const [targetHours, setTargetHours] = useState<number>(() => {
    return Number(localStorage.getItem('fios_target_hours')) || 20;
  });
  const [cardCount, setCardCount] = useState<number>(() => {
    return Number(localStorage.getItem('fios_card_count')) || 8;
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem('fios_ai_model') || 'gemini-1.5-flash';
  });
  const [soundEffects, setSoundEffects] = useState<boolean>(() => {
    return localStorage.getItem('fios_sounds') !== 'false';
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || 'N/A');
        setUserId(user.id);
      }
      const savedFeed = await getSavedCalendarUrl();
      if (savedFeed) setIcalUrl(savedFeed);
    }
    loadUserData();
  }, []);

  const handleSaveFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveCalendarUrl(icalUrl);
      setFeedStatus('Feed URL updated successfully!');
      setTimeout(() => setFeedStatus(null), 3000);
    } catch (err: any) {
      setFeedStatus('Failed to update feed URL.');
    }
  };

  const handleRemoveFeed = async () => {
    try {
      await saveCalendarUrl('');
      setIcalUrl('');
      setFeedStatus('Feed unlinked.');
      setTimeout(() => setFeedStatus(null), 3000);
    } catch (err) {
      setFeedStatus('Failed to remove feed.');
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('fios_target_hours', targetHours.toString());
    localStorage.setItem('fios_card_count', cardCount.toString());
    localStorage.setItem('fios_ai_model', aiModel);
    localStorage.setItem('fios_sounds', soundEffects.toString());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleClearCache = () => {
    if (confirm('Clear local timetable cache and temporary assets? Your account data will remain untouched.')) {
      localStorage.removeItem('fios_cached_events');
      alert('Local cache cleared successfully.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans text-slate-100 pb-12">
      
      {/* Header Banner */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-black uppercase tracking-widest">
          <Sliders className="w-3.5 h-3.5" />
          SYSTEM PREFERENCES // PROFILE
        </div>
        <h1 className="text-3xl font-black italic uppercase text-white tracking-tight">Account & Studio Settings</h1>
        <p className="text-xs text-slate-400 font-medium">Configure active feeds, AI deck generation targets, and workspace controls.</p>
      </header>

      {/* 1. USER ACCOUNT DETAILS */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" />
          USER ACCOUNT DETAILS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#07090e] border border-slate-800/80 rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500">AUTHENTICATED EMAIL</span>
            <p className="font-mono text-xs text-slate-200 font-bold">{email}</p>
          </div>
          <div className="bg-[#07090e] border border-slate-800/80 rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500">SUPABASE USER ID</span>
            <p className="font-mono text-xs text-slate-400 truncate font-semibold">{userId}</p>
          </div>
        </div>
      </section>

      {/* 2. ACADEMIC & AI GENERATION PREFERENCES */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            ACADEMIC & AI DECK CONFIGURATION
          </h2>
          {savedSuccess && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
              <Check className="w-3.5 h-3.5" /> SAVED PREFERENCES
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Target Study Hours */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block">
              Weekly Target Study Hours
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={targetHours}
              onChange={(e) => setTargetHours(Number(e.target.value))}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[10px] text-slate-500 leading-tight">Controls the weekly progress ring gauge on your main dashboard.</p>
          </div>

          {/* Default Flashcards Per Generation */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block">
              Default Cards Per Deck
            </label>
            <select
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              <option value={5}>5 Cards (Quick Revision)</option>
              <option value={8}>8 Cards (Standard Deck)</option>
              <option value={12}>12 Cards (Deep Dive)</option>
              <option value={15}>15 Cards (Comprehensive)</option>
            </select>
            <p className="text-[10px] text-slate-500 leading-tight">Target output count when parsing lecture slides into flashcards.</p>
          </div>

          {/* Primary Model */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block">
              AI Generation Engine
            </label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Fast)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Code Analysis)</option>
            </select>
            <p className="text-[10px] text-slate-500 leading-tight">Select preferred backend processing model for generation calls.</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Preferences
          </button>
        </div>
      </section>

      {/* 3. ACTIVE TIMETABLE FEED URL */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          ACTIVE TIMETABLE FEED URL (ICAL)
        </h2>
        <form onSubmit={handleSaveFeed} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="url"
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://timetables.atu.ie/Ical/StudentSet?studentSetID=..."
            className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-all shrink-0 cursor-pointer"
          >
            Update Feed
          </button>
        </form>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-400 font-mono">Need to unlink or reset your timetable sync?</p>
          <button
            type="button"
            onClick={handleRemoveFeed}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove Link
          </button>
        </div>

        {feedStatus && (
          <p className="text-xs font-mono text-cyan-400 font-bold">{feedStatus}</p>
        )}
      </section>

      {/* 4. SYSTEM MAINTENANCE & CACHE */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            LOCAL DATA & CACHE CLEANUP
          </h2>
          <p className="text-xs text-slate-400">Purge temporarily cached calendar schedules and locally stored draft notes.</p>
        </div>
        <button
          type="button"
          onClick={handleClearCache}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          Clear Local Cache
        </button>
      </section>

      {/* 5. SESSION TERMINATION */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            SESSION TERMINATION
          </h2>
          <p className="text-xs text-slate-400">Securely log out of your FIOS session on this device.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black italic uppercase text-xs rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          Log Out of FIOS
        </button>
      </section>

    </div>
  );
};