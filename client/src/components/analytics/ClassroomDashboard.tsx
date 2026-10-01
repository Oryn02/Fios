import React, { useEffect, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { getGroupAnalytics } from '../../services/analyticsApi';
import { listGroups, createGroup, joinGroup } from '../../services/socialApi';
import { toast } from '../../lib/toast';

export const ClassroomDashboard: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const reloadGroups = async () => {
    const { groups: g } = await listGroups();
    setGroups(g || []);
    if (!selected && g?.[0]?.id) setSelected(g[0].id);
  };

  useEffect(() => {
    void reloadGroups()
      .catch((e) => toast(e instanceof Error ? e.message : 'Groups failed', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const analytics = await getGroupAnalytics(selected);
        if (!cancelled) setData(analytics);
      } catch (e) {
        if (!cancelled) toast(e instanceof Error ? e.message : 'Analytics failed', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const createClassroom = async () => {
    if (!newName.trim()) return;
    try {
      const { group } = await createGroup({ name: newName.trim(), isClassroom: true });
      toast(`Created · code ${group.invite_code}`, 'success');
      setNewName('');
      await reloadGroups();
      setSelected(group.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Create failed', 'error');
    }
  };

  const join = async () => {
    try {
      const { group } = await joinGroup(joinCode.trim());
      toast('Joined group', 'success');
      setJoinCode('');
      await reloadGroups();
      setSelected(group.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Join failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <BarChart3 className="w-4 h-4 accent-solid-text" /> Classroom analytics
        </h3>
        <p className="text-[10px] font-mono text-[var(--fios-text-muted)] mt-1">
          Streaks · reviews · live quiz scores
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New classroom name"
            className="flex-1 p-2.5 bg-[var(--fios-surface)] border fios-border rounded-lg text-xs"
          />
          <button
            type="button"
            onClick={() => void createClassroom()}
            className="px-3 accent-bg text-slate-950 text-xs font-black uppercase rounded-lg cursor-pointer"
          >
            Create
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Join invite code"
            className="flex-1 p-2.5 bg-[var(--fios-surface)] border fios-border rounded-lg text-xs font-mono uppercase"
          />
          <button
            type="button"
            onClick={() => void join()}
            className="px-3 border fios-border text-xs font-bold uppercase rounded-lg cursor-pointer"
          >
            Join
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--fios-text-muted)] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      ) : (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full p-2.5 bg-[var(--fios-surface)] border fios-border rounded-lg text-xs"
          >
            <option value="">Select a group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.is_classroom ? ' · classroom' : ''}
                {g.invite_code ? ` · ${g.invite_code}` : ''}
              </option>
            ))}
          </select>

          {data?.roster?.length ? (
            <div className="overflow-x-auto border fios-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--fios-surface-2)] text-[10px] font-mono uppercase text-[var(--fios-text-muted)]">
                  <tr>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Streak</th>
                    <th className="px-3 py-2">XP</th>
                    <th className="px-3 py-2">Reviews (14d)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roster.map((r: any) => (
                    <tr key={r.userId} className="border-t fios-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{r.userId.slice(0, 8)}…</td>
                      <td className="px-3 py-2 capitalize">{r.role}</td>
                      <td className="px-3 py-2">{r.currentStreak}</td>
                      <td className="px-3 py-2">{r.xp}</td>
                      <td className="px-3 py-2">{r.reviews14d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : selected ? (
            <p className="text-xs text-[var(--fios-text-muted)]">No roster data yet.</p>
          ) : null}
        </>
      )}
    </div>
  );
};
