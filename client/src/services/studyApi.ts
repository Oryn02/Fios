import { saasFetch, readJson, authHeaders } from './saasFetch';
import { apiUrl } from '../lib/apiBase';

export async function fsrsReview(cardId: string, rating: 1 | 2 | 3 | 4, durationMs?: number) {
  const res = await saasFetch('/api/study/review', {
    method: 'POST',
    body: JSON.stringify({ cardId, rating, durationMs }),
  });
  return readJson<{
    cardId: string;
    next_review: string;
    interval: number;
    repetitions: number;
    fsrs_state: unknown;
    scheduler: string;
  }>(res);
}

export async function exportAnkiApkg(input: {
  title?: string;
  deckId?: string;
  cards?: { front: string; back: string }[];
}): Promise<Blob> {
  const headers = await authHeaders();
  const res = await fetch(apiUrl('/api/study/export/anki'), {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Export failed (${res.status})`);
  }
  return res.blob();
}

export async function runCodeCard(input: {
  language: string;
  code: string;
  expectedOutput?: string | null;
}): Promise<{ stdout?: string; stderr?: string; pass?: boolean; error?: string; [k: string]: any }> {
  const res = await saasFetch('/api/study/run-code', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function socraticTutor(input: {
  cardFront?: string;
  cardBack?: string;
  question?: string;
  answer?: string;
  history?: { role: string; content: string }[];
  message?: string;
  studentMessage?: string;
}): Promise<{ reply?: string; message?: string; done?: boolean; [k: string]: any }> {
  const res = await saasFetch('/api/study/socratic', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      studentMessage: input.studentMessage || input.message,
      cardFront: input.cardFront || input.question,
      cardBack: input.cardBack || input.answer,
    }),
  });
  return readJson(res);
}

export async function generateMnemonic(input: {
  term?: string;
  concept?: string;
  cardFront?: string;
  cardBack?: string;
}): Promise<{ acronym?: string; story?: string; rhyme?: string; [k: string]: any }> {
  const res = await saasFetch('/api/study/mnemonic', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function generateMindMap(input: {
  text?: string;
  title?: string;
}): Promise<{ nodes?: any[]; edges?: any[]; [k: string]: any }> {
  const res = await saasFetch('/api/mindmap/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function exportVaultModule(moduleCode: string): Promise<any> {
  const res = await saasFetch('/api/vault/export-module', {
    method: 'POST',
    body: JSON.stringify({ moduleCode }),
  });
  return readJson(res);
}

export async function lmsConnect(input: {
  provider: 'canvas' | 'moodle' | 'blackboard';
  baseUrl: string;
  token: string;
  displayName?: string;
}): Promise<any> {
  const res = await saasFetch('/api/lms/connect', {
    method: 'POST',
    body: JSON.stringify({
      provider: input.provider,
      baseUrl: input.baseUrl,
      accessToken: input.token,
      token: input.token,
      displayName: input.displayName,
    }),
  });
  return readJson(res);
}

export async function lmsListMaterials(connectionId?: string): Promise<any> {
  const q = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
  const res = await saasFetch(`/api/lms/materials${q}`);
  return readJson(res);
}

export async function lmsBuildWeeklyPrep(connectionId?: string): Promise<any> {
  const res = await saasFetch('/api/lms/weekly-prep', {
    method: 'POST',
    body: JSON.stringify({ connectionId }),
  });
  return readJson(res);
}

export async function importDeckRemote(
  kind: 'json' | 'csv' | 'quizlet' | 'notion' | 'remnote' | 'anki',
  payload: Record<string, unknown> | FormData
): Promise<{ title?: string; cards?: any[]; [k: string]: any }> {
  if (payload instanceof FormData) {
    const headers = await authHeaders();
    const h = { ...(headers as Record<string, string>) };
    delete h['Content-Type'];
    const res = await fetch(apiUrl(`/api/import/${kind}`), {
      method: 'POST',
      headers: h,
      body: payload,
    });
    return readJson(res);
  }
  const res = await saasFetch(`/api/import/${kind}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function voiceGrade(input: {
  front: string;
  back: string;
  spoken: string;
}): Promise<{ rating: 1 | 2 | 3 | 4; feedback: string; accuracy?: number }> {
  const res = await saasFetch('/api/study/voice-grade', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function studyElaborate(input: {
  front: string;
  back: string;
  priorTopic?: string;
}): Promise<{ why?: string; connection?: string; prompt?: string }> {
  const res = await saasFetch('/api/study/elaborate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function studyFeynman(input: {
  topic: string;
  explanation: string;
  history?: { role: string; content: string }[];
}): Promise<{ studentReply?: string; feedback?: string; accuracyScore?: number; [k: string]: any }> {
  const res = await saasFetch('/api/study/feynman', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function studyDualCode(input: {
  front: string;
  back: string;
}): Promise<{ iconHint?: string; diagramMermaid?: string; audioScript?: string }> {
  const res = await saasFetch('/api/study/dual-code', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function saveJol(input: {
  cardId: string;
  predicted: 1 | 2 | 3 | 4 | 5;
  actualSuccess?: boolean;
}): Promise<any> {
  const res = await saasFetch('/api/cognitive/jol', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function mockExamGenerate(input: {
  moduleCode: string;
  durationMin?: number;
  text?: string;
}): Promise<any> {
  const res = await saasFetch('/api/exam/mock-generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function mockExamGrade(input: {
  examId?: string;
  exam?: unknown;
  answers: Record<string, string>;
  difficulty?: string;
}): Promise<any> {
  const res = await saasFetch('/api/exam/mock-grade', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await readJson(res);
  try {
    const pct = Number(
      data?.percent ?? data?.score_percent ?? data?.accuracy ?? (data?.score != null ? data.score * 100 : NaN)
    );
    if (!Number.isNaN(pct)) {
      const { recordMockExamScore, recordAiGeneration } = await import('../lib/studyMilestones');
      const hard = String(input.difficulty || data?.difficulty || '').toLowerCase() === 'hard';
      recordMockExamScore(pct, { hard });
      recordAiGeneration(1);
    }
  } catch {
    /* optional */
  }
  return data;
}

export async function parseSyllabus(input: {
  text: string;
  moduleCode?: string;
  insertHints?: boolean;
}): Promise<any> {
  const res = await saasFetch('/api/syllabus/parse', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}
