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
