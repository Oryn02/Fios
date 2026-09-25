import { supabase } from './supabase';
import { Flashcard } from '../types/api';
import { IS_DEMO, demoDecks } from './demo';

export interface SavedDeck {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  module_code?: string;
  created_at: string;
  cards?: any[];
}

export async function saveDeckWithCards(
  title: string, 
  cards: Flashcard[], 
  moduleCode?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated to save decks.');

  // 1. Insert Deck Record
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .insert([
      {
        user_id: user.id,
        title: title || 'Untitled Study Deck',
        module_code: moduleCode || null,
      },
    ])
    .select()
    .single();

  if (deckError) throw deckError;

  // 2. Insert Relational Cards with SM-2 defaults
  const cardsToInsert = cards.map((c) => ({
    deck_id: deck.id,
    question: c.front || (c as any).question,
    answer: c.back || (c as any).answer,
    ease_factor: (c as any).ease_factor || 2.5,
    interval: (c as any).interval || 0,
    repetitions: (c as any).repetitions || 0,
    next_review: (c as any).next_review || new Date().toISOString(),
  }));

  const { error: cardsError } = await supabase
    .from('cards')
    .insert(cardsToInsert);

  if (cardsError) throw cardsError;

  return deck as SavedDeck;
}

export async function getUserDecksWithCards() {
  if (IS_DEMO) return demoDecks;

  const { data, error } = await supabase
    .from('decks')
    .select('*, cards(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map database cards to ensure front, back, deck_id, and SM-2 fields are preserved
  return (data || []).map((deck: any) => ({
    ...deck,
    cards: (deck.cards || []).map((c: any) => ({
      id: c.id,
      deck_id: c.deck_id,
      front: c.question,
      back: c.answer,
      ease_factor: c.ease_factor ?? 2.5,
      interval: c.interval ?? 0,
      repetitions: c.repetitions ?? 0,
      next_review: c.next_review || new Date().toISOString(),
    })),
  }));
}