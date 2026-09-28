/**
 * Admin console helpers (client-side).
 * All Supabase reads still go through RLS — require fios_admins + VITE_ADMIN_UID gate in UI.
 */
import { apiUrl, getApiOrigin } from './apiBase';
import { fetchVapidPublicKey, loadReminderPrefs, sendTestPush } from './pushNotifications';
import { getSupportEmail } from './supportConfig';
import { supabase } from './supabase';
import type { FeedbackEntry } from './feedbackService';

export interface AdminProfileRow {
  id: string;
  preferred_name: string | null;
  full_name: string | null;
  accent_color: string | null;
  theme: string | null;
  weekly_study_goal_hours: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface HealthSnapshot {
  ok: boolean;
  version: string | null;
  service: string | null;
  latencyMs: number | null;
  error: string | null;
  url: string;
}

export interface EnvHealthItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface AdminAuditEntry {
  id: string;
  at: string;
  action: string;
  detail?: string;
}

const AUDIT_KEY = 'fios_admin_audit_v1';
const AUDIT_MAX = 80;

/** Safe profile columns only — never select gemini_api_key / address. */
const PROFILE_SELECT =
  'id, preferred_name, full_name, accent_color, theme, weekly_study_goal_hours, created_at, updated_at';

export function logAdminAction(action: string, detail?: string): void {
  try {
    const entry: AdminAuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      action,
      detail,
    };
    const prev = listAdminAudit();
    const next = [entry, ...prev].slice(0, AUDIT_MAX);
    sessionStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export function listAdminAudit(): AdminAuditEntry[] {
  try {
    const raw = sessionStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminAuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearAdminAudit(): void {
  try {
    sessionStorage.removeItem(AUDIT_KEY);
  } catch {
    /* noop */
  }
}

const PROFILE_SELECT_MINIMAL =
  'id, preferred_name, full_name, accent_color, theme, weekly_study_goal_hours';

const PROFILE_DIR_HINT =
  'Profile directory incomplete — run supabase/v3.6.1-user-profiles-directory.sql, reload PostgREST schema, and ensure your user is in fios_admins.';

function isRpcMissing(message: string | undefined): boolean {
  return /could not find the function|function .* does not exist|PGRST202/i.test(message || '');
}

/**
 * Operator profile directory.
 * Prefer admin_list_user_profiles RPC (SECURITY DEFINER) — direct SELECT under
 * RLS silently returns only the caller's row when user_profiles_admin_read is
 * missing/stale (looks like "one user" in the UI with no error).
 */
export async function listAdminProfiles(limit = 200): Promise<AdminProfileRow[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_user_profiles', {
    p_limit: limit,
  });

  if (!rpcError) {
    return (Array.isArray(rpcData) ? rpcData : []) as AdminProfileRow[];
  }

  if (!isRpcMissing(rpcError.message)) {
    throw new Error(rpcError.message || PROFILE_DIR_HINT);
  }

  // RPC missing (SQL not applied yet) → direct select; may still be owner-only
  // until v3.6.1 SQL is run (symptom: exactly one row, no PostgREST error).
  const primary = await supabase
    .from('user_profiles')
    .select(PROFILE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!primary.error) {
    return (primary.data || []) as AdminProfileRow[];
  }

  const msg = primary.error.message || '';
  const missingCreated =
    /created_at/i.test(msg) || /column .* does not exist/i.test(msg);

  if (!missingCreated) {
    throw new Error(msg || PROFILE_DIR_HINT);
  }

  const fallback = await supabase
    .from('user_profiles')
    .select(PROFILE_SELECT_MINIMAL)
    .limit(limit);

  if (fallback.error) {
    throw new Error(fallback.error.message || PROFILE_DIR_HINT);
  }

  return ((fallback.data || []) as Omit<AdminProfileRow, 'created_at' | 'updated_at'>[]).map(
    (row) => ({
      ...row,
      created_at: null,
      updated_at: null,
    })
  );
}

export async function fetchApiHealth(): Promise<HealthSnapshot> {
  const origin = getApiOrigin();
  const url = origin ? `${origin}/health` : '/health';
  const started = performance.now();
  try {
    const res = await fetch(url, { method: 'GET' });
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return {
        ok: false,
        version: null,
        service: null,
        latencyMs,
        error: `HTTP ${res.status}`,
        url,
      };
    }
    const data = (await res.json()) as { ok?: boolean; version?: string; service?: string };
    return {
      ok: data?.ok !== false,
      version: typeof data?.version === 'string' ? data.version : null,
      service: typeof data?.service === 'string' ? data.service : null,
      latencyMs,
      error: null,
      url,
    };
  } catch (err: any) {
    return {
      ok: false,
      version: null,
      service: null,
      latencyMs: null,
      error: err?.message || 'Health check failed',
      url,
    };
  }
}

export async function checkVapidConfigured(): Promise<{ configured: boolean; detail: string }> {
  const key = await fetchVapidPublicKey();
  if (key) return { configured: true, detail: `Public key available (${key.slice(0, 12)}…)` };
  return {
    configured: false,
    detail: 'GET /api/push/vapid-public-key returned no key (503 or network).',
  };
}

export function collectEnvHealth(): EnvHealthItem[] {
  const apiOrigin = getApiOrigin();
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const adminUid = String(import.meta.env.VITE_ADMIN_UID || '').trim();
  const support = getSupportEmail();
  const demo = String(import.meta.env.VITE_DEMO_MODE || '').trim() === 'true';
  const reminders = loadReminderPrefs();

  return [
    {
      key: 'api',
      label: 'API origin',
      ok: true,
      detail: apiOrigin || 'same-origin (relative /api)',
    },
    {
      key: 'supabase_url',
      label: 'Supabase URL',
      ok: !!supabaseUrl,
      detail: supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').slice(0, 48) : 'missing VITE_SUPABASE_URL',
    },
    {
      key: 'supabase_anon',
      label: 'Supabase anon key',
      ok: !!supabaseAnon,
      detail: supabaseAnon ? 'set' : 'missing VITE_SUPABASE_ANON_KEY',
    },
    {
      key: 'admin_uid',
      label: 'Admin UID gate',
      ok: !!adminUid,
      detail: adminUid ? `${adminUid.slice(0, 8)}…` : 'VITE_ADMIN_UID unset',
    },
    {
      key: 'support',
      label: 'Support inbox',
      ok: !!support,
      detail: support,
    },
    {
      key: 'demo',
      label: 'Demo mode',
      ok: !demo,
      detail: demo ? 'VITE_DEMO_MODE=true (sample data)' : 'off',
    },
    {
      key: 'reminders',
      label: 'Local class reminders',
      ok: true,
      detail: reminders.enabled
        ? `enabled · ${reminders.leadMinutes}m lead`
        : 'disabled on this device',
    },
  ];
}

export interface OverviewStats {
  feedbackTotal: number;
  feedbackUnresolved: number;
  feedbackAvgRating: number | null;
  profileCount: number | null;
  profilesError: string | null;
  clientVersion: string;
}

export function computeFeedbackStats(rows: FeedbackEntry[]): Pick<
  OverviewStats,
  'feedbackTotal' | 'feedbackUnresolved' | 'feedbackAvgRating'
> {
  const feedbackTotal = rows.length;
  const feedbackUnresolved = rows.filter((r) => !r.resolved_at).length;
  const feedbackAvgRating =
    feedbackTotal === 0
      ? null
      : Math.round((rows.reduce((s, r) => s + (r.rating || 0), 0) / feedbackTotal) * 10) / 10;
  return { feedbackTotal, feedbackUnresolved, feedbackAvgRating };
}

export async function loadOverviewStats(feedback: FeedbackEntry[]): Promise<OverviewStats> {
  const fb = computeFeedbackStats(feedback);
  let profileCount: number | null = null;
  let profilesError: string | null = null;
  try {
    const { data: rpcCount, error: rpcError } = await supabase.rpc('admin_count_user_profiles');
    if (!rpcError && (typeof rpcCount === 'number' || typeof rpcCount === 'string')) {
      profileCount = Number(rpcCount);
    } else if (rpcError && !isRpcMissing(rpcError.message)) {
      throw new Error(rpcError.message);
    } else {
      // RPC missing → head count (may under-count without admin read policy).
      const { count, error } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
      profileCount = typeof count === 'number' ? count : null;
    }
  } catch (err: any) {
    profilesError = err?.message || PROFILE_DIR_HINT;
  }
  return {
    ...fb,
    profileCount,
    profilesError,
    clientVersion: '3.6.4',
  };
}

export async function runAdminTestPush(): Promise<{ ok: boolean; message: string }> {
  const result = await sendTestPush();
  logAdminAction('test_push', result.message);
  return result;
}

/** Soft danger helpers — local only. */
export function clearLocalCachesSoft(): { cleared: string[] } {
  const keys = [
    'fios_class_reminders_fired',
    'fios_admin_audit_v1',
  ];
  const cleared: string[] = [];
  for (const k of keys) {
    try {
      if (sessionStorage.getItem(k) != null) {
        sessionStorage.removeItem(k);
        cleared.push(k);
      }
    } catch {
      /* noop */
    }
  }
  logAdminAction('clear_local_caches', cleared.join(', ') || 'nothing');
  return { cleared };
}

export function exportFeedbackJson(rows: FeedbackEntry[]): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fios-feedback-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  logAdminAction('export_feedback', `${rows.length} rows`);
}

/** Support messages are emailed via Resend/SendGrid — not stored in Supabase. */
export function supportInboxStatus(): { mode: 'resend-only'; email: string; note: string } {
  return {
    mode: 'resend-only',
    email: getSupportEmail(),
    note: 'Support form POSTs to /api/support and emails the operator inbox. No support_messages table exists.',
  };
}

export { apiUrl };
