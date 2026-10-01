import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { saasFetch, readJson } from '../../services/saasFetch';
import { fsrsReview } from '../../services/studyApi';
import { toast } from '../../lib/toast';

type VoiceCard = {
  id?: string;
  front: string;
  back: string;
};

interface VoiceActiveRecallProps {
  cards: VoiceCard[];
  onDone?: () => void;
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  window.speechSynthesis.speak(u);
}

/**
 * Hands-free voice active recall — Web Speech STT/TTS + Gemini grade → FSRS.
 */
export const VoiceActiveRecall: React.FC<VoiceActiveRecallProps> = ({ cards, onDone }) => {
  const [idx, setIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [spoken, setSpoken] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const card = cards[idx];

  useEffect(() => {
    if (card) speak(`Card ${idx + 1}. ${card.front}`);
  }, [idx, card]);

  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast('Speech recognition not supported in this browser', 'error');
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let finalText = '';
    rec.onresult = (ev: any) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setSpoken((finalText + ' ' + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
    setSpoken('');
    setFeedback(null);
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const grade = useCallback(async () => {
    if (!card || !spoken.trim()) {
      toast('Say your answer first', 'info');
      return;
    }
    stopListening();
    setBusy(true);
    try {
      const res = await saasFetch('/api/study/voice-grade', {
        method: 'POST',
        body: JSON.stringify({ front: card.front, back: card.back, spoken }),
      });
      const data = await readJson<{ rating: 1 | 2 | 3 | 4; feedback: string }>(res);
      setFeedback(data.feedback || `Rated ${data.rating}`);
      speak(data.feedback || `You scored ${data.rating} out of 4.`);
      if (card.id) {
        try {
          await fsrsReview(card.id, data.rating);
        } catch {
          /* optional */
        }
      }
      setTimeout(() => {
        if (idx + 1 < cards.length) {
          setIdx((i) => i + 1);
          setSpoken('');
          setFeedback(null);
        } else {
          speak('Session complete. Nice work.');
          onDone?.();
        }
      }, 1800);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Voice grade failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [card, spoken, stopListening, idx, cards.length, onDone]);

  if (!cards.length) {
    return (
      <p className="text-xs text-[var(--fios-text-muted)]">No cards loaded for voice recall.</p>
    );
  }

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <Volume2 className="w-4 h-4 accent-solid-text" /> Voice recall
        </h3>
        <span className="text-[10px] font-mono text-[var(--fios-text-muted)]">
          {idx + 1}/{cards.length}
        </span>
      </div>
      <p className="text-sm font-semibold text-[var(--fios-text)]">{card.front}</p>
      <p className="text-xs text-[var(--fios-text-muted)] min-h-[2.5rem]">
        {spoken || (listening ? 'Listening…' : 'Tap mic and speak your answer')}
      </p>
      {feedback && <p className="text-xs accent-solid-text">{feedback}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          className="px-3 py-2 rounded-lg border fios-border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {listening ? 'Stop' : 'Speak'}
        </button>
        <button
          type="button"
          disabled={busy || !spoken.trim()}
          onClick={grade}
          className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Grade
        </button>
      </div>
    </div>
  );
};

export default VoiceActiveRecall;
