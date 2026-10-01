import { saasFetch, readJson } from './saasFetch';
import { getGeminiKey } from '../lib/geminiKey';

export async function saasAiGenerate(prompt: string, opts?: { system?: string; preferPro?: boolean }) {
  const res = await saasFetch('/api/ai/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      system: opts?.system,
      preferPro: opts?.preferPro,
      apiKey: getGeminiKey(),
    }),
  });
  return readJson<{ text: string; model: string }>(res);
}

export async function oralExamTurn(input: {
  material: string;
  history?: { role: 'examiner' | 'student'; text: string }[];
  studentAnswer?: string;
}) {
  const res = await saasFetch('/api/ai/oral-exam', {
    method: 'POST',
    body: JSON.stringify({ ...input, apiKey: getGeminiKey() }),
  });
  return readJson<{
    question: string;
    rubricHint: string;
    followUp?: string;
    score: number;
    feedback: string;
    model: string;
  }>(res);
}

export async function occlusionMask(input: {
  imageBase64: string;
  mimeType?: string;
  hint?: string;
}) {
  const res = await saasFetch('/api/ai/occlusion-mask', {
    method: 'POST',
    body: JSON.stringify({ ...input, apiKey: getGeminiKey() }),
  });
  return readJson<{
    regions: { id: string; label: string; x: number; y: number; w: number; h: number }[];
    model: string;
  }>(res);
}
