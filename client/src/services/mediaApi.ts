import { saasFetch, readJson, authHeaders } from './saasFetch';
import { apiUrl } from '../lib/apiBase';
import { getGeminiKey } from '../lib/geminiKey';

export async function generateAudioRecap(input: {
  text?: string;
  source?: string;
}): Promise<{ blob: Blob; mimeType: string } | { mimeType: string; audioBase64: string; text: string; provider: string }> {
  const headers = await authHeaders();
  const res = await fetch(apiUrl('/api/media/audio-recap?format=json'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...input, apiKey: getGeminiKey(), format: 'json' }),
  });
  return readJson(res);
}

export async function fetchAudioRecapBlob(input: { text?: string; source?: string }): Promise<Blob> {
  const headers = await authHeaders();
  const res = await fetch(apiUrl('/api/media/audio-recap'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...input, apiKey: getGeminiKey() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Audio recap failed (${res.status})`);
  }
  return res.blob();
}
