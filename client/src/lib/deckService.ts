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

  // 2. Insert Relational Cards
  const cardsToInsert = cards.map((c) => ({
    deck_id: deck.id,
    question: c.front,
    answer: c.back,
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
  return data;
}