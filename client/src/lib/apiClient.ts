import { getGeminiKey } from './geminiKey';

/**
 * Shared JSON POST helper for Express `/api/*` routes.
 * Distinguishes SPA/HTML 404s from real JSON API errors.
 */
export async function postApiJson<T>(url: string, body: Record<string, unknown> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, apiKey: getGeminiKey() }),
    });
  } catch {
    throw new Error('Network error — could not reach the API. Is the Express server running on port 5000?');
  }

  const text = await response.text();
  const trimmed = (text || '').trim();
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  let data: any = {};
  if (looksJson) {
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error(`Server returned invalid JSON (Status ${response.status}).`);
    }
  } else if (response.status === 404) {
    throw new Error(
      'API route not found (404). The /api study engine is unreachable — check the Vercel API bridge or run `npm run dev` in server/.'
    );
  } else if (!response.ok) {
    throw new Error(`Server returned non-JSON output (Status ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Server error: ${response.status}`);
  }
  return data as T;
}
