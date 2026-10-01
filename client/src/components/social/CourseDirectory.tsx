import React, { useEffect, useState } from 'react';
import { Copy, Library, Loader2, ThumbsDown, ThumbsUp, Eye } from 'lucide-react';
import { listCourseBank, voteResource, cloneResource, viewResource } from '../../services/socialApi';
import { toast } from '../../lib/toast';

export const CourseDirectory: React.FC<{ moduleCode?: string }> = ({ moduleCode }) => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(moduleCode || '');
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const onView = async (id: string) => {
    try {
      const res = await viewResource(id);
      setResources((rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, view_count: res.view_count ?? (r.view_count || 0) + 1 } : r
        )
      );
    } catch {
      /* soft-fail */
    }
  };

  const onVote = async (id: string, vote: 1 | -1) => {
    setBusyId(id);
    try {
      const res = await voteResource(id, vote);
      setResources((rows) =>
        rows.map((r) =>
          r.id === id
            ? {
                ...r,
                upvote_count: res.upvote_count ?? r.upvote_count,
                downvote_count: res.downvote_count ?? r.downvote_count,
                user_vote: res.user_vote ?? vote,
              }
            : r
        )
      );
    } catch (e: any) {
      toast(e?.message || 'Vote failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const onClone = async (id: string) => {
    setBusyId(id);
    try {
      const res = await cloneResource(id);
      toast(res.title ? `Cloned “${res.title}” to your library` : 'Cloned to My Library', 'success');
      setResources((rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, clone_count: (r.clone_count || 0) + 1 } : r
        )
      );
    } catch (e: any) {
      toast(e?.message || 'Clone failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

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
            <li
              key={r.id}
              className="px-3 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border space-y-2"
              onMouseEnter={() => void onView(r.id)}
            >
              <div>
                <p className="text-xs font-bold text-[var(--fios-text)]">{r.title}</p>
                <p className="text-[10px] font-mono text-[var(--fios-text-muted)] mt-0.5">
                  {r.resource_type}
                  {r.module_code ? ` · ${r.module_code}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[var(--fios-text-muted)]">
                <span className="inline-flex items-center gap-0.5">
                  <Eye className="w-3 h-3" /> {r.view_count ?? 0}
                </span>
                <span>↓ {r.clone_count ?? 0} clones</span>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void onVote(r.id, 1)}
                  className={`inline-flex items-center gap-0.5 cursor-pointer ${r.user_vote === 1 ? 'accent-solid-text' : ''}`}
                  aria-label="Upvote"
                >
                  <ThumbsUp className="w-3 h-3" /> {r.upvote_count ?? 0}
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void onVote(r.id, -1)}
                  className={`inline-flex items-center gap-0.5 cursor-pointer ${r.user_vote === -1 ? 'text-rose-400' : ''}`}
                  aria-label="Downvote"
                >
                  <ThumbsDown className="w-3 h-3" /> {r.downvote_count ?? 0}
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void onClone(r.id)}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md border fios-border text-[var(--fios-text)] cursor-pointer disabled:opacity-40"
                >
                  {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3 accent-solid-text" />}
                  Clone to My Library
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
