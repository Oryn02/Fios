import { FlashcardResponse } from '../types/api';

// Use a relative path so requests flow through the Vite dev proxy (and any
// production reverse-proxy) to the Express API rather than a hard-coded host.
const API_BASE_URL = '/api';

export async function generateFlashcards(studyNotes: string): Promise<FlashcardResponse> {
  const response = await fetch(`${API_BASE_URL}/generate/flashcards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: studyNotes }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data: FlashcardResponse = await response.json();
  return data;
}
