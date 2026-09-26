import React, { memo, useMemo } from 'react';
import { CheckSquare, MapPin, Play, Check } from 'lucide-react';
import type { CalendarEvent } from '../lib/calendarService';
import type { Task } from '../types/db';
import { buildUnifiedAgenda, formatAgendaWhen, type AgendaItem } from '../lib/agendaService';
import { classStateCardClass } from '../lib/scheduleTime';
import { MOD_BADGE_CLASS, MOD_PILL_CLASS } from '../lib/moduleColors';

export interface CompactAgendaProps {
  classes: CalendarEvent[];
  tasks: Task[];
  modules?: { code: string; color: string }[];
  loading?: boolean;
  /** Cap rendered rows (virtualization substitute for short lists). */
  limit?: number;
  day?: Date;
  emptyMessage?: string;
  onToggleTask?: (id: string, completed: boolean) => void;
  compact?: boolean;
}

const AgendaRow = memo(function AgendaRow({
  item,
  onToggleTask,
  compact,
}: {
  item: AgendaItem;
  onToggleTask?: (id: string, completed: boolean) => void;
  compact?: boolean;
}) {
  const muted = item.state === 'finished' || item.state === 'past-day' || !!item.completed;

  return (
    <div
      data-mod-color={item.colorKey}
      className={`p-3 rounded-xl bg-[#07090e]/80 border border-slate-800/80 flex items-center justify-between gap-3 transition-colors ${classStateCardClass(item.state)} ${
        item.state === 'next' ? 'ring-1 ring-[color-mix(in_srgb,var(--mod-solid)_40%,transparent)]' : ''
      } ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className={`text-[10px] font-mono font-bold ${muted ? 'text-slate-600' : 'text-slate-400'}`}>
          {formatAgendaWhen(item.start, item.end)}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className={`text-xs font-black truncate ${muted ? 'text-slate-500 line-through' : 'text-white'}`}>
            {item.title}
          </div>
          <span data-mod-color={item.colorKey} className={MOD_PILL_CLASS}>
            {item.kind === 'task' ? 'Task' : 'Class'}
          </span>
          {item.state === 'next' && (
            <span data-mod-color={item.colorKey} className={`${MOD_BADGE_CLASS} flex items-center gap-0.5`}>
              <Play className="w-2.5 h-2.5 fill-current" /> Next
            </span>
          )}
          {muted && item.kind === 'class' && (
            <span className="text-[9px] font-mono uppercase text-slate-500 flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Done
            </span>
          )}
        </div>
        {item.location && (
          <div className={`text-[11px] font-mono flex items-center gap-1 truncate ${muted ? 'text-slate-600' : 'mod-text'}`} data-mod-color={item.colorKey}>
            <MapPin className="w-3 h-3 shrink-0" /> {item.location}
          </div>
        )}
        {item.moduleCode && (
          <span data-mod-color={item.colorKey} className={MOD_BADGE_CLASS}>{item.moduleCode}</span>
        )}
      </div>

      {item.kind === 'task' && onToggleTask && (
        <button
          type="button"
          onClick={() => onToggleTask(item.sourceId, !!item.completed)}
          className={`shrink-0 p-1.5 rounded-lg border cursor-pointer ${
            item.completed ? 'accent-bg border-transparent text-slate-950' : 'border-slate-600 text-slate-400'
          }`}
          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          <CheckSquare className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

/**
 * Memoized compact agenda — cheap re-renders; list capped; build work memoized.
 */
export const CompactAgenda = memo(function CompactAgenda({
  classes,
  tasks,
  modules,
  loading,
  limit = 12,
  day,
  emptyMessage = 'No upcoming classes or timed tasks.',
  onToggleTask,
  compact,
}: CompactAgendaProps) {
  // Stabilize module list reference for memo deps when parent passes inline arrays
  const moduleKey = modules?.map((m) => `${m.code}:${m.color}`).join('|') ?? '';

  const items = useMemo(() => {
    return buildUnifiedAgenda({
      classes,
      tasks,
      modules,
      limit,
      day,
      hideCompletedTasks: false,
      now: new Date(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- moduleKey proxies modules
  }, [classes, tasks, moduleKey, limit, day?.getTime()]);

  if (loading) {
    return <div className="py-6 text-center text-xs font-mono text-slate-500 animate-pulse">Loading agenda…</div>;
  }

  if (items.length === 0) {
    return <p className="text-xs text-slate-400 py-4">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5 contain-content">
      {items.map((item) => (
        <AgendaRow key={item.id} item={item} onToggleTask={onToggleTask} compact={compact} />
      ))}
    </div>
  );
});

export default CompactAgenda;
