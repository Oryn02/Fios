import { apiUrl } from '../lib/apiBase';
import { supabase } from '../lib/supabase';
import { getGeminiKey } from '../lib/geminiKey';

/** Bearer + optional BYO Gemini key headers for SaaS routes. */
export async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const gemini = getGeminiKey();
  if (gemini) headers['x-gemini-key'] = gemini;
  return headers;
}

export async function saasFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = await authHeaders(init.headers);
  return fetch(apiUrl(path), { ...init, headers });
}

export async function readJson<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Invalid JSON' };
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data as T;
}
