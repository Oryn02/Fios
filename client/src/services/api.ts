import { Flashcard, FlashcardResponse } from '../types/api';
import { getGeminiKey } from '../lib/geminiKey';
import { apiUrl } from '../lib/apiBase';

/** Normalize Gemini / proxy payloads into a flat Flashcard[]. */
export function normalizeFlashcards(payload: unknown): Flashcard[] {
  if (!payload) return [];
  const root = payload as any;
  const rawList = Array.isArray(root)
    ? root
    : Array.isArray(root.cards)
      ? root.cards
      : Array.isArray(root.flashcards)
        ? root.flashcards
        : [];

  return rawList
    .map((c: any) => {
      if (!c || typeof c !== 'object') return null;
      const front = String(c.front ?? c.question ?? c.q ?? '').trim();
      const back = String(c.back ?? c.answer ?? c.a ?? '').trim();
      if (!front && !back) return null;
      return {
        front: front || '…',
        back: back || '…',
        id: typeof c.id === 'string' ? c.id : undefined,
        ease_factor: typeof c.ease_factor === 'number' ? c.ease_factor : undefined,
        interval: typeof c.interval === 'number' ? c.interval : undefined,
        repetitions: typeof c.repetitions === 'number' ? c.repetitions : undefined,
        next_review: c.next_review ?? null,
      } as Flashcard;
    })
    .filter(Boolean) as Flashcard[];
}

export async function generateFlashcards(studyNotes: string): Promise<FlashcardResponse> {
  const path = '/api/generate/flashcards';
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: studyNotes, apiKey: getGeminiKey() }),
  });

  const responseText = await response.text();
  let data: any = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(
      `Server returned non-JSON output (Status ${response.status}) for ${path}`
    );
  }

  if (!response.ok) {
    throw new Error(data?.error || `Server error: ${response.status}`);
  }

  const cards = normalizeFlashcards(data);
  if (!cards.length) {
    throw new Error('No flashcards were returned. Try longer notes or regenerate.');
  }
  return { cards };
}
