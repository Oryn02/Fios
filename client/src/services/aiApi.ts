import { postApiJson } from '../lib/apiClient';
import { getGeminiKey } from '../lib/geminiKey';

export interface SummaryResult {
  summary: string;
  glossary: { term: string; definition: string }[];
}

export function summarizeText(text: string): Promise<SummaryResult> {
  return postApiJson<SummaryResult>('/api/summarize', { text });
}

/** POST /api/tutor — grounded AI tutor chat */
export function askTutor(question: string, context: string): Promise<{ answer: string }> {
  return postApiJson<{ answer: string }>('/api/tutor', { question, context });
}

export interface RecallResult {
  accuracy: number;
  concepts: { concept: string; status: 'covered' | 'partial' | 'missed'; note?: string }[];
}

export function evaluateRecall(topic: string, userText: string, context: string): Promise<RecallResult> {
  return postApiJson<RecallResult>('/api/active-recall', { topic, userText, context });
}

export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const data = await postApiJson<{ valid?: boolean }>('/api/validate-key', { apiKey });
    return !!data.valid;
  } catch {
    // Fallback probe without throwing through postApiJson body merge issues
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey || getGeminiKey() }),
      });
      const text = await response.text();
      if (!text.trim().startsWith('{')) return false;
      return !!(JSON.parse(text) as { valid?: boolean }).valid;
    } catch {
      return false;
    }
  }
}
