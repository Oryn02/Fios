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

export interface DeckExportPayload {
  version: 1;
  title: string;
  module_code?: string | null;
  exported_at: string;
  cards: {
    front: string;
    back: string;
    ease_factor?: number;
    interval?: number;
    repetitions?: number;
    next_review?: string;
  }[];
}

let demoDeckState: SavedDeck[] = [...(demoDecks as SavedDeck[])];

export async function saveDeckWithCards(
  title: string,
  cards: Flashcard[],
  moduleCode?: string
) {
  if (IS_DEMO) {
    const deck: SavedDeck = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      title: title || 'Untitled Study Deck',
      module_code: moduleCode || undefined,
      created_at: new Date().toISOString(),
      cards: cards.map((c, i) => ({
        id: `demo-c-${Date.now()}-${i}`,
        front: c.front || (c as any).question,
        back: c.back || (c as any).answer,
        ease_factor: (c as any).ease_factor || 2.5,
        interval: (c as any).interval || 0,
        repetitions: (c as any).repetitions || 0,
        next_review: (c as any).next_review || new Date().toISOString(),
      })),
    };
    demoDeckState = [deck, ...demoDeckState];
    return deck;
  }

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
  if (IS_DEMO) return demoDeckState;

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

export async function renameDeck(deckId: string, title: string): Promise<void> {
  const next = title.trim() || 'Untitled Study Deck';
  if (IS_DEMO) {
    demoDeckState = demoDeckState.map((d) => (d.id === deckId ? { ...d, title: next } : d));
    return;
  }
  const { error } = await supabase.from('decks').update({ title: next }).eq('id', deckId);
  if (error) throw error;
}

export function buildDeckExport(
  title: string,
  cards: Flashcard[] | any[],
  moduleCode?: string | null
): DeckExportPayload {
  return {
    version: 1,
    title: title || 'Untitled Study Deck',
    module_code: moduleCode || null,
    exported_at: new Date().toISOString(),
    cards: (cards || []).map((c) => ({
      front: c.front || c.question || '',
      back: c.back || c.answer || '',
      ease_factor: c.ease_factor,
      interval: c.interval,
      repetitions: c.repetitions,
      next_review: c.next_review,
    })),
  };
}

export function deckExportToJson(payload: DeckExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

/** Shareable compact code: `fios1.` + url-safe base64 of minified JSON. */
export function deckExportToShareCode(payload: DeckExportPayload): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `fios1.${b64}`;
}

export function parseDeckImport(raw: string): DeckExportPayload {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Empty import.');

  let jsonText = trimmed;
  if (trimmed.startsWith('fios1.')) {
    const b64 = trimmed.slice(6).replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    jsonText = decodeURIComponent(escape(atob(b64 + pad)));
  }

  const data = JSON.parse(jsonText);
  const cardsRaw = Array.isArray(data.cards) ? data.cards : Array.isArray(data) ? data : null;
  if (!cardsRaw?.length) throw new Error('No cards found in import.');

  const cards = cardsRaw.map((c: any) => ({
    front: String(c.front || c.question || '').trim(),
    back: String(c.back || c.answer || '').trim(),
    ease_factor: c.ease_factor,
    interval: c.interval,
    repetitions: c.repetitions,
    next_review: c.next_review,
  })).filter((c: { front: string; back: string }) => c.front || c.back);

  if (!cards.length) throw new Error('Import had no usable cards.');

  return {
    version: 1,
    title: String(data.title || 'Imported Deck').trim() || 'Imported Deck',
    module_code: data.module_code || null,
    exported_at: data.exported_at || new Date().toISOString(),
    cards,
  };
}

export function downloadDeckJson(payload: DeckExportPayload): void {
  const blob = new Blob([deckExportToJson(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(payload.title || 'deck').replace(/[^\w\-]+/g, '_').slice(0, 48)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}