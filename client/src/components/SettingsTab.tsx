import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, Calendar, LogOut, Save, Trash2,
  Sliders, Timer, Check, MapPin, IdCard,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IS_DEMO, DEMO_USER } from '../lib/demo';
import { getSavedCalendarUrl, saveCalendarUrl } from '../lib/calendarService';
import { useProfile } from '../context/ProfileContext';

const SettingsTabInner: React.FC = () => {
  const { profile, updateProfile } = useProfile();

  const [email, setEmail] = useState('Loading…');
  const [userId, setUserId] = useState('Loading…');
  const [icalUrl, setIcalUrl] = useState('');
  const [feedStatus, setFeedStatus] = useState<string | null>(null);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [address, setAddress] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Pomodoro form
  const [work, setWork] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [pomodoroSaved, setPomodoroSaved] = useState(false);
  const [savingPomodoro, setSavingPomodoro] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPreferredName(profile.preferred_name || '');
      setAddress(profile.address || '');
      setWork(profile.pomodoro_work_duration);
      setShortBreak(profile.pomodoro_short_break);
      setLongBreak(profile.pomodoro_long_break);
    }
  }, [profile]);

  useEffect(() => {
    async function loadUserData() {
      if (IS_DEMO) {
        setEmail(DEMO_USER.email);
        setUserId(DEMO_USER.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || 'N/A');
          setUserId(user.id);
        }
      }
      const savedFeed = await getSavedCalendarUrl();
      if (savedFeed) setIcalUrl(savedFeed);
    }
    loadUserData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName, preferred_name: preferredName, address });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePomodoro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPomodoro(true);
    try {
      await updateProfile({
        pomodoro_work_duration: work,
        pomodoro_short_break: shortBreak,
        pomodoro_long_break: longBreak,
      });
      setPomodoroSaved(true);
      setTimeout(() => setPomodoroSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save pomodoro settings:', err);
    } finally {
      setSavingPomodoro(false);
    }
  };

  const handleSaveFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveCalendarUrl(icalUrl);
      setFeedStatus('Feed URL updated successfully!');
      setTimeout(() => setFeedStatus(null), 3000);
    } catch {
      setFeedStatus('Failed to update feed URL.');
    }
  };

  const handleRemoveFeed = async () => {
    try {
      await saveCalendarUrl('');
      setIcalUrl('');
      setFeedStatus('Feed unlinked.');
      setTimeout(() => setFeedStatus(null), 3000);
    } catch {
      setFeedStatus('Failed to remove feed.');
    }
  };

  const handleLogout = async () => {
    if (IS_DEMO) { window.location.reload(); return; }
    await supabase.auth.signOut();
  };

  const numberField = (label: string, value: number, setValue: (n: number) => void) => (
    <div className="space-y-2">
      <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block">{label}</label>
      <input
        type="number"
        min={1}
        max={120}
        value={value}
        onChange={(e) => setValue(Math.max(1, Math.min(120, Number(e.target.value))))}
        className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
      />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans text-slate-100 pb-12">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-black uppercase tracking-widest">
          <Sliders className="w-3.5 h-3.5" /> System Preferences · Profile
        </div>
        <h1 className="text-3xl font-black italic uppercase text-white tracking-tight">Account & Studio Settings</h1>
        <p className="text-xs text-slate-400 font-medium">Manage your Fios profile, focus timer defaults, and connected feeds.</p>
      </header>

      {/* 1. PROFILE */}
      <form onSubmit={handleSaveProfile} className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" /> Profile Information
          </h2>
          {profileSaved && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Saved</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1"><IdCard className="w-3 h-3 text-cyan-400" /> Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace"
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400">Preferred Name (used in greetings)</label>
            <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="Ada"
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3 text-cyan-400" /> Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, Country"
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#07090e] border border-slate-800/80 rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Authenticated Email</span>
            <p className="font-mono text-xs text-slate-200 font-bold truncate">{email}</p>
          </div>
          <div className="bg-[#07090e] border border-slate-800/80 rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500">User ID</span>
            <p className="font-mono text-xs text-slate-400 truncate font-semibold">{userId}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={savingProfile}
            className="px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {savingProfile ? 'Saving…' : 'Save Profile'}
          </motion.button>
        </div>
      </form>

      {/* 2. POMODORO DEFAULTS */}
      <form onSubmit={handleSavePomodoro} className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Timer className="w-4 h-4 text-cyan-400" /> Pomodoro Timer Defaults
          </h2>
          {pomodoroSaved && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Saved</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {numberField('Focus Duration (min)', work, setWork)}
          {numberField('Short Break (min)', shortBreak, setShortBreak)}
          {numberField('Long Break (min)', longBreak, setLongBreak)}
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">These durations drive both the Focus Timer tab and the floating timer widget across the app.</p>
        <div className="flex justify-end">
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={savingPomodoro}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {savingPomodoro ? 'Saving…' : 'Save Timer Defaults'}
          </motion.button>
        </div>
      </form>

      {/* 3. TIMETABLE FEED */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" /> Timetable Feed URL (iCal)
        </h2>
        <form onSubmit={handleSaveFeed} className="flex flex-col sm:flex-row items-center gap-3">
          <input type="url" value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://timetables.atu.ie/Ical/StudentSet?studentSetID=…"
            className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400" />
          <button type="submit" className="w-full sm:w-auto px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors shrink-0 cursor-pointer">Update Feed</button>
        </form>
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-400 font-mono">Need to unlink or reset your timetable sync?</p>
          <button type="button" onClick={handleRemoveFeed}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Remove Link
          </button>
        </div>
        {feedStatus && <p className="text-xs font-mono text-cyan-400 font-bold">{feedStatus}</p>}
      </section>

      {/* 4. SESSION */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Session Termination
          </h2>
          <p className="text-xs text-slate-400">Securely log out of your Fios session on this device.</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleLogout}
          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-rose-500/20">
          <LogOut className="w-4 h-4" /> Log Out of Fios
        </motion.button>
      </section>
    </div>
  );
};

export const SettingsTab = React.memo(SettingsTabInner);
export default SettingsTab;
