import { FlashcardResponse } from '../types/api';
import { postApiJson } from '../lib/apiClient';

export async function generateFlashcards(studyNotes: string): Promise<FlashcardResponse> {
  const data = await postApiJson<FlashcardResponse | { cards?: unknown }>('/api/generate/flashcards', {
    text: studyNotes,
  });
  return data as FlashcardResponse;
}
