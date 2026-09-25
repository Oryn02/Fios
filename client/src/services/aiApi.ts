import { getGeminiKey } from '../lib/geminiKey';

export interface SummaryResult {
  summary: string;
  glossary: { term: string; definition: string }[];
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
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
    throw new Error(`Server returned non-JSON output (Status ${response.status}).`);
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

// Validate a candidate key directly (used by the Settings "Test key" button).
export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  const response = await fetch('/api/validate-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  const data = await response.json().catch(() => ({ valid: false }));
  return !!data.valid;
}
