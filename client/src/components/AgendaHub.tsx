import React, { useState } from 'react';
import { Calendar, GraduationCap } from 'lucide-react';
import { ScheduleTab } from './ScheduleTab';
import { ATUCalendarView } from './ATUCalendarView';

type AgendaPane = 'timetable' | 'academic';

/**
 * Agenda pillar — Timetable (iCal/personal) + ATU academic calendar, one tap.
 */
export const AgendaHub: React.FC = () => {
  const [pane, setPane] = useState<AgendaPane>('timetable');

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <header className="space-y-1">
        <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
          Agenda
        </p>
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-[var(--fios-text)]">
          Timetable & calendar
        </h1>
        <p className="text-xs text-[var(--fios-text-muted)]">
          Classes, personal blocks, and university key dates — live source of truth for Overview.
        </p>
      </header>

      <div
        className="flex gap-1 p-1 rounded-2xl border fios-border bg-[var(--fios-surface)]"
        role="tablist"
        aria-label="Agenda views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pane === 'timetable'}
          onClick={() => setPane('timetable')}
          className={`flex-1 min-h-11 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide inline-flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
            pane === 'timetable'
              ? 'accent-bg text-slate-950'
              : 'text-[var(--fios-text-muted)] hover:bg-[var(--fios-surface-2)]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Timetable
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === 'academic'}
          onClick={() => setPane('academic')}
          className={`flex-1 min-h-11 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide inline-flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
            pane === 'academic'
              ? 'accent-bg text-slate-950'
              : 'text-[var(--fios-text-muted)] hover:bg-[var(--fios-surface-2)]'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" /> Academic calendar
        </button>
      </div>

      <div role="tabpanel">
        {pane === 'timetable' ? <ScheduleTab /> : <ATUCalendarView />}
      </div>
    </div>
  );
};

export default AgendaHub;
