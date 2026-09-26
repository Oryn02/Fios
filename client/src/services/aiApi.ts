import { getGeminiKey } from '../lib/geminiKey';
import { apiUrl } from '../lib/apiBase';

export interface SummaryResult {
  summary: string;
  glossary: { term: string; definition: string }[];
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = apiUrl(path);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, apiKey: getGeminiKey() }),
  });
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned non-JSON output (Status ${response.status}) for ${path}`);
  }
  if (!response.ok) throw new Error(data?.error || `Server error: ${response.status}`);
  return data as T;
}

export function summarizeText(text: string): Promise<SummaryResult> {
  return postJson<SummaryResult>('/api/summarize', { text });
}

export function askTutor(question: string, context: string): Promise<{ answer: string }> {
  return postJson<{ answer: string }>('/api/tutor', { question, context });
}

export interface RecallResult {
  accuracy: number;
  concepts: { concept: string; status: 'covered' | 'partial' | 'missed'; note?: string }[];
}

export function evaluateRecall(topic: string, userText: string, context: string): Promise<RecallResult> {
  return postJson<RecallResult>('/api/active-recall', { topic, userText, context });
}

export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  const response = await fetch(apiUrl('/api/validate-key'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  const data = await response.json().catch(() => ({ valid: false }));
  return !!data.valid;
}
