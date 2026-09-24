import { FlashcardResponse } from '../types/api';

const API_BASE_URL = 'http://localhost:5000/api';

export async function generateFlashcards(studyNotes: string): Promise<FlashcardResponse> {
  const response = await fetch(`${API_BASE_URL}/generate/flashcards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // CHANGE THIS LINE: Send 'text' so it matches `const { text } = req.body`
    body: JSON.stringify({ text: studyNotes }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data: FlashcardResponse = await response.json();
  return data;
}