import React, { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Loader2 } from 'lucide-react';
import { getUserModules, type DBModule, moduleDisplayName } from '../lib/moduleService';
import { getTasks } from '../lib/taskService';
import type { Task } from '../types/db';

interface CountdownItem {
  id: string;
  label: string;
  kind: 'exam' | 'task';
  at: Date;
  moduleCode?: string | null;
}

function buildItems(modules: DBModule[], tasks: Task[]): CountdownItem[] {
  const now = Date.now();
  const items: CountdownItem[] = [];

  for (const m of modules) {
    if (!m.exam_date) continue;
    const at = new Date(m.exam_date);
    if (Number.isNaN(at.getTime()) || at.getTime() < now - 3600000) continue;
    items.push({
      id: `exam-${m.id}`,
      label: `${moduleDisplayName(m)} exam`,
      kind: 'exam',
      at,
      moduleCode: m.code,
    });
  }

  for (const t of tasks) {
    if (t.completed) continue;
    const raw = t.due_at || t.due_date;
    if (!raw) continue;
    const at = new Date(raw);
    if (Number.isNaN(at.getTime()) || at.getTime() < now - 3600000) continue;
    items.push({
      id: `task-${t.id}`,
      label: t.title,
      kind: 'task',
      at,
      moduleCode: t.module_code,
    });
  }

  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

function partsUntil(target: Date, now: Date) {
  let ms = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(ms / 86400000);
  ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  return { days, hours, minutes };
}

export const ExamCountdownWidget: React.FC = () => {
  const [modules, setModules] = useState<DBModule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    Promise.all([getUserModules(), getTasks()])
      .then(([m, t]) => {
        if (!cancelled) {
          setModules(m);
          setTasks(t);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const upcoming = useMemo(() => buildItems(modules, tasks), [modules, tasks]);
  const next = upcoming[0];
  const countdown = next ? partsUntil(next.at, now) : null;

  return (
    <div className="bg-[var(--fios-surface)]/60 border fios-border rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b fios-border pb-3">
        <div>
          <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-0.5 flex items-center gap-1.5">
            <AlarmClock className="w-3.5 h-3.5" /> Deadlines
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-wide text-[var(--fios-text)]">
            Exam & submission countdown
          </h3>
        </div>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--fios-text-muted)]" />
        </div>
      ) : !next || !countdown ? (
        <p className="text-xs font-mono text-[var(--fios-text-muted)] py-4">
          No upcoming exams or due tasks. Set an exam date on a module or add a task with a due time.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--fios-text-muted)]">
                Next {next.kind === 'exam' ? 'exam' : 'submission'}
                {next.moduleCode ? ` · ${next.moduleCode}` : ''}
              </p>
              <p className="text-sm font-black text-[var(--fios-text)] truncate">{next.label}</p>
              <p className="text-[10px] font-mono text-[var(--fios-text-muted)] mt-0.5">
                {next.at.toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono">
              {[
                { n: countdown.days, u: 'days' },
                { n: countdown.hours, u: 'hrs' },
                { n: countdown.minutes, u: 'min' },
              ].map((p) => (
                <div
                  key={p.u}
                  className="min-w-[3.25rem] rounded-xl border fios-border bg-[var(--fios-surface-2)] px-2.5 py-2 text-center"
                >
                  <div className="text-lg font-black accent-solid-text leading-none">{p.n}</div>
                  <div className="text-[9px] uppercase text-[var(--fios-text-muted)] mt-1">{p.u}</div>
                </div>
              ))}
            </div>
          </div>

          {upcoming.length > 1 && (
            <ul className="space-y-1.5 border-t fios-border pt-3">
              {upcoming.slice(1, 4).map((item) => {
                const p = partsUntil(item.at, now);
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--fios-text-muted)]"
                  >
                    <span className="truncate text-[var(--fios-text)]">
                      {item.kind === 'exam' ? 'Exam' : 'Due'} · {item.label}
                    </span>
                    <span className="shrink-0 accent-solid-text">
                      {p.days}d {p.hours}h
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamCountdownWidget;
