import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';
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
  decks?: { title?: string } | null;
};

interface DailyQueueProps {
  onOpenDeck?: (deckId: string) => void;
}

export const DailyQueue: React.FC<DailyQueueProps> = ({ onOpenDeck }) => {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [loading, setLoading] = useState(true);

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
          .select('id, question, answer, next_review, scheduler, deck_id, decks(title)')
          .order('next_review', { ascending: true })
          .limit(200);
        if (error) throw error;
        const due = ((data || []) as DueCard[]).filter((c) =>
          isCardDue(c.next_review || new Date(0).toISOString())
        );
        if (!cancelled) setCards(due.slice(0, 40));
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

  const byDeck = useMemo(() => {
    const map = new Map<string, { title: string; count: number; deckId: string }>();
    for (const c of cards) {
      const key = c.deck_id;
      const prev = map.get(key);
      const title = c.decks?.title || 'Deck';
      if (prev) prev.count += 1;
      else map.set(key, { title, count: 1, deckId: key });
    }
    return [...map.values()];
  }, [cards]);

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 accent-solid-text" /> Daily queue
        </h3>
        <span className="text-[10px] font-mono text-[var(--fios-text-muted)]">{cards.length} due</span>
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
