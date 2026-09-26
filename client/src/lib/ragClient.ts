import { getGeminiKey } from './geminiKey';
import { chunkText } from './chunkText';
import { supabase } from './supabase';
import { IS_DEMO } from './demo';

export interface RagQueryResult {
  passages: string[];
  scores?: number[];
  raw?: unknown;
}

/**
 * Index a document's content into Supabase `note_chunks` (~500-word passages).
 * Replaces prior chunks for the same document_id. Soft-fails if table/RLS missing.
 */
export async function indexDocumentChunks(
  documentId: string,
  content: string
): Promise<{ indexed: number }> {
  if (IS_DEMO || !content?.trim()) return { indexed: 0 };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { indexed: 0 };

  const pieces = chunkText(content, 500, 50);
  if (pieces.length === 0) return { indexed: 0 };

  // Clear previous index for this document, then insert fresh rows
  await supabase.from('note_chunks').delete().eq('document_id', documentId).eq('user_id', user.id);

  const rows = pieces.map((contentText, chunk_index) => ({
    user_id: user.id,
    document_id: documentId,
    chunk_index,
    content: contentText,
  }));

  const { error } = await supabase.from('note_chunks').insert(rows);
  if (error) {
    console.warn('[rag] note_chunks index failed:', error.message);
    return { indexed: 0 };
  }
  return { indexed: rows.length };
}

/**
 * Load the signed-in user's indexed note passages from Supabase.
 */
export async function loadUserNoteChunks(limit = 200): Promise<string[]> {
  if (IS_DEMO) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('note_chunks')
    .select('content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[rag] note_chunks load failed:', error.message);
    return [];
  }
  return (data || []).map((r: { content?: string }) => r.content || '').filter(Boolean);
}

/**
 * Call the study-engine RAG endpoint.
 * When `chunks` / `text` are omitted, loads passages from Supabase `note_chunks`.
 */
export async function queryRag(params: {
  query: string;
  chunks?: string[];
  text?: string;
  k?: number;
}): Promise<RagQueryResult> {
  let chunks = params.chunks;
  let text = params.text;

  if ((!chunks || chunks.length === 0) && !text?.trim()) {
    chunks = await loadUserNoteChunks();
  }

  if ((!chunks || chunks.length === 0) && !text?.trim()) {
    return { passages: [] };
  }

  const response = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      chunks: chunks && chunks.length ? chunks : undefined,
      text: text?.trim() || undefined,
      topK: params.k ?? 5,
      apiKey: getGeminiKey(),
    }),
  });
  const bodyText = await response.text();
  let data: any = {};
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
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
