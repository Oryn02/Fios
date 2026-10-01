import React, { useEffect, useState } from 'react';
import { Library, Loader2 } from 'lucide-react';
import { listCourseBank } from '../../services/socialApi';
import { toast } from '../../lib/toast';

export const CourseDirectory: React.FC<{ moduleCode?: string }> = ({ moduleCode }) => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(moduleCode || '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { resources: rows } = await listCourseBank(filter || undefined);
        if (!cancelled) setResources(rows || []);
      } catch (e) {
        if (!cancelled) toast(e instanceof Error ? e.message : 'Course bank failed', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <Library className="w-4 h-4 accent-solid-text" /> Course bank
      </h3>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by module code"
        className="w-full p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
      />
      {loading ? (
        <p className="text-xs text-[var(--fios-text-muted)] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      ) : resources.length === 0 ? (
        <p className="text-xs text-[var(--fios-text-muted)]">No course-bank resources yet.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto scroll-touch">
          {resources.map((r) => (
            <li key={r.id} className="px-3 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border">
              <p className="text-xs font-bold text-[var(--fios-text)]">{r.title}</p>
              <p className="text-[10px] font-mono text-[var(--fios-text-muted)] mt-0.5">
                {r.resource_type}
                {r.module_code ? ` · ${r.module_code}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
