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
 * Collapsible hub for v3.9 study tools — lecture through syllabus (features 19–28).
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

  const tabs: { id: LabTab; label: string; icon: React.ReactNode }[] = [
    { id: 'lecture', label: 'Lecture', icon: <Mic className="w-3.5 h-3.5" /> },
    { id: 'ingest', label: 'Ingest', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'mindmap', label: 'Mind map', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'lounge', label: 'Lounge', icon: <Headphones className="w-3.5 h-3.5" /> },
    { id: 'chat', label: 'Doc chat', icon: <MessageSquareQuote className="w-3.5 h-3.5" /> },
    { id: 'viva', label: 'Viva', icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'voice', label: 'Voice', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { id: 'mock', label: 'Mock exam', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'buddy', label: 'Body double', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'syllabus', label: 'Syllabus', icon: <CalendarPlus className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl shadow-sm dark:shadow-none overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer"
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
        <div className="px-4 pb-4 space-y-3 border-t fios-border pt-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer border ${
                  tab === t.id
                    ? 'accent-border accent-solid-text bg-[var(--fios-surface-2)]'
                    : 'fios-border text-[var(--fios-text-muted)]'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
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
