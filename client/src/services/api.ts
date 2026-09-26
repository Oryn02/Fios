import { FlashcardResponse } from '../types/api';
import { getGeminiKey } from '../lib/geminiKey';
import { apiUrl } from '../lib/apiBase';

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

  return data as FlashcardResponse;
}
