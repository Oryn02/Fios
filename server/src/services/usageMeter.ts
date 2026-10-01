import { getSupabaseAdmin } from '../supabaseAdmin.js';

export type UsageRecordResult = {
  ok: boolean;
  billed: boolean;
  tokensUsed: number;
  tokensLimit: number;
  remaining: number;
  error?: string;
};

async function ensureUsageRow(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from('user_usage').select('*').eq('user_id', userId).maybeSingle();
  if (data) {
    // Reset monthly window if period rolled over
    const periodStart = data.period_start ? new Date(data.period_start) : null;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    if (periodStart && periodStart < monthStart) {
      const { data: reset } = await admin
        .from('user_usage')
        .update({
          tokens_used: 0,
          period_start: monthStart.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('*')
        .single();
      return reset || data;
    }
    return data;
  }
  const { data: inserted } = await admin
    .from('user_usage')
    .insert({ user_id: userId })
    .select('*')
    .single();
  return inserted;
}

/**
 * Check quota before a platform-key AI call. BYO (billed=false) skips enforcement.
 */
export async function assertWithinQuota(
  userId: string,
  estimatedTokens = 0,
  billed = true
): Promise<UsageRecordResult> {
  if (!billed) {
    return { ok: true, billed: false, tokensUsed: 0, tokensLimit: 0, remaining: Infinity };
  }
  const row = await ensureUsageRow(userId);
  if (!row) {
    // No service role — allow but do not meter
    return { ok: true, billed: true, tokensUsed: 0, tokensLimit: 500000, remaining: 500000 };
  }
  const used = Number(row.tokens_used) || 0;
  const limit = Number(row.tokens_limit) || 500000;
  const remaining = Math.max(0, limit - used);
  if (used + estimatedTokens > limit) {
    return {
      ok: false,
      billed: true,
      tokensUsed: used,
      tokensLimit: limit,
      remaining,
      error: 'Monthly AI token quota exceeded. Use a Bring-Your-Own Gemini key, or wait for the next period.',
    };
  }
  return { ok: true, billed: true, tokensUsed: used, tokensLimit: limit, remaining };
}

/**
 * Increment usage after a successful platform-key call.
 * BYO requests may pass billed=false to skip (or record analytics-only later).
 */
export async function recordUsage(
  userId: string,
  tokens: number,
  billed = true
): Promise<UsageRecordResult> {
  if (!billed || tokens <= 0) {
    return { ok: true, billed: false, tokensUsed: 0, tokensLimit: 0, remaining: Infinity };
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: true, billed: true, tokensUsed: 0, tokensLimit: 500000, remaining: 500000 };
  }
  const row = await ensureUsageRow(userId);
  const used = (Number(row?.tokens_used) || 0) + tokens;
  const limit = Number(row?.tokens_limit) || 500000;
  await admin
    .from('user_usage')
    .upsert({
      user_id: userId,
      tokens_used: used,
      updated_at: new Date().toISOString(),
    });
  return {
    ok: true,
    billed: true,
    tokensUsed: used,
    tokensLimit: limit,
    remaining: Math.max(0, limit - used),
  };
}

/** Rough token estimate from character length (≈4 chars/token). */
export function estimateTokensFromText(...parts: string[]): number {
  const len = parts.reduce((n, p) => n + (p?.length || 0), 0);
  return Math.max(1, Math.ceil(len / 4));
}
