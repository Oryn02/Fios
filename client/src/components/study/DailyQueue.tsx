import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Loader2, Shuffle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isCardDue } from '../../lib/spacedRepetition';
import { toast } from '../../lib/toast';

type DueCard = {
  id: string;
  question: string;
  answer: string;
  next_review: string | null;
  scheduler?: string;
  deck_id: string;
  decks?: { title?: string; module_code?: string } | null;
};

interface DailyQueueProps {
  onOpenDeck?: (deckId: string) => void;
  interleaved?: boolean;
}

function interleaveByDeck(cards: DueCard[]): DueCard[] {
  const byDeck = new Map<string, DueCard[]>();
  for (const c of cards) {
    const key = c.deck_id || 'default';
    const arr = byDeck.get(key) || [];
    arr.push(c);
    byDeck.set(key, arr);
  }
  if (byDeck.size <= 1) return cards;
  const queues = [...byDeck.values()];
  const out: DueCard[] = [];
  let left = cards.length;
  while (left > 0) {
    for (const q of queues) {
      if (q.length) {
        out.push(q.shift()!);
        left -= 1;
      }
    }
  }
  return out;
}

export const DailyQueue: React.FC<DailyQueueProps> = ({ onOpenDeck, interleaved = true }) => {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [useInterleave, setUseInterleave] = useState(interleaved);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) {
          if (!cancelled) setCards([]);
          return;
        }
        const { data, error } = await supabase
          .from('cards')
          .select('id, question, answer, next_review, scheduler, deck_id, decks(title, module_code)')
          .order('next_review', { ascending: true })
          .limit(200);
        if (error) throw error;
        const due = ((data || []) as DueCard[]).filter((c) =>
          isCardDue(c.next_review || new Date(0).toISOString())
        );
        if (!cancelled) setCards(due.slice(0, 60));
      } catch (e) {
        console.error(e);
        if (!cancelled) toast('Could not load daily queue', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = useMemo(
    () => (useInterleave ? interleaveByDeck(cards) : cards),
    [cards, useInterleave]
  );

  const byDeck = useMemo(() => {
    const map = new Map<string, { title: string; count: number; deckId: string }>();
    for (const c of ordered) {
      const key = c.deck_id;
      const prev = map.get(key);
      const title = c.decks?.title || 'Deck';
      if (prev) prev.count += 1;
      else map.set(key, { title, count: 1, deckId: key });
    }
    return [...map.values()];
  }, [ordered]);

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 accent-solid-text" /> Daily queue
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUseInterleave((v) => !v)}
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border cursor-pointer ${
              useInterleave ? 'accent-border accent-solid-text' : 'fios-border text-[var(--fios-text-muted)]'
            }`}
            title="Interleave cards across decks"
          >
            <Shuffle className="w-3 h-3" /> Interleave
          </button>
          <span className="text-[10px] font-mono text-[var(--fios-text-muted)]">{cards.length} due</span>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--fios-text-muted)]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : cards.length === 0 ? (
        <p className="text-xs text-[var(--fios-text-muted)]">All caught up — no cards due right now.</p>
      ) : (
        <ul className="space-y-2">
          {byDeck.map((d) => (
            <li key={d.deckId}>
              <button
                type="button"
                onClick={() => onOpenDeck?.(d.deckId)}
                className="w-full text-left px-3 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border hover:accent-border cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="text-xs font-bold text-[var(--fios-text)] truncate">{d.title}</span>
                <span className="text-[10px] font-mono accent-solid-text shrink-0">{d.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
