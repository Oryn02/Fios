import type { CodeExamType, CodeLanguage } from '../types/db';
import { getGeminiKey } from '../lib/geminiKey';
import { apiUrl } from '../lib/apiBase';
import { fetchWithGeminiTimeout, friendlyGeminiError } from '../lib/geminiUx';

export interface GeneratedCodeExam {
  title: string;
  language: string;
  examType: string;
  prompt: string;
  starterCode: string;
  solutionCode: string;
  expectedOutput?: string;
  explanation?: string;
}

export interface CodeGradeResult {
  correct: boolean;
  score: number;
  feedback: string;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = apiUrl(path);
  const response = await fetchWithGeminiTimeout(url, {
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

  if (!response.ok) {
    throw new Error(friendlyGeminiError(data?.error || `Server error: ${response.status}`));
  }
  return data as T;
}

export function generateCodeExam(params: {
  language: CodeLanguage;
  examType: CodeExamType;
  topic?: string;
  customPrompt?: string;
  difficulty?: string;
}): Promise<GeneratedCodeExam> {
  return postJson<GeneratedCodeExam>('/api/generate/code-exam', params);
}

export function gradeCodeExam(params: {
  language: CodeLanguage;
  prompt: string;
  solutionCode: string;
  userCode: string;
}): Promise<CodeGradeResult> {
  return postJson<CodeGradeResult>('/api/grade/code-exam', params);
}
