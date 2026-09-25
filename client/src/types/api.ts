// Flashcard shape used across AI generation payloads and persisted deck cards.
export interface Flashcard {
  id?: string;
  front: string;
  back: string;
  // Persisted rows may also carry these; kept optional for compatibility.
  question?: string;
  answer?: string;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  next_review?: string | null;
}

export interface FlashcardResponse {
  cards: Flashcard[];
}
