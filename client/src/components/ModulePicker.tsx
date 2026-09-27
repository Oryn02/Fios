/**
 * ModulePicker — select existing module or create one on the fly (save/create modals).
 */
import React, { useEffect, useState } from 'react';
import { Folder, Plus } from 'lucide-react';
import { createModule, getUserModules, type DBModule } from '../lib/moduleService';
import { toast } from '../lib/toast';

interface Props {
  value: string;
  onChange: (moduleCode: string) => void;
  className?: string;
  allowCreate?: boolean;
  /** Show module name in options (not just code). */
  showNames?: boolean;
}

export const ModulePicker: React.FC<Props> = ({
  value,
  onChange,
  className = '',
  allowCreate = true,
  showNames = true,
}) => {
  const [modules, setModules] = useState<DBModule[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => {
    getUserModules().then(setModules).catch(() => setModules([]));
  };

  useEffect(() => { reload(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const code = newCode.trim() || `MOD-${Date.now().toString(36).toUpperCase()}`;
      const created = await createModule(code, newName.trim(), 'emerald');
      if (created) {
        reload();
        onChange(created.code);
        setCreating(false);
        setNewName('');
        setNewCode('');
        toast('Module created', 'success');
      }
    } catch (err: any) {
      toast(err?.message || 'Could not create module', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2.5 py-2">
        <Folder className="w-3.5 h-3.5 accent-solid-text shrink-0" />
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__create__') {
              setCreating(true);
              return;
            }
            onChange(e.target.value);
          }}
          className="bg-transparent text-xs sm:text-sm font-mono font-bold text-[var(--fios-text)] focus:outline-none cursor-pointer w-full"
          aria-label="Module"
        >
          <option value="" className="bg-[#07090e] text-slate-400">No module</option>
          {modules.map((m) => (
            <option key={m.id} value={m.code} className="bg-[#07090e] text-slate-100">
              {showNames ? `${m.name}${m.code ? ` (${m.code})` : ''}` : m.code || m.name}
            </option>
          ))}
          {allowCreate && (
            <option value="__create__" className="bg-[#07090e] text-emerald-400">
              + Create new module…
            </option>
          )}
        </select>
      </div>
      {creating && (
        <form onSubmit={handleCreate} className="rounded-xl border fios-border bg-[var(--fios-surface)] p-3 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Module name (required)"
            required
            className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-xs text-[var(--fios-text)] focus:outline-none focus:accent-border"
          />
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Course code (optional)"
            className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border uppercase"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="text-[10px] font-mono text-[var(--fios-text-muted)] cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="px-3 py-1.5 accent-bg text-slate-950 text-[10px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-40 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Create
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ModulePicker;
