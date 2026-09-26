import { getGeminiKey } from './geminiKey';

export interface RagQueryResult {
  passages: string[];
  scores?: number[];
  raw?: unknown;
}

/**
 * Call the study-engine RAG endpoint.
 * Soft-fails are the caller's responsibility — this throws on hard HTTP errors.
 */
export async function queryRag(params: {
  query: string;
  chunks?: string[];
  k?: number;
}): Promise<RagQueryResult> {
  const response = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      chunks: params.chunks,
      k: params.k ?? 5,
      apiKey: getGeminiKey(),
    }),
  });
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`RAG returned non-JSON (Status ${response.status}).`);
  }
  if (!response.ok) throw new Error(data?.error || `RAG error: ${response.status}`);

  const passages: string[] =
    Array.isArray(data.passages) ? data.passages
    : Array.isArray(data.chunks) ? data.chunks.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).filter(Boolean)
    : Array.isArray(data.results) ? data.results.map((r: any) => r?.text || r?.content || '').filter(Boolean)
    : [];

  return { passages, scores: data.scores, raw: data };
}

/**
 * POST a PDF (and optional extracted text) to the server upload route.
 * Soft failures should be ignored by callers that already extracted text locally.
 */
export async function uploadPdfToServer(file: File, text?: string): Promise<{ ok: boolean; data?: unknown }> {
  const form = new FormData();
  form.append('file', file);
  if (text) form.append('text', text);
  const key = getGeminiKey();
  if (key) form.append('apiKey', key);

  try {
    const response = await fetch('/api/upload/pdf', {
      method: 'POST',
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, data };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: { error: String(err) } };
  }
}
