import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, Calendar, LogOut, Save, Trash2,
  Sliders, Timer, Check, MapPin, IdCard, Palette, Sun, Moon,
  KeyRound, ExternalLink, Loader2, Lock, Download, AlertCircle, CheckCircle, HelpCircle, Target, Mail, Copy, CheckCircle2, X, Smartphone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IS_DEMO, DEMO_USER, disableDemo, demoFocusSessions } from '../lib/demo';
import { getSavedCalendarUrl, saveCalendarUrl } from '../lib/calendarService';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { AvatarPicker } from './Avatar';
import { ACCENTS } from '../types/db';
import { validateGeminiKey } from '../services/aiApi';

const AI_STUDIO_URL = 'https://aistudio.google.com/app/apikey';

const SupportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('oryn02@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b fios-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase text-[var(--fios-text)]">Contact Support</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--fios-text-muted)] leading-relaxed">
          Need help, found a bug, or have questions about Fios? Reach out directly via email:
        </p>

        <div className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border px-3 py-2.5 rounded-xl font-mono text-xs accent-solid-text">
          <span>oryn02@gmail.com</span>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-[var(--fios-surface)] border fios-border text-[var(--fios-text)] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <a
            href="mailto:oryn02@gmail.com"
            className="px-4 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            Open Mail App
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl cursor-pointer hover:opacity-80 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
    <div className="absolute inset-0" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 sm:p-8 space-y-6 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b fios-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border accent-solid-text">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-[var(--fios-text)]">Privacy Policy & GDPR Statement</h3>
            <p className="text-[11px] font-mono text-[var(--fios-text-muted)]">Fios Academic Command Center</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-[var(--fios-text-muted)] leading-relaxed font-sans">
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">1. Data Controller & Overview</h4>
          <p>
            Fios respects your privacy and is committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR) and Irish data protection legislation.
          </p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">2. Information We Collect</h4>
          <p>We process limited personal data necessary for authentication and core functionality via Supabase, alongside your encrypted API keys and private study notes.</p>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider accent-solid-text">3. Your Rights</h4>
          <p>You retain the right to access, correct, or request complete erasure of your personal data and account records at any time.</p>
        </section>
      </div>

      <div className="border-t fios-border pt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
        >
          Close Policy
        </button>
      </div>
    </motion.div>
  </div>
);

const SettingsTabInner: React.FC = () => {
  const { profile, updateProfile } = useProfile();
  const { theme, setTheme, accent, setAccent } = useTheme();

  // User & Feed State
  const [email, setEmail] = useState('Loading…');
  const [userId, setUserId] = useState('Loading…');
  const [icalUrl, setIcalUrl] = useState('');
  const [feedStatus, setFeedStatus] = useState<string | null>(null);

  // Modals state
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Weekly Study Goal State
  const [goalHours, setGoalHours] = useState(profile?.weekly_study_goal_hours ?? 10);
  const [goalSaved, setGoalSaved] = useState(false);
  const [weeklyLoggedSeconds, setWeeklyLoggedSeconds] = useState(0);

  // Gemini key management & walkthrough
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid' | 'saved'>('idle');
  const [showKeyGuide, setShowKeyGuide] = useState(false);

  // Account Security
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPreferredName(profile.preferred_name || '');
      setAddress(profile.address || '');
      setWork(profile.pomodoro_work_duration);
      setShortBreak(profile.pomodoro_short_break);
      setLongBreak(profile.pomodoro_long_break);
      if (profile.weekly_study_goal_hours) setGoalHours(profile.weekly_study_goal_hours);
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

  // Fetch cumulative focus time logged since Monday of the current week
  useEffect(() => {
    async function fetchWeeklyStudyTime() {
      if (IS_DEMO) {
        const totalMins = demoFocusSessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
        setWeeklyLoggedSeconds(totalMins * 60);
      } else {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('focus_sessions')
          .select('minutes')
          .gte('created_at', startOfWeek.toISOString());

        if (!error && data) {
          const totalMins = data.reduce((acc, session) => acc + (session.minutes || 0), 0);
          setWeeklyLoggedSeconds(totalMins * 60);
        }
      }
    }

    fetchWeeklyStudyTime();
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

  const handleSaveStudyGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ weekly_study_goal_hours: goalHours });
      setGoalSaved(true);
      setTimeout(() => setGoalSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save study goal:', err);
    }
  };

  const handleAvatarChange = async (dataUrl: string | null) => {
    try {
      await updateProfile({ avatar_url: dataUrl });
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  };

  const handleTestKey = async () => {
    if (!keyInput.trim()) return;
    setKeyStatus('testing');
    const ok = await validateGeminiKey(keyInput.trim());
    setKeyStatus(ok ? 'valid' : 'invalid');
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    await updateProfile({ gemini_api_key: keyInput.trim() });
    setKeyStatus('saved');
    setKeyInput('');
    setShowKeyGuide(false);
    setTimeout(() => setKeyStatus('idle'), 2500);
  };

  const handleRemoveKey = async () => {
    await updateProfile({ gemini_api_key: null });
    setKeyStatus('idle');
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setLoadingEmail(true);
    setSecurityStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setSecurityStatus({ type: 'success', text: 'Email update confirmation sent to your new email address!' });
      setNewEmail('');
    } catch (err: any) {
      setSecurityStatus({ type: 'error', text: err.message || 'Failed to update email.' });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setLoadingPassword(true);
    setSecurityStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (error) throw error;
      setSecurityStatus({ type: 'success', text: 'Password changed successfully!' });
      setNewPassword('');
    } catch (err: any) {
      setSecurityStatus({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleExportData = () => {
    const backupData = { ...localStorage };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fios-study-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
    if (IS_DEMO) { disableDemo(); window.location.reload(); return; }
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
        className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:accent-border"
      />
    </div>
  );

  // Cumulative progress metrics calculation
  const actualHours = (weeklyLoggedSeconds / 3600).toFixed(1);
  const percentage = Math.min(100, Math.round((Number(actualHours) / (goalHours || 1)) * 100));
  const remaining = Math.max(0, goalHours - Number(actualHours)).toFixed(1);

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans text-slate-100 pb-12">
      <header className="space-y-1">
        <div className="flex items-center gap-2 accent-solid-text text-xs font-mono font-black uppercase tracking-widest">
          <Sliders className="w-3.5 h-3.5" /> System Preferences · Profile
        </div>
        <h1 className="text-3xl font-black italic uppercase text-white tracking-tight">Account & Studio Settings</h1>
        <p className="text-xs text-slate-400 font-medium">Manage your Fios profile, focus timer defaults, and connected feeds.</p>
      </header>

      {/* INSTALL APP SECTION */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Smartphone className="w-4 h-4 accent-solid-text" /> Install Fios as an App
          </h2>
          <span className="text-[10px] font-mono accent-solid-text bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">PWA Ready</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pin Fios directly to your phone or desktop home screen for a full-screen, native app experience with zero browser clutter.
        </p>

        {isInstallable && (
          <div className="pt-1">
            <button
              onClick={handleInstallClick}
              className="px-5 py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 fill-slate-950" /> Install Fios App Now
            </button>
          </div>
        )}

        <div className="bg-[#07090e] p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono text-slate-300">
          <p className="font-bold text-white uppercase tracking-wide text-[11px] accent-solid-text">📱 How to add on iOS / iPhone:</p>
          <p className="text-slate-400">1. Open this page in <strong className="text-slate-200">Safari</strong>.</p>
          <p className="text-slate-400">2. Tap the <strong className="text-slate-200">Share</strong> button in the bottom menu bar.</p>
          <p className="text-slate-400">3. Scroll down and select <strong className="text-slate-200">"Add to Home Screen"</strong>.</p>
        </div>
      </section>

      {/* 1. PROFILE */}
      <form onSubmit={handleSaveProfile} className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 accent-solid-text" /> Profile Information
          </h2>
          {profileSaved && (
            <span className="text-xs font-mono accent-solid-text flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Saved</span>
          )}
        </div>

        <AvatarPicker url={profile?.avatar_url} name={profile?.preferred_name || profile?.full_name} onChange={handleAvatarChange} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1"><IdCard className="w-3 h-3 accent-solid-text" /> Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace"
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:accent-border" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400">Preferred Name (used in greetings)</label>
            <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="Ada"
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:accent-border" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3 accent-solid-text" /> Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, Country"
              className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:accent-border" />
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
            className="px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {savingProfile ? 'Saving…' : 'Save Profile'}
          </motion.button>
        </div>
      </form>

      {/* 2. WEEKLY STUDY TARGET */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Target className="w-4 h-4 accent-solid-text" /> Weekly Study Goal Tracker
          </h2>
          {goalSaved && (
            <span className="text-xs font-mono accent-solid-text flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Updated</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-[#07090e] p-4 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Logged Focus Time</span>
            <p className="text-xl font-mono font-black text-white">{actualHours}h <span className="text-xs text-slate-500">/ {goalHours}h</span></p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Target Progress</span>
            <p className="text-xl font-mono font-black accent-solid-text">{percentage}%</p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Hours Remaining</span>
            <p className="text-xs font-mono font-bold text-slate-300">{remaining}h to go this week</p>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full accent-bg transition-all duration-500" style={{ width: `${percentage}%` }} />
        </div>

        <form onSubmit={handleSaveStudyGoal} className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 font-mono">Weekly Target (Hours):</label>
            <input
              type="number"
              min={1}
              max={100}
              value={goalHours}
              onChange={(e) => setGoalHours(Number(e.target.value))}
              className="w-20 px-3 py-1.5 bg-[#07090e] border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:accent-border"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg transition-colors cursor-pointer">
            Save Target
          </button>
        </form>
      </section>

      {/* ACCOUNT SECURITY */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Lock className="w-4 h-4 accent-solid-text" /> Account Security
        </h2>

        {securityStatus && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${securityStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
            {securityStatus.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            {securityStatus.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={handleUpdateEmail} className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Update Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="new.email@university.ie"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-[#07090e] border border-slate-800 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:accent-border"
              />
              <button
                type="submit"
                disabled={loadingEmail}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                {loadingEmail ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>

          <form onSubmit={handleUpdatePassword} className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Change Password</label>
            <div className="flex gap-2">
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-[#07090e] border border-slate-800 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:accent-border"
              />
              <button
                type="submit"
                disabled={loadingPassword}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                {loadingPassword ? 'Saving...' : 'Change'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 3. POMODORO DEFAULTS */}
      <form onSubmit={handleSavePomodoro} className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Timer className="w-4 h-4 accent-solid-text" /> Pomodoro Timer Defaults
          </h2>
          {pomodoroSaved && (
            <span className="text-xs font-mono accent-solid-text flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Saved</span>
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
            className="px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {savingPomodoro ? 'Saving…' : 'Save Timer Defaults'}
          </motion.button>
        </div>
      </form>

      {/* APPEARANCE */}
      <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-xl space-y-5">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)] flex items-center gap-2">
          <Palette className="w-4 h-4 accent-solid-text" /> Appearance
        </h2>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Theme</span>
          <div className="flex items-center gap-2">
            {(['dark', 'light'] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  theme === t ? 'accent-bg text-slate-950 border-transparent' : 'bg-[var(--fios-surface-2)] fios-border text-[var(--fios-text-muted)]'
                }`}>
                {t === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />} {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Accent Gradient</span>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button key={a.key} onClick={() => setAccent(a.key)}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-transform cursor-pointer ${
                  accent === a.key ? 'ring-2 ring-white/60 scale-[1.03]' : 'opacity-80 hover:opacity-100'
                } bg-[var(--fios-surface-2)] fios-border text-[var(--fios-text)]`}>
                <span className="w-4 h-4 rounded-full" style={{ backgroundImage: `linear-gradient(120deg, ${a.from}, ${a.to})` }} />
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--fios-text-muted)]">The public landing page keeps Fios's signature emerald identity regardless of this choice.</p>
        </div>
      </section>

      {/* GEMINI API KEY (BYO KEY & WALKTHROUGH) */}
      <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)] flex items-center gap-2">
            <KeyRound className="w-4 h-4 accent-solid-text" /> Gemini API Key (Bring Your Own Key)
          </h2>
          <button
            onClick={() => setShowKeyGuide(!showKeyGuide)}
            className="text-xs font-mono accent-solid-text hover:underline flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" /> {showKeyGuide ? 'Hide Guide' : 'How to get a key'}
          </button>
        </div>

        {showKeyGuide && (
          <div className="p-4 rounded-xl bg-[#07090e] border border-slate-800 space-y-3 text-xs">
            <p className="font-bold text-slate-200">Interactive 3-Step Setup Guide:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-slate-800 accent-solid-text flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <div>
                  <p>Open Google AI Studio in a new tab:</p>
                  <a href={AI_STUDIO_URL} target="_blank" rel="noreferrer" className="accent-solid-text hover:underline inline-flex items-center gap-1 font-mono mt-0.5">
                    Open Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-slate-800 accent-solid-text flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <p>Sign in with your Google Account and click <strong className="text-white">"Create API Key"</strong>.</p>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-slate-800 accent-solid-text flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <p>Copy string starting with <code className="accent-solid-text bg-slate-900 px-1 py-0.5 rounded font-mono">AIzaSy...</code> and paste it below.</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-[var(--fios-text-muted)]">
          {profile?.gemini_api_key
            ? 'A key is configured. AI features are unlocked. You can replace or remove it below.'
            : 'Add your free Gemini API key to unlock AI features. It is stored on your profile and used only for your requests.'}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <input type="password" value={keyInput} onChange={(e) => { setKeyInput(e.target.value); setKeyStatus('idle'); }}
            placeholder={profile?.gemini_api_key ? '•••••••••• (configured)' : 'AIza…'}
            className="flex-1 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border" />
          <button onClick={handleTestKey} disabled={!keyInput.trim() || keyStatus === 'testing'}
            className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5">
            {keyStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Test
          </button>
          <button onClick={handleSaveKey} disabled={!keyInput.trim()}
            className="px-5 py-2 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer disabled:opacity-40">Save Key</button>
          {profile?.gemini_api_key && (
            <button onClick={handleRemoveKey} className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold uppercase text-xs rounded-lg cursor-pointer flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          {keyStatus === 'valid' && <span className="text-[11px] font-bold accent-solid-text flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Key is valid</span>}
          {keyStatus === 'invalid' && <span className="text-[11px] font-bold text-rose-400">Key could not be validated.</span>}
          {keyStatus === 'saved' && <span className="text-[11px] font-bold accent-solid-text flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
          <a href={AI_STUDIO_URL} target="_blank" rel="noreferrer" className="ml-auto text-[11px] font-mono text-[var(--fios-text-muted)] hover:accent-solid-text flex items-center gap-1">
            Get a free key <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* ABOUT, LEGAL & SUPPORT */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Shield className="w-4 h-4 accent-solid-text" /> About, Legal & Support
        </h2>
        <p className="text-xs text-slate-400">
          Review our data processing practices under GDPR or reach out directly for assistance.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => setShowPrivacy(true)}
            className="px-4 py-2 rounded-lg bg-[#07090e] border border-slate-800 text-xs font-mono accent-solid-text hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" /> Privacy Policy & GDPR
          </button>
          <button
            onClick={() => setShowSupport(true)}
            className="px-4 py-2 rounded-lg bg-[#07090e] border border-slate-800 text-xs font-mono accent-solid-text hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" /> Contact Support (oryn02@gmail.com)
          </button>
        </div>
      </section>

      {/* PRIVACY & DATA RIGHTS */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Shield className="w-4 h-4 accent-solid-text" /> Privacy & Data Security
        </h2>

        <div className="text-xs text-slate-400 space-y-2 leading-relaxed bg-[#07090e]/60 p-4 rounded-xl border border-slate-800/80">
          <p>• <strong className="text-slate-200">Local API Key Storage:</strong> Your personal Gemini API key is encrypted and saved directly in your browser session/profile.</p>
          <p>• <strong className="text-slate-200">Row Level Security:</strong> All study decks, quizzes, and timetable entries are isolated strictly to your authenticated user ID.</p>
          <p>• <strong className="text-slate-200">No Model Training:</strong> Uploaded lecture notes and PDFs are processed in-memory solely for generate-on-demand flashcards.</p>
        </div>

        <div className="pt-1 flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 accent-solid-text" /> Export My Data (JSON)
          </button>

          <button
            onClick={() => alert('To clear local data, clear your browser local storage or reset account in Supabase.')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors border border-rose-500/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Local Storage & Account Data
          </button>
        </div>
      </section>

      {/* 4. TIMETABLE FEED */}
      <section className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 accent-solid-text" /> Timetable Feed URL (iCal)
        </h2>
        <form onSubmit={handleSaveFeed} className="flex flex-col sm:flex-row items-center gap-3">
          <input type="url" value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://timetables.atu.ie/Ical/StudentSet?studentSetID=…"
            className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:accent-border" />
          <button type="submit" className="w-full sm:w-auto px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors shrink-0 cursor-pointer">Update Feed</button>
        </form>
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-400 font-mono">Need to unlink or reset your timetable sync?</p>
          <button type="button" onClick={handleRemoveFeed}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Remove Link
          </button>
        </div>
        {feedStatus && <p className="text-xs font-mono accent-solid-text font-bold">{feedStatus}</p>}
      </section>

      {/* 5. SESSION */}
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

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
    </div>
  );
};

export const SettingsTab = React.memo(SettingsTabInner);
export default SettingsTab;