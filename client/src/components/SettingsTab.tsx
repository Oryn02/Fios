import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, Calendar, LogOut, Save, Trash2,
  Sliders, Timer, Check, MapPin, IdCard, Palette, Sun, Moon,
  KeyRound, ExternalLink, Loader2, Lock, Download, AlertCircle, CheckCircle, HelpCircle, Target, Mail, Smartphone,
  Monitor, BatteryLow, Type, Focus, GitBranch, Cookie, FileText, ShieldCheck,
  GripVertical, LayoutGrid, ChevronUp, ChevronDown, Zap, Bell, Brain
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IS_DEMO, DEMO_USER, disableDemo } from '../lib/demo';
import { getSavedCalendarUrl, saveCalendarUrl } from '../lib/calendarService';
import { getWeeklyFocusMinutes } from '../lib/focusService';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import {
  usePreferences,
  DEFAULT_MOBILE_NAV,
  DEFAULT_NAV_ORDER,
  DEFAULT_SMART_ACTIONS,
  DEFAULT_SMART_METRICS,
  ALL_SMART_ACTIONS,
  ALL_SMART_METRICS,
  SMART_ACTION_LABELS,
  SMART_METRIC_LABELS,
  type SmartActionId,
  type SmartMetricId,
} from '../context/PreferencesContext';
import { AvatarPicker } from './Avatar';
import { ACCENTS, LOCKED_ACCENTS, type AccentKey, type ThemeMode } from '../types/db';
import { validateGeminiKey } from '../services/aiApi';
import { TermsModal } from './TermsModal';
import { PrivacyModal } from './PrivacyModal';
import { CookiePolicyModal } from './CookiePolicyModal';
import { AdminPanel, useIsAdmin } from './AdminPanel';
import { FeedbackForm } from './FeedbackForm';
import { SupportModal } from './SupportModal';
import { resetCookieConsent, setPreferenceLocal } from './CookieConsent';
import { toast } from '../lib/toast';
import { NAV_ITEMS } from './DashboardLayout';
import { normalizeBirthday } from '../lib/holidays';
import { LmsConnectPanel } from './lms/LmsConnectPanel';
import { RpgProgressPanel, isAccentUnlocked } from './rpg/RpgProgressPanel';
import { downloadModuleVault } from '../lib/vaultExport';
import {
  AI_STUDIO_KEY_URL,
  AI_STUDIO_HOME_URL,
  GEMINI_BILLING_DOCS_URL,
  GEMINI_RATE_LIMIT_DOCS_URL,
} from '../lib/geminiUx';
import { GeminiKeySetupGuide } from './GeminiGate';
import {
  loadReminderPrefs,
  saveReminderPrefs,
  enableClassReminders,
  disableClassReminders,
  sendTestPush,
  getLeadOptions,
  getPushSupportStatus,
  type ReminderLeadMinutes,
} from '../lib/pushNotifications';

type SettingsPane = 'account' | 'layout' | 'study' | 'integrations';

const SETTINGS_TABS: { id: SettingsPane; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'layout', label: 'Layout & Theme' },
  { id: 'study', label: 'Study Preferences' },
  { id: 'integrations', label: 'Integrations' },
];

const SettingsTabInner: React.FC = () => {
  const { profile, updateProfile } = useProfile();
  const { theme, setTheme, accent, setAccent } = useTheme();
  const {
    lowPower, setLowPower, zenMode, setZenMode, openDyslexic, setOpenDyslexic,
    mobileNavSlots, setMobileNavSlots,
    navOrder, setNavOrder,
    showPomodoroWidget, setShowPomodoroWidget,
    showSmartWidget, setShowSmartWidget,
    showBrainDumpInbox, setShowBrainDumpInbox,
    smartWidgetActions, setSmartWidgetActions,
    smartWidgetMetrics, setSmartWidgetMetrics,
    smartWidgetCompact, setSmartWidgetCompact,
    smartWidgetShowMetrics, setSmartWidgetShowMetrics,
  } = usePreferences();
  const isAdmin = useIsAdmin();

  const [settingsPane, setSettingsPane] = useState<SettingsPane>('account');

  // User & Feed State
  const [email, setEmail] = useState('Loading…');
  const [userId, setUserId] = useState('Loading…');
  const [icalUrl, setIcalUrl] = useState('');
  const [feedStatus, setFeedStatus] = useState<string | null>(null);

  // Modals state
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  useEffect(() => {
    const openPrivacy = () => setShowPrivacy(true);
    const openCookies = () => setShowCookies(true);
    window.addEventListener('fios-open-privacy', openPrivacy);
    window.addEventListener('fios-open-cookies', openCookies);
    return () => {
      window.removeEventListener('fios-open-privacy', openPrivacy);
      window.removeEventListener('fios-open-cookies', openCookies);
    };
  }, []);
  const [showTerms, setShowTerms] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [gistStatus, setGistStatus] = useState<string | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Class Reminders (Web Push / local notifications)
  const [reminderEnabled, setReminderEnabled] = useState(() => loadReminderPrefs().enabled);
  const [reminderLead, setReminderLead] = useState<ReminderLeadMinutes>(() => loadReminderPrefs().leadMinutes);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [pushSupport] = useState(() => getPushSupportStatus());

  // Weekly Study Goal State
  const [goalHours, setGoalHours] = useState(profile?.weekly_study_goal_hours ?? 10);
  const [goalSaved, setGoalSaved] = useState(false);
  const [weeklyLoggedMinutes, setWeeklyLoggedMinutes] = useState(0);

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
  const [birthday, setBirthday] = useState('');
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
      setBirthday(normalizeBirthday(profile.birthday) || '');
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

  // Fetch cumulative focus time logged since Monday (work sessions only) — shared with WeeklyGoalWidget
  useEffect(() => {
    getWeeklyFocusMinutes()
      .then(setWeeklyLoggedMinutes)
      .catch(() => setWeeklyLoggedMinutes(0));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName,
        preferred_name: preferredName,
        address,
        birthday: normalizeBirthday(birthday),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      const msg = String(err?.message || err || '');
      if (/birthday/i.test(msg) || /column/i.test(msg)) {
        toast('Birthday save needs the latest profile schema — try again after the DB update.', 'error');
      } else {
        toast('Failed to save profile', 'error');
      }
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

  const handleExportData = async () => {
    let decks: unknown[] = [];
    let cards: unknown[] = [];
    let focus: unknown[] = [];
    try {
      if (!IS_DEMO) {
        const { data: d } = await supabase.from('decks').select('*');
        const { data: c } = await supabase.from('cards').select('*');
        const { data: f } = await supabase.from('focus_sessions').select('*');
        decks = d || [];
        cards = c || [];
        focus = f || [];
      }
    } catch {
      /* soft fail — still export local prefs */
    }
    const backupData = {
      exportedAt: new Date().toISOString(),
      version: '4.0.0',
      profile,
      preferences: JSON.parse(localStorage.getItem('fios_preferences') || '{}'),
      localStorage: { ...localStorage },
      studyLogs: focus,
      flashcards: { decks, cards },
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fios-study-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Export downloaded', 'success');
  };

  const handleGithubSignIn = async () => {
    if (IS_DEMO) {
      toast('GitHub OAuth unavailable in demo mode', 'info');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
        scopes: 'gist',
      },
    });
    if (error) toast(error.message, 'error');
  };

  const handleGistExport = async () => {
    const sample = `// Fios Code Lab export — ${new Date().toISOString()}\n// Paste your solution below.\n`;
    const token = (
      localStorage.getItem('fios_github_token') ||
      (import.meta.env.VITE_GITHUB_TOKEN as string | undefined) ||
      ''
    ).trim();
    if (!token) {
      await navigator.clipboard.writeText(sample);
      setGistStatus('No GitHub token. Sample copied — create a gist at https://gist.github.com and paste.');
      toast('Copied gist instructions to clipboard', 'info');
      return;
    }
    try {
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Fios Code Lab export',
          public: false,
          files: { 'fios-solution.js': { content: sample } },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `GitHub ${res.status}`);
      setGistStatus(`Gist created: ${data.html_url}`);
      toast('Gist created', 'success');
    } catch (err: any) {
      setGistStatus(err.message || 'Gist export failed');
      toast('Gist export failed', 'error');
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
    if (IS_DEMO) { disableDemo(); window.location.reload(); return; }
    await supabase.auth.signOut();
  };

  const numberField = (label: string, value: number, setValue: (n: number) => void) => (
    <div className="space-y-2">
      <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground block">{label}</label>
      <input
        type="number"
        min={1}
        max={120}
        value={value}
        onChange={(e) => setValue(Math.max(1, Math.min(120, Number(e.target.value))))}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:accent-border"
      />
    </div>
  );

  // Cumulative progress metrics — same rounding as WeeklyGoalWidget
  const doneHours = Math.round((weeklyLoggedMinutes / 60) * 10) / 10;
  const actualHours = doneHours.toFixed(1);
  const percentage = Math.min(100, goalHours > 0 ? Math.round((doneHours / goalHours) * 100) : 0);
  const remaining = Math.max(0, Math.round((goalHours - doneHours) * 10) / 10).toFixed(1);

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans text-foreground pb-12">
      <header className="space-y-1">
        <div className="flex items-center gap-2 accent-solid-text text-xs font-mono font-black uppercase tracking-widest">
          <Sliders className="w-3.5 h-3.5" /> System Preferences · Profile
        </div>
        <h1 className="text-3xl font-black italic uppercase text-foreground tracking-tight">Account & Studio Settings</h1>
        <p className="text-xs text-muted-foreground font-medium">Manage your Fios profile, focus timer defaults, and connected feeds.</p>
      </header>

      <div
        className="flex gap-1.5 overflow-x-auto fios-h-scroll pb-0.5 -mx-1 px-1"
        role="tablist"
        aria-label="Settings sections"
      >
        {SETTINGS_TABS.map((tab) => {
          const active = settingsPane === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSettingsPane(tab.id)}
              className={`shrink-0 min-h-11 px-3.5 py-2 rounded-xl border text-xs font-black uppercase tracking-wide cursor-pointer touch-manipulation ${
                active
                  ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]'
                  : 'fios-border text-[var(--fios-text-muted)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {settingsPane === 'account' && (
      <>
      {/* INSTALL APP SECTION */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 accent-solid-text" /> Install Fios as an App
          </h2>
          <span className="text-[10px] font-mono accent-solid-text bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">PWA Ready</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
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

        <div className="bg-background p-4 rounded-xl border border-border/80 space-y-2 text-xs font-mono text-foreground">
          <p className="font-bold text-foreground uppercase tracking-wide text-[11px] accent-solid-text">📱 How to add on iOS / iPhone:</p>
          <p className="text-muted-foreground">1. Open this page in <strong className="text-foreground">Safari</strong>.</p>
          <p className="text-muted-foreground">2. Tap the <strong className="text-foreground">Share</strong> button in the bottom menu bar.</p>
          <p className="text-muted-foreground">3. Scroll down and select <strong className="text-foreground">"Add to Home Screen"</strong>.</p>
        </div>
      </section>
      </>
      )}

      {settingsPane === 'integrations' && (
      <>
      {/* CLASS REMINDERS */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 accent-solid-text" /> Class Reminders
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{reminderEnabled ? 'On' : 'Off'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              disabled={reminderBusy}
              onClick={async () => {
                setReminderBusy(true);
                try {
                  if (reminderEnabled) {
                    await disableClassReminders();
                    setReminderEnabled(false);
                    toast('Class reminders disabled', 'info');
                  } else {
                    const result = await enableClassReminders(reminderLead);
                    setReminderEnabled(result.ok);
                    toast(result.message, result.ok ? 'success' : 'error');
                  }
                } finally {
                  setReminderBusy(false);
                }
              }}
              className={`relative w-11 h-6 rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
                reminderEnabled ? 'accent-bg border-transparent' : 'bg-secondary border-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  reminderEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Get a browser notification before your next class from the synced timetable or manual schedule.
          Choose how many minutes ahead to be notified. While Fios is open, reminders use local notifications;
          Web Push covers background delivery on supported browsers and installed PWAs.
        </p>
        {!pushSupport.supported && (
          <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 leading-relaxed">
            {pushSupport.message}
          </p>
        )}
        {pushSupport.supported && !pushSupport.pushCapable && (
          <p className="text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2 leading-relaxed">
            {pushSupport.message}
          </p>
        )}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Lead time</span>
          <div className="flex flex-wrap gap-2">
            {getLeadOptions().map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setReminderLead(mins);
                  saveReminderPrefs({ enabled: reminderEnabled, leadMinutes: mins });
                  if (reminderEnabled) {
                    void enableClassReminders(mins);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase border cursor-pointer ${
                  reminderLead === mins
                    ? 'fios-chip-active'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          disabled={reminderBusy || !reminderEnabled}
          onClick={async () => {
            setReminderBusy(true);
            try {
              const result = await sendTestPush();
              toast(result.message, result.ok ? 'success' : 'error');
            } finally {
              setReminderBusy(false);
            }
          }}
          className="px-4 py-2 bg-secondary hover:bg-muted text-foreground text-xs font-bold uppercase rounded-lg cursor-pointer disabled:opacity-40"
        >
          Send test notification
        </button>
      </section>
      </>
      )}

      {settingsPane === 'account' && (
      <>
      {/* 1. PROFILE */}
      <form onSubmit={handleSaveProfile} className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <User className="w-4 h-4 accent-solid-text" /> Profile Information
          </h2>
          {profileSaved && (
            <span className="text-xs font-mono accent-solid-text flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Saved</span>
          )}
        </div>

        <AvatarPicker url={profile?.avatar_url} name={profile?.preferred_name || profile?.full_name} onChange={handleAvatarChange} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1"><IdCard className="w-3 h-3 accent-solid-text" /> Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:accent-border" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Preferred Name (used in greetings)</label>
            <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="Ada"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:accent-border" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 accent-solid-text" /> Birthday
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:accent-border"
              aria-describedby="birthday-hint"
            />
            <p id="birthday-hint" className="text-[10px] font-mono text-muted-foreground">
              Optional — unlocks a birthday greeting and festive theme on your day.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3 accent-solid-text" /> Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, Country"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:accent-border" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-background border border-border/80 rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Authenticated Email</span>
            <p className="font-mono text-xs text-foreground font-bold truncate">{email}</p>
          </div>
          <div className="bg-background border border-border/80 rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">User ID</span>
            <p className="font-mono text-xs text-muted-foreground truncate font-semibold">{userId}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={savingProfile}
            className="px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {savingProfile ? 'Saving…' : 'Save Profile'}
          </motion.button>
        </div>
      </form>
      </>
      )}

      {settingsPane === 'study' && (
      <>
      {/* 2. WEEKLY STUDY TARGET */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 accent-solid-text" /> Weekly Study Goal Tracker
          </h2>
          {goalSaved && (
            <span className="text-xs font-mono accent-solid-text flex items-center gap-1 font-bold"><Check className="w-3.5 h-3.5" /> Updated</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-background p-4 rounded-xl border border-border/80">
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Logged Focus Time</span>
            <p className="text-xl font-mono font-black text-foreground">{actualHours}h <span className="text-xs text-muted-foreground">/ {goalHours}h</span></p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Target Progress</span>
            <p className="text-xl font-mono font-black accent-solid-text">{percentage}%</p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Hours Remaining</span>
            <p className="text-xs font-mono font-bold text-foreground">{remaining}h to go this week</p>
          </div>
        </div>

        <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-border">
          <div className="h-full accent-bg transition-all duration-500" style={{ width: `${percentage}%` }} />
        </div>

        <form onSubmit={handleSaveStudyGoal} className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-mono">Weekly Target (Hours):</label>
            <input
              type="number"
              min={1}
              max={100}
              value={goalHours}
              onChange={(e) => setGoalHours(Number(e.target.value))}
              className="w-20 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:accent-border"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-secondary hover:bg-muted text-xs font-bold text-foreground rounded-lg transition-colors cursor-pointer">
            Save Target
          </button>
        </form>
      </section>
      </>
      )}

      {settingsPane === 'account' && (
      <>
      {/* ACCOUNT SECURITY */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-5">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
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
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Update Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="new.email@university.ie"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-background border border-border rounded-lg text-foreground text-xs font-mono focus:outline-none focus:accent-border"
              />
              <button
                type="submit"
                disabled={loadingEmail}
                className="px-4 py-2 bg-secondary hover:bg-muted text-foreground text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                {loadingEmail ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>

          <form onSubmit={handleUpdatePassword} className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Change Password</label>
            <div className="flex gap-2">
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-background border border-border rounded-lg text-foreground text-xs font-mono focus:outline-none focus:accent-border"
              />
              <button
                type="submit"
                disabled={loadingPassword}
                className="px-4 py-2 bg-secondary hover:bg-muted text-foreground text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                {loadingPassword ? 'Saving...' : 'Change'}
              </button>
            </div>
          </form>
        </div>
      </section>
      </>
      )}

      {settingsPane === 'study' && (
      <>
      {/* 3. POMODORO DEFAULTS */}
      <form onSubmit={handleSavePomodoro} className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
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
        <p className="text-[10px] text-muted-foreground leading-tight">These durations drive both the Focus Timer tab and the floating timer widget across the app.</p>
        <div className="flex justify-end">
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={savingPomodoro}
            className="px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {savingPomodoro ? 'Saving…' : 'Save Timer Defaults'}
          </motion.button>
        </div>
      </form>
      </>
      )}

      {settingsPane === 'layout' && (
      <>
      {/* APPEARANCE */}
      <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-5">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)] flex items-center gap-2">
          <Palette className="w-4 h-4 accent-solid-text" /> Appearance
        </h2>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Theme</span>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { id: 'dark' as ThemeMode, label: 'Dark', Icon: Moon },
              { id: 'light' as ThemeMode, label: 'Light', Icon: Sun },
              { id: 'system' as ThemeMode, label: 'System', Icon: Monitor },
            ]).map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setTheme(id)}
                className={`min-h-11 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  theme === id ? 'fios-chip-active' : 'bg-[var(--fios-surface-2)] fios-border text-[var(--fios-text-muted)]'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setLowPower(!lowPower)}
            className={`min-h-11 px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer ${lowPower ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
          >
            <BatteryLow className="w-3.5 h-3.5" /> Low-Power {lowPower ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => setOpenDyslexic(!openDyslexic)}
            className={`min-h-11 px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer ${openDyslexic ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
          >
            <Type className="w-3.5 h-3.5" /> OpenDyslexic {openDyslexic ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => setZenMode(!zenMode)}
            className={`min-h-11 px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer ${zenMode ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
          >
            <Focus className="w-3.5 h-3.5" /> Zen mode {zenMode ? 'On' : 'Off'}
          </button>
        </div>
        {zenMode && (
          <p className="text-[11px] text-[var(--fios-text-muted)]">
            Zen hides chrome on study tabs only. Press <kbd className="font-mono accent-solid-text">Esc</kbd>, use Exit Zen, or open Settings — you will not get trapped.
          </p>
        )}

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" /> Floating widgets
          </span>
          <p className="text-[10px] text-[var(--fios-text-muted)] leading-snug">
            Desktop defaults the Pomodoro widget On. Mobile defaults Off until you toggle here —
            then your choice is saved for that device size (desktop and mobile are independent).
            Smart Quick and Brain Dump live under Study Preferences.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowPomodoroWidget(!showPomodoroWidget)}
              className={`min-h-11 px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer ${showPomodoroWidget ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
            >
              <Timer className="w-3.5 h-3.5" /> Pomodoro Widget {showPomodoroWidget ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Mobile bottom nav (add / hide / reorder · max 5)</span>
          <p className="text-[10px] text-[var(--fios-text-muted)]">On your phone, long-press a bottom tab and drag to reposition. Order saves to localStorage / profile prefs.</p>
          <div className="space-y-1.5">
            {(() => {
              const slots = mobileNavSlots.length ? mobileNavSlots : [...DEFAULT_MOBILE_NAV];
              return slots.map((id, idx) => {
              const item = NAV_ITEMS.find((n) => n.id === id);
              if (!item) return null;
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border fios-border bg-[var(--fios-surface-2)] px-2 py-1.5">
                  <GripVertical className="w-3.5 h-3.5 text-[var(--fios-text-muted)]" />
                  <span className="flex-1 text-xs font-bold text-[var(--fios-text)]">{item.label}</span>
                  <button type="button" disabled={idx === 0} onClick={() => {
                    const next = [...slots];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    setMobileNavSlots(next);
                  }} className="p-1 cursor-pointer disabled:opacity-30" aria-label="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={idx >= slots.length - 1} onClick={() => {
                    const next = [...slots];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    setMobileNavSlots(next);
                  }} className="p-1 cursor-pointer disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button
                    type="button"
                    disabled={slots.length <= 1}
                    onClick={() => setMobileNavSlots(slots.filter((s) => s !== id))}
                    className="text-[10px] text-rose-400 font-bold cursor-pointer px-1 disabled:opacity-30"
                  >
                    Hide
                  </button>
                </div>
              );
              });
            })()}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {NAV_ITEMS.filter((item) => !(mobileNavSlots.length ? mobileNavSlots : DEFAULT_MOBILE_NAV).includes(item.id)).map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={(mobileNavSlots.length ? mobileNavSlots : DEFAULT_MOBILE_NAV).length >= 5}
                onClick={() => {
                  const slots = mobileNavSlots.length ? mobileNavSlots : [...DEFAULT_MOBILE_NAV];
                  if (slots.length < 5) setMobileNavSlots([...slots, item.id]);
                }}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase border fios-border text-[var(--fios-text-muted)] cursor-pointer disabled:opacity-40"
              >
                + {item.label}
              </button>
            ))}
            <button type="button" onClick={() => setMobileNavSlots([...DEFAULT_MOBILE_NAV])} className="px-2 py-1 text-[10px] font-mono accent-solid-text cursor-pointer">
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Desktop sidebar order</span>
          <p className="text-[10px] text-[var(--fios-text-muted)]">Drag in the sidebar or reorder here. Persists to localStorage / profile prefs.</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {(() => {
              const order = navOrder.length ? navOrder : [...DEFAULT_NAV_ORDER];
              return order.map((id, idx) => {
              const item = NAV_ITEMS.find((n) => n.id === id);
              if (!item) return null;
              return (
                <div key={id} className="flex items-center gap-2 px-2 py-1 rounded border fios-border text-xs">
                  <span className="flex-1 font-bold text-[var(--fios-text)]">{item.label}</span>
                  <button type="button" disabled={idx === 0} onClick={() => {
                    const next = [...order];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    setNavOrder(next);
                  }} className="p-1 cursor-pointer disabled:opacity-30" aria-label="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={idx >= order.length - 1} onClick={() => {
                    const next = [...order];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    setNavOrder(next);
                  }} className="p-1 cursor-pointer disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              );
              });
            })()}
          </div>
          <button type="button" onClick={() => setNavOrder([...DEFAULT_NAV_ORDER])} className="text-[10px] font-mono accent-solid-text cursor-pointer">
            Reset sidebar order
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Accent Gradient</span>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => {
              const locked = LOCKED_ACCENTS.has(a.key as AccentKey) && !isAccentUnlocked(a.key as AccentKey);
              return (
              <button
                key={a.key}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) {
                    toast('Unlock via RPG skill points first', 'info');
                    return;
                  }
                  setAccent(a.key);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-transform cursor-pointer ${
                  accent === a.key ? 'ring-2 ring-white/60 scale-[1.03]' : 'opacity-80 hover:opacity-100'
                } ${locked ? 'opacity-40 cursor-not-allowed' : ''} bg-[var(--fios-surface-2)] fios-border text-[var(--fios-text)]`}
              >
                <span className="w-4 h-4 rounded-full" style={{ backgroundImage: `linear-gradient(120deg, ${a.from}, ${a.to})` }} />
                {a.label}
                {locked ? <Lock className="w-3 h-3 text-[var(--fios-text-muted)]" /> : null}
              </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--fios-text-muted)]">The public landing page keeps Fios's signature emerald identity regardless of this choice. Cyber & Dark Matter unlock via RPG.</p>
        </div>
      </section>

      <RpgProgressPanel />
      </>
      )}

      {settingsPane === 'integrations' && (
      <>
      <LmsConnectPanel />

      <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-3">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)] flex items-center gap-2">
          <Download className="w-4 h-4 accent-solid-text" /> Obsidian vault export
        </h2>
        <p className="text-xs text-[var(--fios-text-muted)]">
          Export a module as a Markdown ZIP with wikilinks for Obsidian / Notion. Prefer Modules → Export vault when a module is selected.
        </p>
        <button
          type="button"
          onClick={() => {
            const code = window.prompt('Module code to export (e.g. COMP1234)');
            if (!code?.trim()) return;
            void downloadModuleVault(code.trim())
              .then(() => toast('Vault ZIP downloaded', 'success'))
              .catch((e: any) => toast(e?.message || 'Vault export failed', 'error'));
          }}
          className="px-4 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export module vault
        </button>
      </section>
      </>
      )}

      {settingsPane === 'study' && (
      <>
      {/* Smart Quick + Brain Dump */}
      <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)] flex items-center gap-2">
          <Zap className="w-4 h-4 accent-solid-text" /> Smart Quick & Brain Dump
        </h2>
        <p className="text-[10px] text-[var(--fios-text-muted)] leading-snug">
          Desktop defaults these On. Mobile defaults Off until you toggle here — choices save per device size.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowSmartWidget(!showSmartWidget)}
            className={`min-h-11 px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer ${showSmartWidget ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
          >
            <Zap className="w-3.5 h-3.5" /> Smart Quick Widget {showSmartWidget ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => setShowBrainDumpInbox(!showBrainDumpInbox)}
            className={`min-h-11 px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer ${showBrainDumpInbox ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
          >
            <Brain className="w-3.5 h-3.5" /> Brain Dump Inbox {showBrainDumpInbox ? 'On' : 'Off'}
          </button>
        </div>

        {showSmartWidget && (
          <div className="space-y-3 rounded-xl border fios-border-strong bg-[var(--fios-surface-2)]/50 p-4">
            <span className="text-[11px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">Smart Quick Widget layout</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSmartWidgetCompact(!smartWidgetCompact)}
                className={`min-h-11 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase cursor-pointer ${smartWidgetCompact ? 'fios-chip-active' : 'fios-border text-[var(--fios-text-muted)]'}`}
              >
                Compact FAB {smartWidgetCompact ? 'On' : 'Off'}
              </button>
              <button
                type="button"
                onClick={() => setSmartWidgetShowMetrics(!smartWidgetShowMetrics)}
                className={`min-h-11 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase cursor-pointer ${smartWidgetShowMetrics ? 'fios-chip-active' : 'fios-border text-[var(--fios-text-muted)]'}`}
              >
                Metrics chip {smartWidgetShowMetrics ? 'On' : 'Off'}
              </button>
            </div>

            {smartWidgetShowMetrics && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[var(--fios-text-muted)] uppercase">Metrics (toggle + reorder)</span>
                {ALL_SMART_METRICS.map((id) => {
                  const on = smartWidgetMetrics.includes(id);
                  const idx = smartWidgetMetrics.indexOf(id);
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (on) setSmartWidgetMetrics(smartWidgetMetrics.filter((m) => m !== id));
                          else setSmartWidgetMetrics([...smartWidgetMetrics, id]);
                        }}
                        className={`flex-1 min-h-11 px-3 py-2 rounded-lg border text-xs font-bold text-left cursor-pointer ${on ? 'accent-border accent-solid-text bg-[var(--fios-surface)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
                      >
                        {SMART_METRIC_LABELS[id]}
                      </button>
                      {on && (
                        <>
                          <button type="button" disabled={idx <= 0} onClick={() => {
                            const next = [...smartWidgetMetrics];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setSmartWidgetMetrics(next);
                          }} className="min-h-11 min-w-11 p-1.5 rounded border fios-border cursor-pointer disabled:opacity-30" aria-label="Move metric up">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" disabled={idx < 0 || idx >= smartWidgetMetrics.length - 1} onClick={() => {
                            const next = [...smartWidgetMetrics];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            setSmartWidgetMetrics(next);
                          }} className="min-h-11 min-w-11 p-1.5 rounded border fios-border cursor-pointer disabled:opacity-30" aria-label="Move metric down">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
                <button type="button" onClick={() => setSmartWidgetMetrics([...DEFAULT_SMART_METRICS])} className="text-[10px] font-mono accent-solid-text cursor-pointer">
                  Reset metrics
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--fios-text-muted)] uppercase">Shortcuts (order = menu order)</span>
              {ALL_SMART_ACTIONS.map((id) => {
                const on = smartWidgetActions.includes(id);
                const idx = smartWidgetActions.indexOf(id);
                return (
                  <div key={id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (on) setSmartWidgetActions(smartWidgetActions.filter((a) => a !== id));
                        else setSmartWidgetActions([...smartWidgetActions, id]);
                      }}
                      className={`flex-1 min-h-11 px-3 py-2 rounded-lg border text-xs font-bold text-left cursor-pointer ${on ? 'accent-border accent-solid-text bg-[var(--fios-surface)]' : 'fios-border text-[var(--fios-text-muted)]'}`}
                    >
                      {SMART_ACTION_LABELS[id]}
                    </button>
                    {on && (
                      <>
                        <button type="button" disabled={idx <= 0} onClick={() => {
                          const next = [...smartWidgetActions];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          setSmartWidgetActions(next);
                        }} className="min-h-11 min-w-11 p-1.5 rounded border fios-border cursor-pointer disabled:opacity-30" aria-label="Move up">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" disabled={idx < 0 || idx >= smartWidgetActions.length - 1} onClick={() => {
                          const next = [...smartWidgetActions];
                          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                          setSmartWidgetActions(next);
                        }} className="min-h-11 min-w-11 p-1.5 rounded border fios-border cursor-pointer disabled:opacity-30" aria-label="Move down">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={() => setSmartWidgetActions([...DEFAULT_SMART_ACTIONS])} className="text-[10px] font-mono accent-solid-text cursor-pointer">
                Reset Smart actions
              </button>
            </div>
          </div>
        )}
      </section>

      {/* FSRS opt-in (beta) — SM-2 remains default */}
      <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-3">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)]">
          Spaced repetition
        </h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 accent-[var(--fios-accent-solid)]"
            defaultChecked={(() => {
              try {
                return localStorage.getItem('fios_fsrs_opt_in') === '1';
              } catch {
                return false;
              }
            })()}
            onChange={(e) => {
              setPreferenceLocal('fios_fsrs_opt_in', e.target.checked ? '1' : '0');
            }}
          />
          <span>
            <span className="text-sm font-bold text-[var(--fios-text)]">FSRS scheduler (beta)</span>
            <p className="text-xs text-[var(--fios-text-muted)] mt-1">
              When enabled, saved-card ratings use the server FSRS path. New decks still default to SM-2 until you opt in.
            </p>
          </span>
        </label>
      </section>
      </>
      )}

      {settingsPane === 'integrations' && (
      <>
      {/* GEMINI API KEY (BYO KEY & WALKTHROUGH) */}
      <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
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

        {showKeyGuide && <GeminiKeySetupGuide />}

        <p className="text-xs text-[var(--fios-text-muted)]">
          {profile?.gemini_api_key
            ? 'A key is configured. AI features are unlocked. You can replace or remove it below.'
            : 'Add your Gemini API key to unlock AI features. It is stored on your profile and used only for your requests. Without a key, flashcards, quizzes, code exams, Smart Notes, and the tutor stay locked — Fios does not ship a shared Gemini key.'}
        </p>

        <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)]/80 px-3.5 py-3 space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--fios-text-muted)]">
            Tip · Free tier vs paid
          </p>
          <p className="text-xs text-[var(--fios-text-muted)] leading-relaxed">
            Free Gemini keys share limited quota: rate limits, cold starts, and lower priority can make AI feel slow or time out when demand is high.
            Enabling billing for a paid Gemini API key in Google AI Studio usually speeds Fios up a lot (higher quotas, fewer 429s/timeouts, lower latency). Optional — only if free-tier delays keep blocking study.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={AI_STUDIO_HOME_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold accent-solid-text hover:underline cursor-pointer"
            >
              Open Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={GEMINI_BILLING_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--fios-text-muted)] hover:accent-solid-text hover:underline cursor-pointer"
            >
              Billing docs <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={GEMINI_RATE_LIMIT_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--fios-text-muted)] hover:accent-solid-text hover:underline cursor-pointer"
            >
              Rate limits <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

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

        <div className="flex items-center justify-between flex-wrap gap-2">
          {keyStatus === 'valid' && <span className="text-[11px] font-bold accent-solid-text flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Key is valid</span>}
          {keyStatus === 'invalid' && <span className="text-[11px] font-bold text-rose-400">Key could not be validated.</span>}
          {keyStatus === 'saved' && <span className="text-[11px] font-bold accent-solid-text flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
          <a href={AI_STUDIO_KEY_URL} target="_blank" rel="noreferrer" className="ml-auto text-[11px] font-mono text-[var(--fios-text-muted)] hover:accent-solid-text flex items-center gap-1">
            Get an API key <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
      </>
      )}

      {settingsPane === 'account' && (
      <>
      {/* ABOUT, LEGAL & SUPPORT */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 accent-solid-text" /> About, Legal & Support
        </h2>
        <p className="text-xs text-muted-foreground">
          Review our data processing practices under GDPR or reach out directly for assistance. Fios v4.0.0.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => setShowPrivacy(true)}
            className="px-4 py-2 rounded-lg bg-background border border-border text-xs font-mono accent-solid-text hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" /> Privacy Policy & GDPR
          </button>
          <button
            onClick={() => setShowCookies(true)}
            className="px-4 py-2 rounded-lg bg-background border border-border text-xs font-mono accent-solid-text hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <Cookie className="w-3.5 h-3.5" /> Cookie Policy
          </button>
          <button
            onClick={() => setShowTerms(true)}
            className="px-4 py-2 rounded-lg bg-background border border-border text-xs font-mono accent-solid-text hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Terms of Service
          </button>
          <button
            onClick={() => { resetCookieConsent(); toast('Cookie consent reset — banner will reappear', 'info'); }}
            className="px-4 py-2 rounded-lg bg-background border border-border text-xs font-mono accent-solid-text hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <Cookie className="w-3.5 h-3.5" /> Reset cookie consent
          </button>
          <button
            onClick={() => setShowSupport(true)}
            className="px-4 py-2 rounded-lg bg-background border border-border text-xs font-mono accent-solid-text hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" /> Contact Support
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAdmin((v) => !v)}
              className="px-4 py-2 rounded-lg bg-background border accent-border text-xs font-mono accent-solid-text cursor-pointer inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Admin panel
            </button>
          )}
        </div>
        {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      </section>

      <FeedbackForm />
      </>
      )}

      {settingsPane === 'integrations' && (
      <>
      {/* GitHub */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <GitBranch className="w-4 h-4 accent-solid-text" /> GitHub
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleGithubSignIn()}
            className="px-4 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer inline-flex items-center gap-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" /> Sign in with GitHub
          </button>
          <button
            type="button"
            onClick={() => void handleGistExport()}
            className="px-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
          >
            Export Code Lab as Gist
          </button>
        </div>
        {gistStatus && <p className="text-[11px] font-mono text-muted-foreground">{gistStatus}</p>}
        <p className="text-[10px] text-muted-foreground">Optional: set <code className="accent-solid-text">fios_github_token</code> in localStorage or <code className="accent-solid-text">VITE_GITHUB_TOKEN</code> for automatic gist creation.</p>
      </section>

      {/* PRIVACY & DATA RIGHTS */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 accent-solid-text" /> Privacy & Data Security
        </h2>

        <div className="text-xs text-muted-foreground space-y-2 leading-relaxed bg-background/60 p-4 rounded-xl border border-border/80">
          <p>• <strong className="text-foreground">Controllers & processors:</strong> Your study data is stored in Supabase under RLS. AI calls use your Gemini key. Optional GitHub OAuth/gists, hosting logs, email delivery for Contact Support, and Web Push are described in the Privacy Policy.</p>
          <p>• <strong className="text-foreground">BYO Gemini key:</strong> Stored on your profile (RLS). Not used to train public models from your notes.</p>
          <p>• <strong className="text-foreground">Feedback & support:</strong> Optional ratings/messages and support form submissions go to the app operator — see Privacy Policy for anonymous vs signed-in, retention, and lawful basis.</p>
          <p>• <strong className="text-foreground">Your rights:</strong> Export a JSON copy below, update your profile anytime, or email support for erasure. Full GDPR statement via Privacy Policy.</p>
          <p>• <strong className="text-foreground">Consent:</strong> Essential browser storage only (no ad trackers / analytics SDKs) — reset the cookie banner above anytime.</p>
        </div>

        <div className="pt-1 flex flex-wrap gap-3">
          <button
            onClick={() => void handleExportData()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 accent-solid-text" /> Export My Data (JSON)
          </button>

          <button
            onClick={() => {
              if (confirm('Clear Fios localStorage on this device (theme, consent, caches, local schedule)? Cloud study data in Supabase is not deleted — use Export first, then email support for full account erasure.')) {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('fios_'))
                  .forEach((k) => localStorage.removeItem(k));
                toast('Local Fios preferences cleared', 'info');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors border border-rose-500/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Local Storage & Account Data
          </button>
        </div>
      </section>

      {/* 4. TIMETABLE FEED */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <h2 className="text-xs font-mono font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 accent-solid-text" /> Timetable Feed URL (iCal)
        </h2>
        <form onSubmit={handleSaveFeed} className="flex flex-col sm:flex-row items-center gap-3">
          <input type="url" value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://timetables.atu.ie/Ical/StudentSet?studentSetID=…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:accent-border" />
          <button type="submit" className="w-full sm:w-auto px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors shrink-0 cursor-pointer">Update Feed</button>
        </form>
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground font-mono">Need to unlink or reset your timetable sync?</p>
          <button type="button" onClick={handleRemoveFeed}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Remove Link
          </button>
        </div>
        {feedStatus && <p className="text-xs font-mono accent-solid-text font-bold">{feedStatus}</p>}
      </section>
      </>
      )}

      {settingsPane === 'account' && (
      <>
      {/* 5. SESSION / DANGER */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xs font-mono font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Session Termination
          </h2>
          <p className="text-xs text-muted-foreground">Securely log out of your Fios session on this device.</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleLogout}
          className="min-h-11 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-foreground font-black italic uppercase text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-rose-500/20">
          <LogOut className="w-4 h-4" /> Log Out of Fios
        </motion.button>
      </section>
      </>
      )}

      {showPrivacy && (
        <PrivacyModal
          onClose={() => setShowPrivacy(false)}
          onOpenCookies={() => {
            setShowPrivacy(false);
            setShowCookies(true);
          }}
        />
      )}
      {showCookies && (
        <CookiePolicyModal
          onClose={() => setShowCookies(false)}
          onOpenPrivacy={() => {
            setShowCookies(false);
            setShowPrivacy(true);
          }}
        />
      )}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
    </div>
  );
};

export const SettingsTab = React.memo(SettingsTabInner);
export default SettingsTab;