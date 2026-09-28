import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Flag,
  Inbox,
  Loader2,
  MessageSquare,
  Palette,
  RefreshCw,
  Search,
  Shield,
  Star,
  Trash2,
  Users,
  X,
  LayoutDashboard,
  Settings2,
  ScrollText,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_HOLIDAY_PREVIEWS } from '../lib/holidays';
import {
  deleteAllFeedback,
  deleteFeedback,
  filterFeedback,
  listAllFeedback,
  setFeedbackResolved,
  type FeedbackEntry,
  type FeedbackResolveFilter,
  FEEDBACK_CATEGORIES,
} from '../lib/feedbackService';
import {
  checkVapidConfigured,
  clearAdminAudit,
  clearLocalCachesSoft,
  collectEnvHealth,
  exportFeedbackJson,
  fetchApiHealth,
  listAdminAudit,
  listAdminProfiles,
  loadOverviewStats,
  logAdminAction,
  runAdminTestPush,
  supportInboxStatus,
  type AdminAuditEntry,
  type AdminProfileRow,
  type EnvHealthItem,
  type HealthSnapshot,
  type OverviewStats,
} from '../lib/adminService';
import {
  createAdminFlag,
  filterContentFlags,
  listContentFlags,
  setContentFlagStatus,
  deleteContentFlag,
  FLAG_REASONS,
  FLAG_TARGET_TYPES,
  type ContentFlag,
  type FlagStatusFilter,
  type FlagTargetType,
} from '../lib/contentFlagsService';
import { HolidayMotif } from './HolidayMotif';
import { toast } from '../lib/toast';

type AdminSection =
  | 'overview'
  | 'feedback'
  | 'users'
  | 'moderation'
  | 'holidays'
  | 'push'
  | 'system'
  | 'support'
  | 'audit'
  | 'danger';

interface AdminPanelProps {
  onClose?: () => void;
}

const NAV: { id: AdminSection; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'moderation', label: 'Moderation', icon: Flag },
  { id: 'holidays', label: 'Holidays', icon: Palette },
  { id: 'push', label: 'Push', icon: Bell },
  { id: 'system', label: 'System', icon: Settings2 },
  { id: 'support', label: 'Support', icon: Inbox },
  { id: 'audit', label: 'Audit', icon: ScrollText },
  { id: 'danger', label: 'Danger', icon: AlertTriangle },
];

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] px-3 py-2.5 min-w-0">
      <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--fios-text-muted)] truncate">
        {label}
      </p>
      <p className="text-lg font-black accent-solid-text tabular-nums leading-tight mt-0.5 truncate">
        {value}
      </p>
      {hint && (
        <p className="text-[9px] font-mono text-[var(--fios-text-muted)] mt-0.5 truncate">{hint}</p>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h4 className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      {action}
    </div>
  );
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { profile } = useProfile();
  const { holidayTheme, previewHolidayTheme } = useTheme();
  const adminUid = (import.meta.env.VITE_ADMIN_UID as string | undefined)?.trim() || '';
  const isAdmin = !!adminUid && profile?.id === adminUid;

  const [section, setSection] = useState<AdminSection>('overview');
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loadingFb, setLoadingFb] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbResolve, setFbResolve] = useState<FeedbackResolveFilter>('all');
  const [fbCategory, setFbCategory] = useState('');
  const [fbMinRating, setFbMinRating] = useState(0);
  const [fbQuery, setFbQuery] = useState('');

  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [envItems, setEnvItems] = useState<EnvHealthItem[]>([]);
  const [vapid, setVapid] = useState<{ configured: boolean; detail: string } | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [dangerConfirm, setDangerConfirm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [flagStatus, setFlagStatus] = useState<FlagStatusFilter>('open');
  const [flagQuery, setFlagQuery] = useState('');
  const [newFlagType, setNewFlagType] = useState<FlagTargetType>('other');
  const [newFlagLabel, setNewFlagLabel] = useState('');
  const [newFlagReason, setNewFlagReason] = useState('other');
  const [newFlagDetails, setNewFlagDetails] = useState('');
  const [flagBusy, setFlagBusy] = useState(false);

  const refreshAudit = useCallback(() => setAudit(listAdminAudit()), []);

  const loadFlags = useCallback(async () => {
    if (!isAdmin) return;
    setFlagsLoading(true);
    setFlagsError(null);
    try {
      const rows = await listContentFlags();
      setFlags(rows);
    } catch (err: any) {
      setFlagsError(
        err.message ||
          'Flags unavailable. Apply content_flags table + RLS from v3.1.1 SQL.'
      );
      setFlags([]);
    } finally {
      setFlagsLoading(false);
    }
  }, [isAdmin]);

  const loadFeedback = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingFb(true);
    setFbError(null);
    try {
      const rows = await listAllFeedback();
      setFeedback(rows);
    } catch (err: any) {
      setFbError(err.message || 'Failed to load feedback (check fios_admins + RLS).');
      setFeedback([]);
    } finally {
      setLoadingFb(false);
    }
  }, [isAdmin]);

  const loadProfiles = useCallback(async () => {
    if (!isAdmin) return;
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const rows = await listAdminProfiles();
      setProfiles(rows);
    } catch (err: any) {
      setProfilesError(
        err.message ||
          'Profile directory unavailable. Apply user_profiles_admin_read policy from schema.sql.'
      );
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [isAdmin]);

  const refreshSystem = useCallback(async () => {
    if (!isAdmin) return;
    setRefreshing(true);
    try {
      const [h, v] = await Promise.all([fetchApiHealth(), checkVapidConfigured()]);
      setHealth(h);
      setVapid(v);
      setEnvItems(collectEnvHealth());
      refreshAudit();
    } finally {
      setRefreshing(false);
    }
  }, [isAdmin, refreshAudit]);

  const refreshAll = useCallback(async () => {
    if (!isAdmin) return;
    await Promise.all([loadFeedback(), loadProfiles(), loadFlags(), refreshSystem()]);
  }, [isAdmin, loadFeedback, loadProfiles, loadFlags, refreshSystem]);

  useEffect(() => {
    if (!isAdmin) return;
    void refreshAll();
    logAdminAction('console_open', profile?.id?.slice(0, 8));
    refreshAudit();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps -- mount once when admin

  useEffect(() => {
    if (!isAdmin) return;
    void loadOverviewStats(feedback).then(setStats);
  }, [isAdmin, feedback]);

  const filteredFeedback = useMemo(
    () =>
      filterFeedback(feedback, {
        resolve: fbResolve,
        category: fbCategory,
        minRating: fbMinRating || undefined,
        query: fbQuery,
      }),
    [feedback, fbResolve, fbCategory, fbMinRating, fbQuery]
  );

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const hay = `${p.preferred_name || ''} ${p.full_name || ''} ${p.id} ${p.theme || ''} ${p.accent_color || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [profiles, userQuery]);

  const filteredFlags = useMemo(
    () => filterContentFlags(flags, { status: flagStatus, query: flagQuery }),
    [flags, flagStatus, flagQuery]
  );

  const openFlagCount = useMemo(
    () => flags.filter((f) => f.status === 'open').length,
    [flags]
  );

  const handleDelete = async (id: string) => {
    try {
      // Verified delete (RPC or DELETE + existence check); only then drop from UI.
      await deleteFeedback(id);
      setFeedback((prev) => prev.filter((f) => f.id !== id));
      logAdminAction('feedback_delete', id.slice(0, 8));
      refreshAudit();
      toast('Feedback deleted', 'info');
    } catch (err: any) {
      toast(
        err.message ||
          'Delete failed — run supabase/v3.1.9-feedback-admin-delete.sql (fios_admins required)',
        'error'
      );
    }
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    try {
      const updated = await setFeedbackResolved(id, resolved);
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)));
      logAdminAction(resolved ? 'feedback_resolve' : 'feedback_reopen', id.slice(0, 8));
      refreshAudit();
      toast(resolved ? 'Marked resolved' : 'Reopened', 'success');
    } catch (err: any) {
      toast(
        err.message ||
          'Resolve failed — apply feedback.resolved_at + feedback_admin_update from schema.sql',
        'error'
      );
    }
  };

  const handleTestPush = async () => {
    setPushBusy(true);
    try {
      const result = await runAdminTestPush();
      refreshAudit();
      toast(result.message, result.ok ? 'success' : 'error');
    } catch (err: any) {
      toast(err.message || 'Test push failed', 'error');
    } finally {
      setPushBusy(false);
    }
  };

  const handleDeleteAllFeedback = async () => {
    if (dangerConfirm !== 'DELETE FEEDBACK') {
      toast('Type DELETE FEEDBACK to confirm', 'error');
      return;
    }
    try {
      const ids = feedback.map((f) => f.id);
      const deletedIds = await deleteAllFeedback(ids);
      const removed = new Set(deletedIds);
      setFeedback((prev) => prev.filter((f) => !removed.has(f.id)));
      setDangerConfirm('');
      logAdminAction('feedback_delete_all', String(deletedIds.length));
      refreshAudit();
      toast(`Deleted ${deletedIds.length} feedback row(s)`, 'info');
    } catch (err: any) {
      toast(
        err.message ||
          'Bulk delete failed — run supabase/v3.1.9-feedback-admin-delete.sql',
        'error'
      );
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border fios-border bg-[var(--fios-surface)] p-4 text-xs text-[var(--fios-text-muted)] font-mono">
        Admin panel is not available for this account.
      </div>
    );
  }

  const support = supportInboxStatus();

  return (
    <div className="rounded-2xl border accent-border bg-[var(--fios-surface)] shadow-xl font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b fios-border">
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 accent-solid-text">
          <Shield className="w-4 h-4" /> Admin Console
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="text-[var(--fios-text-muted)] hover:accent-solid-text cursor-pointer p-1"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loadingFb ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--fios-text-muted)] cursor-pointer p-1"
              aria-label="Close admin"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[420px] max-h-[min(78vh,720px)]">
        {/* Nav — horizontal scroll on mobile, sidebar on md+ */}
        <nav
          className="md:w-40 shrink-0 border-b md:border-b-0 md:border-r fios-border overflow-x-auto md:overflow-y-auto bg-[var(--fios-surface-2)]/40"
          aria-label="Admin sections"
        >
          <ul className="flex md:flex-col gap-0.5 p-2 min-w-max md:min-w-0">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSection(id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wide cursor-pointer transition-colors whitespace-nowrap ${
                      active
                        ? 'accent-border border bg-[var(--fios-surface)] accent-solid-text'
                        : 'border border-transparent text-[var(--fios-text-muted)] hover:text-[var(--fios-text)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {section === 'overview' && (
            <section>
              <SectionHeader icon={LayoutDashboard} title="Dashboard" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                <StatCard
                  label="Feedback"
                  value={stats ? String(stats.feedbackTotal) : '—'}
                  hint={stats ? `${stats.feedbackUnresolved} open` : undefined}
                />
                <StatCard
                  label="Avg rating"
                  value={stats?.feedbackAvgRating != null ? String(stats.feedbackAvgRating) : '—'}
                />
                <StatCard
                  label="Profiles"
                  value={
                    stats?.profileCount != null
                      ? String(stats.profileCount)
                      : stats?.profilesError
                        ? 'n/a'
                        : '—'
                  }
                  hint={stats?.profilesError ? 'RLS / migration' : undefined}
                />
                <StatCard
                  label="API version"
                  value={health?.version || '—'}
                  hint={health?.ok ? `${health.latencyMs ?? '—'}ms` : health?.error || undefined}
                />
                <StatCard label="Client" value={stats?.clientVersion || '3.0.2'} />
                <StatCard
                  label="VAPID"
                  value={vapid == null ? '…' : vapid.configured ? 'OK' : 'Off'}
                  hint={vapid?.configured ? 'push ready' : 'not configured'}
                />
              </div>
              <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">
                Gate: <span className="accent-solid-text">VITE_ADMIN_UID</span> +{' '}
                <span className="accent-solid-text">fios_admins</span> · session{' '}
                {profile?.id?.slice(0, 8)}…
              </p>
            </section>
          )}

          {section === 'feedback' && (
            <section className="space-y-3">
              <SectionHeader
                icon={MessageSquare}
                title="Ratings & feedback"
                action={
                  <button
                    type="button"
                    onClick={() => void loadFeedback()}
                    className="text-[10px] font-mono accent-solid-text cursor-pointer"
                  >
                    Refresh
                  </button>
                }
              />
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fios-text-muted)]" />
                  <input
                    value={fbQuery}
                    onChange={(e) => setFbQuery(e.target.value)}
                    placeholder="Search message…"
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[11px] text-[var(--fios-text)] font-mono"
                  />
                </div>
                <select
                  value={fbResolve}
                  onChange={(e) => setFbResolve(e.target.value as FeedbackResolveFilter)}
                  className="rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[10px] font-mono text-[var(--fios-text)] px-2 py-1.5 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
                <select
                  value={fbCategory}
                  onChange={(e) => setFbCategory(e.target.value)}
                  className="rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[10px] font-mono text-[var(--fios-text)] px-2 py-1.5 cursor-pointer"
                >
                  <option value="">Any category</option>
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={fbMinRating}
                  onChange={(e) => setFbMinRating(Number(e.target.value))}
                  className="rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[10px] font-mono text-[var(--fios-text)] px-2 py-1.5 cursor-pointer"
                >
                  <option value={0}>Any ★</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      ≥ {n}★
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => exportFeedbackJson(filteredFeedback)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono accent-solid-text cursor-pointer px-2"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>

              {loadingFb && (
                <div className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              )}
              {fbError && <p className="text-xs text-rose-400 font-mono">{fbError}</p>}
              {!loadingFb && !fbError && filteredFeedback.length === 0 && (
                <p className="text-xs text-[var(--fios-text-muted)]">No feedback matches.</p>
              )}

              <ul className="space-y-2">
                {filteredFeedback.map((f) => (
                  <li
                    key={f.id}
                    className={`rounded-xl border p-3 space-y-1.5 ${
                      f.resolved_at
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'fios-border bg-[var(--fios-surface-2)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < f.rating
                                ? 'fill-[var(--fios-accent-solid)] text-[var(--fios-accent-solid)]'
                                : 'text-[var(--fios-text-muted)]'
                            }`}
                          />
                        ))}
                        {f.resolved_at && (
                          <span className="ml-1 text-[9px] font-mono uppercase text-emerald-400">
                            resolved
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleResolve(f.id, !f.resolved_at)}
                          className="text-[var(--fios-text-muted)] hover:accent-solid-text cursor-pointer p-1"
                          aria-label={f.resolved_at ? 'Reopen' : 'Resolve'}
                          title={f.resolved_at ? 'Reopen' : 'Resolve'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(f.id)}
                          className="text-rose-400 cursor-pointer p-1"
                          aria-label="Delete feedback"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(f.categories || []).map((c) => (
                        <span
                          key={c}
                          className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border fios-border text-[var(--fios-text-muted)]"
                        >
                          {c}
                        </span>
                      ))}
                      {f.anonymous && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400">
                          anonymous
                        </span>
                      )}
                    </div>
                    {f.message && (
                      <p className="text-xs text-[var(--fios-text)] whitespace-pre-wrap leading-relaxed">
                        {f.message}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">
                      {new Date(f.created_at).toLocaleString()}
                      {!f.anonymous && f.user_id ? ` · ${f.user_id.slice(0, 8)}…` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'users' && (
            <section className="space-y-3">
              <SectionHeader
                icon={Users}
                title="User profiles"
                action={
                  <button
                    type="button"
                    onClick={() => void loadProfiles()}
                    className="text-[10px] font-mono accent-solid-text cursor-pointer"
                  >
                    Refresh
                  </button>
                }
              />
              <p className="text-[10px] text-[var(--fios-text-muted)] font-mono">
                Basic directory fields only (no API keys / address). Requires{' '}
                <code className="accent-solid-text">user_profiles_admin_read</code> in schema.
              </p>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fios-text-muted)]" />
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search name or id…"
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[11px] text-[var(--fios-text)] font-mono"
                />
              </div>
              {profilesLoading && (
                <div className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              )}
              {profilesError && <p className="text-xs text-rose-400 font-mono">{profilesError}</p>}
              {!profilesLoading && !profilesError && filteredUsers.length === 0 && (
                <p className="text-xs text-[var(--fios-text-muted)]">No profiles found.</p>
              )}
              <ul className="space-y-2">
                {filteredUsers.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border fios-border bg-[var(--fios-surface-2)] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--fios-text)] truncate">
                          {p.preferred_name || p.full_name || 'Unnamed'}
                        </p>
                        {p.full_name && p.preferred_name && (
                          <p className="text-[10px] text-[var(--fios-text-muted)] truncate">
                            {p.full_name}
                          </p>
                        )}
                        <p className="text-[9px] font-mono text-[var(--fios-text-muted)] mt-0.5">
                          {p.id.slice(0, 8)}… · {p.theme || '—'} · {p.accent_color || '—'}
                          {p.weekly_study_goal_hours != null
                            ? ` · ${p.weekly_study_goal_hours}h/wk`
                            : ''}
                        </p>
                      </div>
                      <p className="text-[9px] font-mono text-[var(--fios-text-muted)] shrink-0">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'moderation' && (
            <section className="space-y-3">
              <SectionHeader
                icon={Flag}
                title="Content moderation"
                action={
                  <button
                    type="button"
                    onClick={() => void loadFlags()}
                    className="text-[10px] font-mono accent-solid-text cursor-pointer"
                  >
                    Refresh
                  </button>
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Open flags" value={String(openFlagCount)} hint={`${flags.length} total`} />
                <StatCard
                  label="Queue"
                  value={flagsLoading ? '…' : flagsError ? 'err' : 'live'}
                  hint={flagsError ? 'apply SQL' : 'content_flags'}
                />
              </div>

              {flagsError && <p className="text-xs text-rose-400 font-mono">{flagsError}</p>}

              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fios-text-muted)]" />
                  <input
                    value={flagQuery}
                    onChange={(e) => setFlagQuery(e.target.value)}
                    placeholder="Search flags…"
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[11px] text-[var(--fios-text)] font-mono"
                  />
                </div>
                <select
                  value={flagStatus}
                  onChange={(e) => setFlagStatus(e.target.value as FlagStatusFilter)}
                  className="rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[10px] font-mono text-[var(--fios-text)] px-2 py-1.5 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              {flagsLoading && (
                <div className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              )}
              {!flagsLoading && !flagsError && filteredFlags.length === 0 && (
                <p className="text-xs text-[var(--fios-text-muted)]">No flags in this filter.</p>
              )}

              <ul className="space-y-2">
                {filteredFlags.map((f) => (
                  <li
                    key={f.id}
                    className={`rounded-xl border p-3 space-y-1.5 ${
                      f.status === 'open'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : f.status === 'resolved'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'fios-border bg-[var(--fios-surface-2)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--fios-text)] truncate">
                          {f.target_label || '(untitled)'}
                        </p>
                        <p className="text-[9px] font-mono text-[var(--fios-text-muted)]">
                          {f.target_type}
                          {f.target_id ? ` · ${f.target_id.slice(0, 8)}…` : ''} · {f.reason} ·{' '}
                          <span className="uppercase">{f.status}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {f.status === 'open' && (
                          <>
                            <button
                              type="button"
                              title="Resolve"
                              onClick={async () => {
                                try {
                                  const updated = await setContentFlagStatus(f.id, 'resolved');
                                  setFlags((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
                                  logAdminAction('flag_resolve', f.id.slice(0, 8));
                                  refreshAudit();
                                  toast('Flag resolved', 'success');
                                } catch (err: any) {
                                  toast(err.message || 'Resolve failed', 'error');
                                }
                              }}
                              className="text-emerald-400 cursor-pointer p-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Dismiss"
                              onClick={async () => {
                                try {
                                  const updated = await setContentFlagStatus(f.id, 'dismissed');
                                  setFlags((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
                                  logAdminAction('flag_dismiss', f.id.slice(0, 8));
                                  refreshAudit();
                                  toast('Flag dismissed', 'info');
                                } catch (err: any) {
                                  toast(err.message || 'Dismiss failed', 'error');
                                }
                              }}
                              className="text-amber-400 cursor-pointer p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={async () => {
                            try {
                              await deleteContentFlag(f.id);
                              setFlags((prev) => prev.filter((x) => x.id !== f.id));
                              logAdminAction('flag_delete', f.id.slice(0, 8));
                              refreshAudit();
                              toast('Flag deleted', 'info');
                            } catch (err: any) {
                              toast(err.message || 'Delete failed', 'error');
                            }
                          }}
                          className="text-rose-400 cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {f.details && (
                      <p className="text-[11px] text-[var(--fios-text)] whitespace-pre-wrap leading-relaxed">
                        {f.details}
                      </p>
                    )}
                    <p className="text-[9px] font-mono text-[var(--fios-text-muted)]">
                      {new Date(f.created_at).toLocaleString()}
                      {f.reporter_id ? ` · reporter ${f.reporter_id.slice(0, 8)}…` : ''}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3 space-y-2">
                <p className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Create flag
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newFlagType}
                    onChange={(e) => setNewFlagType(e.target.value as FlagTargetType)}
                    className="rounded-lg border fios-border bg-[var(--fios-surface)] text-[10px] font-mono text-[var(--fios-text)] px-2 py-1.5 cursor-pointer"
                  >
                    {FLAG_TARGET_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newFlagReason}
                    onChange={(e) => setNewFlagReason(e.target.value)}
                    className="rounded-lg border fios-border bg-[var(--fios-surface)] text-[10px] font-mono text-[var(--fios-text)] px-2 py-1.5 cursor-pointer"
                  >
                    {FLAG_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={newFlagLabel}
                  onChange={(e) => setNewFlagLabel(e.target.value)}
                  placeholder="Label / title"
                  className="w-full rounded-lg border fios-border bg-[var(--fios-surface)] text-[11px] text-[var(--fios-text)] px-2 py-1.5"
                />
                <textarea
                  value={newFlagDetails}
                  onChange={(e) => setNewFlagDetails(e.target.value)}
                  placeholder="Details…"
                  rows={2}
                  className="w-full rounded-lg border fios-border bg-[var(--fios-surface)] text-[11px] text-[var(--fios-text)] px-2 py-1.5 resize-none"
                />
                <button
                  type="button"
                  disabled={flagBusy || !newFlagLabel.trim()}
                  onClick={async () => {
                    setFlagBusy(true);
                    try {
                      const created = await createAdminFlag({
                        targetType: newFlagType,
                        targetLabel: newFlagLabel,
                        reason: newFlagReason,
                        details: newFlagDetails,
                      });
                      setFlags((prev) => [created, ...prev]);
                      setNewFlagLabel('');
                      setNewFlagDetails('');
                      logAdminAction('flag_create', created.id.slice(0, 8));
                      refreshAudit();
                      toast('Flag created', 'success');
                    } catch (err: any) {
                      toast(err.message || 'Create failed', 'error');
                    } finally {
                      setFlagBusy(false);
                    }
                  }}
                  className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-[10px] font-black uppercase cursor-pointer disabled:opacity-50"
                >
                  {flagBusy ? 'Saving…' : 'Add to queue'}
                </button>
              </div>

              <ul className="space-y-1.5 text-xs text-[var(--fios-text-muted)]">
                <li className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
                  <span>User-reported content queue</span>
                  <span className="font-mono text-[10px] text-emerald-400">LIVE</span>
                </li>
                <li className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
                  <span>Automated abuse signals</span>
                  <span className="font-mono text-[10px] accent-solid-text">PLACEHOLDER</span>
                </li>
              </ul>
            </section>
          )}

          {section === 'holidays' && (
            <section className="space-y-3">
              <SectionHeader icon={Palette} title="Holiday theme preview" />
              <p className="text-[10px] text-[var(--fios-text-muted)] font-mono">
                Session-only override — applies holiday gradient palette + festive icons/ambience.
                Does not change saved accent. Clear to return to calendar day-auto.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ADMIN_HOLIDAY_PREVIEWS.map((p) => {
                  const active = holidayTheme?.themeFamily === p.themeFamily;
                  return (
                    <button
                      key={p.themeFamily}
                      type="button"
                      onClick={() => {
                        previewHolidayTheme(p);
                        logAdminAction('holiday_preview', p.themeFamily);
                        refreshAudit();
                        toast(`${p.name} theme applied`, 'success');
                      }}
                      className={`text-left rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        active
                          ? 'accent-border bg-[var(--fios-surface-2)]'
                          : 'fios-border bg-[var(--fios-surface-2)] hover:accent-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                          style={{
                            background: `linear-gradient(135deg, ${p.from}, ${p.via}, ${p.to})`,
                          }}
                          aria-hidden
                        />
                        <HolidayMotif
                          themeFamily={p.themeFamily}
                          className="accent-solid-text shrink-0"
                          size={16}
                        />
                        <span className="text-[11px] font-bold text-[var(--fios-text)] truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-[var(--fios-text-muted)]">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  previewHolidayTheme(null);
                  logAdminAction('holiday_preview_clear');
                  refreshAudit();
                  toast('Holiday preview cleared', 'info');
                }}
                className="text-[10px] font-mono accent-solid-text cursor-pointer"
              >
                Clear holiday preview
              </button>
            </section>
          )}

          {section === 'push' && (
            <section className="space-y-3">
              <SectionHeader icon={Bell} title="Class reminders / Web Push" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <StatCard
                  label="VAPID"
                  value={vapid == null ? '…' : vapid.configured ? 'Configured' : 'Missing'}
                  hint={vapid?.detail}
                />
                <StatCard
                  label="Notification API"
                  value={
                    typeof Notification === 'undefined'
                      ? 'n/a'
                      : Notification.permission
                  }
                  hint={
                    typeof navigator !== 'undefined' && 'serviceWorker' in navigator
                      ? 'SW supported'
                      : 'No service worker'
                  }
                />
              </div>
              <p className="text-[10px] text-[var(--fios-text-muted)] font-mono leading-relaxed">
                Local reminders work without VAPID. Server push needs{' '}
                <code className="accent-solid-text">VAPID_*</code> on the API host. Test uses{' '}
                <code className="accent-solid-text">POST /api/push/test</code> for this browser
                subscription (or local Notification fallback).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={() => void handleTestPush()}
                  className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-[10px] font-black uppercase cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {pushBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  Test push (this device)
                </button>
                <button
                  type="button"
                  onClick={() => void refreshSystem()}
                  className="px-3 py-2 rounded-lg border fios-border text-[10px] font-mono accent-solid-text cursor-pointer"
                >
                  Re-check VAPID
                </button>
              </div>
            </section>
          )}

          {section === 'system' && (
            <section className="space-y-3">
              <SectionHeader
                icon={Settings2}
                title="System / config"
                action={
                  <button
                    type="button"
                    onClick={() => void refreshSystem()}
                    className="text-[10px] font-mono accent-solid-text cursor-pointer"
                  >
                    Refresh
                  </button>
                }
              />
              <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-3 space-y-1">
                <p className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> API /health
                </p>
                <pre className="text-[10px] font-mono text-[var(--fios-text-muted)] whitespace-pre-wrap">
                  {[
                    `url: ${health?.url || '—'}`,
                    `ok: ${health?.ok ?? '—'}`,
                    `service: ${health?.service || '—'}`,
                    `version: ${health?.version || '—'}`,
                    `latency: ${health?.latencyMs != null ? `${health.latencyMs}ms` : '—'}`,
                    health?.error ? `error: ${health.error}` : null,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                </pre>
              </div>
              <ul className="space-y-1.5">
                {envItems.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-start justify-between gap-2 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-[var(--fios-text)]">{item.label}</p>
                      <p className="text-[9px] font-mono text-[var(--fios-text-muted)] truncate">
                        {item.detail}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase shrink-0 ${
                        item.ok ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {item.ok ? 'ok' : 'check'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-[var(--fios-text-muted)] font-mono">
                No global feature-flag store — user prefs live per-profile{' '}
                <code className="accent-solid-text">prefs</code> jsonb.
              </p>
              <ul className="space-y-1.5 text-xs text-[var(--fios-text-muted)]">
                <li className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
                  <span>iOS App Store review checklist</span>
                  <span className="font-mono text-[10px] accent-solid-text">STUB</span>
                </li>
                <li className="flex items-center justify-between bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2">
                  <span>Google Play data safety form</span>
                  <span className="font-mono text-[10px] accent-solid-text">STUB</span>
                </li>
              </ul>
            </section>
          )}

          {section === 'support' && (
            <section className="space-y-3">
              <SectionHeader icon={Inbox} title="Support inbox" />
              <div className="rounded-xl border fios-border bg-[var(--fios-surface-2)] p-4 space-y-2">
                <p className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)]">
                  Mode · {support.mode}
                </p>
                <p className="text-sm font-bold text-[var(--fios-text)] break-all">{support.email}</p>
                <p className="text-[11px] text-[var(--fios-text-muted)] leading-relaxed">
                  {support.note}
                </p>
                <a
                  href={`mailto:${encodeURIComponent(support.email)}`}
                  className="inline-flex text-[10px] font-mono accent-solid-text hover:underline"
                >
                  Open mailto
                </a>
              </div>
            </section>
          )}

          {section === 'audit' && (
            <section className="space-y-3">
              <SectionHeader
                icon={ScrollText}
                title="Session activity"
                action={
                  <button
                    type="button"
                    onClick={() => {
                      clearAdminAudit();
                      refreshAudit();
                      toast('Audit cleared', 'info');
                    }}
                    className="text-[10px] font-mono accent-solid-text cursor-pointer"
                  >
                    Clear
                  </button>
                }
              />
              <p className="text-[10px] text-[var(--fios-text-muted)] font-mono">
                Browser session only (sessionStorage) — no server audit table.
              </p>
              {audit.length === 0 && (
                <p className="text-xs text-[var(--fios-text-muted)]">No actions logged yet.</p>
              )}
              <ul className="space-y-1.5">
                {audit.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border fios-border bg-[var(--fios-surface-2)] px-3 py-2 text-[10px] font-mono"
                  >
                    <span className="text-[var(--fios-text-muted)]">
                      {new Date(e.at).toLocaleTimeString()}
                    </span>{' '}
                    <span className="accent-solid-text">{e.action}</span>
                    {e.detail ? (
                      <span className="text-[var(--fios-text-muted)]"> · {e.detail}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'danger' && (
            <section className="space-y-3">
              <SectionHeader icon={AlertTriangle} title="Danger zone" />
              <p className="text-[10px] text-[var(--fios-text-muted)] font-mono leading-relaxed">
                Prefer soft, reversible actions. Destructive deletes require typed confirmation.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const { cleared } = clearLocalCachesSoft();
                    refreshAudit();
                    toast(
                      cleared.length ? `Cleared ${cleared.length} session key(s)` : 'Nothing to clear',
                      'info'
                    );
                  }}
                  className="w-full text-left rounded-xl border fios-border bg-[var(--fios-surface-2)] px-3 py-2.5 cursor-pointer hover:accent-border"
                >
                  <p className="text-xs font-bold text-[var(--fios-text)]">Clear soft session caches</p>
                  <p className="text-[9px] font-mono text-[var(--fios-text-muted)]">
                    Reminder fired-ids + session audit log on this device
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    previewHolidayTheme(null);
                    logAdminAction('holiday_preview_clear', 'danger');
                    refreshAudit();
                    toast('Holiday preview cleared', 'info');
                  }}
                  className="w-full text-left rounded-xl border fios-border bg-[var(--fios-surface-2)] px-3 py-2.5 cursor-pointer hover:accent-border"
                >
                  <p className="text-xs font-bold text-[var(--fios-text)]">Clear holiday preview</p>
                  <p className="text-[9px] font-mono text-[var(--fios-text-muted)]">
                    Soft — restores calendar day-auto / saved accent
                  </p>
                </button>
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 space-y-2">
                  <p className="text-xs font-bold text-rose-300">Delete all loaded feedback</p>
                  <p className="text-[9px] font-mono text-[var(--fios-text-muted)]">
                    Permanent. Type <code className="text-rose-300">DELETE FEEDBACK</code> then
                    confirm.
                  </p>
                  <input
                    value={dangerConfirm}
                    onChange={(e) => setDangerConfirm(e.target.value)}
                    placeholder="DELETE FEEDBACK"
                    className="w-full px-2 py-1.5 rounded-lg border border-rose-500/30 bg-[var(--fios-surface)] text-[11px] font-mono text-[var(--fios-text)]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleDeleteAllFeedback()}
                    className="px-3 py-2 rounded-lg bg-rose-600/80 text-white text-[10px] font-black uppercase cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Confirm bulk delete
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export function useIsAdmin(): boolean {
  const { profile } = useProfile();
  const adminUid = (import.meta.env.VITE_ADMIN_UID as string | undefined)?.trim() || '';
  return !!adminUid && profile?.id === adminUid;
}

export default AdminPanel;
