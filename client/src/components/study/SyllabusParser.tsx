import React, { useCallback, useState } from 'react';
import { CalendarPlus, Loader2, Download } from 'lucide-react';
import { saasFetch, readJson, authHeaders } from '../../services/saasFetch';
import { apiUrl } from '../../lib/apiBase';
import { toast } from '../../lib/toast';
import { persistCalendarState, getCachedCalendarEvents } from '../../lib/calendarService';

type SyllabusEvent = {
  title: string;
  type: string;
  date?: string;
  time?: string;
  description?: string;
  moduleCode?: string;
};

/**
 * Syllabus parser — Gemini extracts deadlines/exams → .ics + optional calendar hints.
 */
export const SyllabusParser: React.FC<{ moduleCode?: string }> = ({ moduleCode }) => {
  const [text, setText] = useState('');
  const [events, setEvents] = useState<SyllabusEvent[]>([]);
  const [ics, setIcs] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const parse = useCallback(async () => {
    if (!text.trim() && !file) {
      toast('Paste syllabus text or choose a file', 'info');
      return;
    }
    setBusy(true);
    try {
      let data: any;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        if (text.trim()) fd.append('text', text.trim());
        if (moduleCode) fd.append('moduleCode', moduleCode);
        fd.append('insertHints', 'true');
        const headers = await authHeaders();
        const h = { ...(headers as Record<string, string>) };
        delete h['Content-Type'];
        const res = await fetch(apiUrl('/api/syllabus/parse'), {
          method: 'POST',
          headers: h,
          body: fd,
        });
        data = await readJson(res);
      } else {
        const res = await saasFetch('/api/syllabus/parse', {
          method: 'POST',
          body: JSON.stringify({
            text,
            moduleCode,
            insertHints: true,
          }),
        });
        data = await readJson(res);
      }
      setEvents(Array.isArray(data.events) ? data.events : []);
      setIcs(typeof data.ics === 'string' ? data.ics : null);
      toast(`Found ${data.events?.length || 0} events`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Parse failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [text, file, moduleCode]);

  const downloadIcs = useCallback(() => {
    if (!ics) return;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleCode || 'syllabus'}-deadlines.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }, [ics, moduleCode]);

  const insertHints = useCallback(async () => {
    const dated = events.filter((e) => e.date);
    if (!dated.length) {
      toast('No dated events to insert', 'info');
      return;
    }
    try {
      const existing = getCachedCalendarEvents();
      // Soft hint persistence via calendar_state prefs blob — non-destructive.
      await persistCalendarState({
        last_hint_events: dated.map((e) => ({
          title: e.title,
          date: e.date,
          time: e.time,
          type: e.type,
          moduleCode: e.moduleCode || moduleCode,
        })),
        cached_count: existing.length,
      } as any);
      toast('Calendar hints saved — open Timetable to review', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save hints', 'error');
    }
  }, [events, moduleCode]);

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <CalendarPlus className="w-4 h-4 accent-solid-text" /> Syllabus parser
      </h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste syllabus / course outline text…"
        className="w-full px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-sm"
      />
      <input
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={parse}
          className="px-3 py-2 rounded-lg accent-bg text-slate-950 text-xs font-black uppercase cursor-pointer"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null} Extract events
        </button>
        {ics && (
          <button
            type="button"
            onClick={downloadIcs}
            className="px-3 py-2 rounded-lg border fios-border text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> .ics
          </button>
        )}
        {events.length > 0 && (
          <button
            type="button"
            onClick={insertHints}
            className="px-3 py-2 rounded-lg border fios-border text-xs font-bold cursor-pointer"
          >
            Add calendar hints
          </button>
        )}
      </div>
      {events.length > 0 && (
        <ul className="space-y-1 text-xs">
          {events.map((e, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-[var(--fios-text-muted)] w-24 shrink-0">
                {e.date || 'undated'}
              </span>
              <span>
                <span className="uppercase text-[10px] text-[var(--fios-text-muted)]">{e.type}</span>{' '}
                {e.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SyllabusParser;
