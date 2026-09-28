/** Shared Gemini BYO-key UX helpers — locked-screen copy, latency detection, docs links. */

export const AI_STUDIO_KEY_URL = 'https://aistudio.google.com/app/apikey';
export const AI_STUDIO_HOME_URL = 'https://aistudio.google.com/';
/** Google AI / Gemini API billing & quota docs */
export const GEMINI_BILLING_DOCS_URL = 'https://ai.google.dev/gemini-api/docs/billing';
export const GEMINI_RATE_LIMIT_DOCS_URL = 'https://ai.google.dev/gemini-api/docs/rate-limits';

/** Friendly message used when a request times out or free-tier capacity stalls. */
export const GEMINI_SLOW_ERROR =
  'Gemini is taking a long time (or timed out). Free-tier keys often hit rate limits, shared quota, cold starts, and lower priority — try again in a moment, or use a paid Gemini API key for higher quotas and lower latency.';

/** Client-side abort for long Gemini proxy calls (ms). */
export const GEMINI_FETCH_TIMEOUT_MS = 90_000;

/**
 * fetch() with AbortController timeout. On abort, throws GEMINI_SLOW_ERROR
 * so the UI can show free-tier latency guidance.
 */
export async function fetchWithGeminiTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = GEMINI_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';
    if (name === 'AbortError' || controller.signal.aborted) {
      throw new Error(GEMINI_SLOW_ERROR);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const LATENCY_PATTERNS = [
  /taking a long time/i,
  /timed?\s*out/i,
  /timeout/i,
  /deadline exceeded/i,
  /etimedout/i,
  /econnreset/i,
  /econnaborted/i,
  /network.?error/i,
  /fetch failed/i,
  /429/,
  /rate.?limit/i,
  /resource.?exhausted/i,
  /quota/i,
  /overloaded/i,
  /unavailable/i,
  /high demand/i,
  /try again later/i,
  /503/,
  /504/,
  /slow/i,
];

/** True when an error string looks like free-tier latency / rate-limit / timeout. */
export function isGeminiLatencyError(message: unknown): boolean {
  const text = typeof message === 'string' ? message : message instanceof Error ? message.message : String(message ?? '');
  if (!text.trim()) return false;
  return LATENCY_PATTERNS.some((re) => re.test(text));
}

/**
 * Map raw Gemini / network errors into a clearer client message.
 * Leaves unrelated errors unchanged.
 */
export function friendlyGeminiError(message: unknown, fallback = 'AI request failed. Check your Gemini key in Settings and try again.'): string {
  const text = typeof message === 'string' ? message : message instanceof Error ? message.message : String(message ?? '');
  if (!text.trim()) return fallback;
  if (isGeminiLatencyError(text)) {
    if (/taking a long time/i.test(text)) return text;
    return GEMINI_SLOW_ERROR;
  }
  return text;
}
