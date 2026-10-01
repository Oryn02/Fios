import React, { useEffect, useState } from 'react';
import { GraduationCap, Loader2, Link2, CalendarRange } from 'lucide-react';
import { lmsConnect, lmsListMaterials, lmsBuildWeeklyPrep } from '../../services/studyApi';
import { toast } from '../../lib/toast';

type Provider = 'canvas' | 'moodle' | 'blackboard';

export const LmsConnectPanel: React.FC = () => {
  const [provider, setProvider] = useState<Provider>('canvas');
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [prepBusy, setPrepBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fios_lms_connection');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) setConnectionId(parsed.id);
        if (parsed?.provider) setProvider(parsed.provider);
        if (parsed?.baseUrl) setBaseUrl(parsed.baseUrl);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const connect = async () => {
    if (!baseUrl.trim() || !token.trim()) {
      toast('Base URL and token required', 'info');
      return;
    }
    setBusy(true);
    try {
      const res = await lmsConnect({ provider, baseUrl: baseUrl.trim(), token: token.trim() });
      const id = res.connectionId || res.id || res.connection?.id;
      if (id) {
        setConnectionId(id);
        try {
          localStorage.setItem(
            'fios_lms_connection',
            JSON.stringify({ id, provider, baseUrl: baseUrl.trim() })
          );
        } catch {
          /* ignore */
        }
      }
      toast('LMS connected', 'success');
      const mats = await lmsListMaterials(id);
      setMaterials(mats.materials || mats.items || []);
    } catch (e: any) {
      toast(e?.message || 'LMS connect failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const refreshMaterials = async () => {
    if (!connectionId) return;
    setBusy(true);
    try {
      const mats = await lmsListMaterials(connectionId);
      setMaterials(mats.materials || mats.items || []);
    } catch (e: any) {
      toast(e?.message || 'Could not list materials', 'error');
    } finally {
      setBusy(false);
    }
  };

  const buildPrep = async () => {
    setPrepBusy(true);
    try {
      const res = await lmsBuildWeeklyPrep(connectionId || undefined);
      toast(res.message || 'Weekly prep schedule drafted', 'success');
    } catch (e: any) {
      toast(e?.message || 'Weekly prep failed', 'error');
    } finally {
      setPrepBusy(false);
    }
  };

  return (
    <section className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
      <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--fios-text-muted)] flex items-center gap-2">
        <GraduationCap className="w-4 h-4 accent-solid-text" /> LMS Connect
      </h2>
      <p className="text-xs text-[var(--fios-text-muted)]">
        Link Canvas, Moodle, or Blackboard with a personal access token to pull syllabus materials and build a weekly exam-prep plan.
      </p>
      <div className="flex flex-wrap gap-2">
        {(['canvas', 'moodle', 'blackboard'] as Provider[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer border ${
              provider === p ? 'accent-bg text-slate-950 border-transparent' : 'fios-border text-[var(--fios-text-muted)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        placeholder="https://your-school.instructure.com"
        className="w-full p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
      />
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Access token"
        className="w-full p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void connect()}
          className="px-4 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          Connect
        </button>
        {connectionId && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshMaterials()}
              className="px-4 py-2 border fios-border text-xs font-bold uppercase rounded-xl cursor-pointer text-[var(--fios-text)]"
            >
              Refresh materials
            </button>
            <button
              type="button"
              disabled={prepBusy}
              onClick={() => void buildPrep()}
              className="px-4 py-2 border fios-border text-xs font-bold uppercase rounded-xl cursor-pointer text-[var(--fios-text)] inline-flex items-center gap-1.5"
            >
              {prepBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarRange className="w-3.5 h-3.5 accent-solid-text" />}
              Build weekly prep
            </button>
          </>
        )}
      </div>
      {materials.length > 0 && (
        <ul className="max-h-40 overflow-y-auto scroll-touch space-y-1.5">
          {materials.slice(0, 30).map((m, i) => (
            <li key={m.id || i} className="text-xs text-[var(--fios-text)] px-2 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border truncate">
              {m.title || m.name || 'Material'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default LmsConnectPanel;
