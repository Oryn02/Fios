import type { CodeExamType, CodeLanguage } from '../types/db';
import { postApiJson } from '../lib/apiClient';

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

export function generateCodeExam(params: {
  language: CodeLanguage;
  examType: CodeExamType;
  topic?: string;
  customPrompt?: string;
  difficulty?: string;
}): Promise<GeneratedCodeExam> {
  return postApiJson<GeneratedCodeExam>('/api/generate/code-exam', params as unknown as Record<string, unknown>);
}

export function gradeCodeExam(params: {
  language: CodeLanguage;
  prompt: string;
  solutionCode: string;
  userCode: string;
}): Promise<CodeGradeResult> {
  return postApiJson<CodeGradeResult>('/api/grade/code-exam', params as unknown as Record<string, unknown>);
}
