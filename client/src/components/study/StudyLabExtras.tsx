import React, { useMemo, useState } from 'react';
import {
  Mic,
  Network,
  Headphones,
  Video,
  MessageSquareQuote,
  Film,
  ChevronDown,
  ChevronUp,
  Volume2,
  ClipboardList,
  Users,
  CalendarPlus,
} from 'lucide-react';
import { LiveLectureRecorder } from './LiveLectureRecorder';
import { MultiFormatIngest } from './MultiFormatIngest';
import { ConceptMindMap } from './ConceptMindMap';
import { LofiLounge } from './LofiLounge';
import { GroundedDocChat } from './GroundedDocChat';
import { VivaCoach } from './VivaCoach';
import { VoiceActiveRecall } from './VoiceActiveRecall';
import { MockExamView } from './MockExamView';
import { BodyDouble } from './BodyDouble';
import { SyllabusParser } from './SyllabusParser';

interface StudyLabExtrasProps {
  moduleCode?: string;
  documentId?: string;
  seedText?: string;
  cards?: { id?: string; front: string; back: string }[];
  onDeckReady?: (deck: { title: string; cards: { front: string; back: string }[] }) => void;
}

type LabTab =
  | 'lecture'
  | 'ingest'
  | 'mindmap'
  | 'lounge'
  | 'chat'
  | 'viva'
  | 'voice'
  | 'mock'
  | 'buddy'
  | 'syllabus';

/**
 * Collapsible hub for v3.9 study tools — vertical list with icon + title + subtitle.
 */
export const StudyLabExtras: React.FC<StudyLabExtrasProps> = ({
  moduleCode,
  documentId,
  seedText = '',
  cards,
  onDeckReady,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LabTab>('lecture');

  const voiceCards = useMemo(() => {
    if (cards?.length) return cards.slice(0, 20);
    if (seedText.trim()) {
      return [
        {
          front: 'Summarize the key idea from your notes',
          back: seedText.slice(0, 400),
        },
      ];
    }
    return [];
  }, [cards, seedText]);

  const tabs: { id: LabTab; label: string; subtitle: string; icon: React.ReactNode }[] = [
    { id: 'lecture', label: 'Lecture', subtitle: 'Live lecture → cloze & Q&A cards', icon: <Mic className="w-4 h-4" /> },
    { id: 'ingest', label: 'Ingest', subtitle: 'Multi-format slides, PDF, audio → deck', icon: <Film className="w-4 h-4" /> },
    { id: 'mindmap', label: 'Mind map', subtitle: 'Visual concept graph from notes', icon: <Network className="w-4 h-4" /> },
    { id: 'lounge', label: 'Lounge', subtitle: 'Silent focus blocks with lofi ambience', icon: <Headphones className="w-4 h-4" /> },
    { id: 'chat', label: 'Doc chat', subtitle: 'Grounded Q&A on your documents', icon: <MessageSquareQuote className="w-4 h-4" /> },
    { id: 'viva', label: 'Viva', subtitle: 'Oral exam coach with feedback', icon: <Video className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice', subtitle: 'Hands-free active recall grading', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'mock', label: 'Mock exam', subtitle: 'Full-length timed practice paper', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'buddy', label: 'Body double', subtitle: 'Silent peer study sessions', icon: <Users className="w-4 h-4" /> },
    { id: 'syllabus', label: 'Syllabus', subtitle: 'Parse deadlines into calendar events', icon: <CalendarPlus className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl shadow-sm dark:shadow-none overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-11 flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer"
      >
        <span className="text-sm font-black uppercase tracking-tight text-[var(--fios-text)]">
          Study Lab extras
          <span className="ml-2 text-[10px] font-mono accent-solid-text">v3.9</span>
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--fios-text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--fios-text-muted)]" />
        )}
      </button>
      {open ? (
        <div className="px-3 pb-4 space-y-3 border-t fios-border pt-3">
          <div
            className="max-h-64 overflow-y-auto scroll-touch space-y-1 pr-0.5"
            role="listbox"
            aria-label="Study lab tools"
          >
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer border transition-colors ${
                    active
                      ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]'
                      : 'fios-border text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]'
                  }`}
                >
                  <span className={`shrink-0 ${active ? 'accent-solid-text' : 'text-[var(--fios-text-muted)]'}`}>
                    {t.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black uppercase tracking-wide">{t.label}</span>
                    <span className="block text-[10px] font-mono text-[var(--fios-text-muted)] truncate">
                      {t.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {tab === 'lecture' && (
            <LiveLectureRecorder moduleCode={moduleCode} onDeckReady={onDeckReady} />
          )}
          {tab === 'ingest' && <MultiFormatIngest onDeckReady={onDeckReady} />}
          {tab === 'mindmap' && <ConceptMindMap initialText={seedText} />}
          {tab === 'lounge' && <LofiLounge />}
          {tab === 'chat' && (
            <GroundedDocChat moduleCode={moduleCode} documentId={documentId} />
          )}
          {tab === 'viva' && (
            <VivaCoach content={seedText || 'Prepare a short oral exam on this module.'} />
          )}
          {tab === 'voice' && <VoiceActiveRecall cards={voiceCards} />}
          {tab === 'mock' && <MockExamView defaultModule={moduleCode || ''} />}
          {tab === 'buddy' && <BodyDouble defaultModule={moduleCode || ''} />}
          {tab === 'syllabus' && <SyllabusParser moduleCode={moduleCode} />}
        </div>
      ) : null}
    </div>
  );
};

export default StudyLabExtras;
