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
  /** Source-grounded citation fields (v3.9+). */
  source_page?: number | null;
  source_paragraph?: number | null;
  source_quote?: string | null;
  source_document_id?: string | null;
  /** basic (default) | code */
  card_type?: 'basic' | 'code' | string;
  code_language?: string | null;
  starter_code?: string | null;
  expected_output?: string | null;
  solution_code?: string | null;
  scheduler?: 'sm2' | 'fsrs' | string;
  fsrs_state?: Record<string, unknown> | null;
  deck_id?: string;
}

export interface FlashcardResponse {
  cards: Flashcard[];
}
