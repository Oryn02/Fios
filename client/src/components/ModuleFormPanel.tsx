/**
 * Shared create/edit module form — keeps ModulesView edits small for parallel merges.
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Folder, Palette, Pencil, X } from 'lucide-react';
import {
  COLOR_OPTIONS,
  DBModule,
  createModule,
  moduleCourseCode,
  updateModule,
} from '../lib/moduleService';
import { MOD_BADGE_CLASS } from '../lib/moduleColors';
import { examDateToLocalInput, fromDatetimeLocalValue } from '../lib/agendaService';
import { DatetimeLocalInput } from './DatetimeLocalInput';

export type ModuleFormMode = 'create' | 'edit';

interface ModuleFormPanelProps {
  mode: ModuleFormMode;
  /** Required when mode === 'edit'. */
  module?: DBModule | null;
  onClose: () => void;
  onSaved: (mod: DBModule) => void;
}

export const ModuleFormPanel: React.FC<ModuleFormPanelProps> = ({
  mode,
  module,
  onClose,
  onSaved,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('deep-emerald');
  const [tags, setTags] = useState('');
  const [examDateLocal, setExamDateLocal] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && module) {
      setName(module.name || '');
      setCode(moduleCourseCode(module) || '');
      setColor(module.color || 'deep-emerald');
      setTags((module.tags || []).join(', '));
      setExamDateLocal(examDateToLocalInput(module.exam_date));
    } else {
      setName('');
      setCode('');
      setColor('deep-emerald');
      setTags('');
      setExamDateLocal('');
    }
  }, [mode, module]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const parsedExam = fromDatetimeLocalValue(examDateLocal);
      const exam_date = parsedExam ? parsedExam.toISOString() : null;
      if (mode === 'edit' && module) {
        const updated = await updateModule(module.id, {
          name,
          code,
          color,
          tags: tagList,
          exam_date,
        });
        if (updated) onSaved(updated);
      } else {
        const created = await createModule(code, name, color, { tags: tagList, exam_date });
        if (created) onSaved(created);
      }
    } catch (err: any) {
      alert(`Failed to ${mode === 'edit' ? 'update' : 'create'} module: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="bg-card border border-cyan-500/50 rounded-2xl p-6 shadow-2xl space-y-4 overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="text-xs font-mono font-black uppercase text-cyan-400 flex items-center gap-2">
          {isEdit ? <Pencil className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
          {isEdit ? 'Edit Academic Module' : 'Create Custom Academic Module'}
        </span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Module Name (e.g. Software Engineering)…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="sm:col-span-2 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-cyan-400"
        />
        <input
          type="text"
          placeholder="Course code (optional)…"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-cyan-400 uppercase font-bold"
        />
      </div>
      <input
        type="text"
        placeholder="Folder tags (comma-separated, e.g. Year1, Core)…"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-cyan-400"
      />
      <label className="space-y-1.5 block" htmlFor="fios-module-exam-date">
        <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-cyan-400" /> Exam date &amp; time
        </span>
        <DatetimeLocalInput
          id="fios-module-exam-date"
          value={examDateLocal}
          onChange={setExamDateLocal}
          aria-label="Module exam date and time"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-mono text-muted-foreground">
            Powers Overview countdown and Revision Flight Plan. Leave blank if unknown.
          </p>
          {examDateLocal ? (
            <button
              type="button"
              onClick={() => setExamDateLocal('')}
              className="shrink-0 text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          ) : null}
        </div>
      </label>
      <div className="space-y-2">
        <label className="text-[10px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-cyan-400" /> Module Accent Color
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(COLOR_OPTIONS)
            .filter((k) => !['emerald', 'cyan', 'indigo', 'amber', 'rose', 'purple', 'teal', 'violet'].includes(k))
            .map((cKey) => (
              <button
                type="button"
                key={cKey}
                data-mod-color={cKey}
                onClick={() => setColor(cKey)}
                className={`${MOD_BADGE_CLASS} !text-[10px] !px-3 !py-1.5 cursor-pointer transition-transform ${
                  color === cKey ? 'ring-2 ring-[var(--mod-solid)] scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {COLOR_OPTIONS[cKey].label}
              </button>
            ))}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="px-5 py-2.5 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors cursor-pointer shadow-lg disabled:opacity-40"
        >
          {busy ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save Changes' : 'Save Module Folder'}
        </button>
      </div>
    </motion.form>
  );
};

export default ModuleFormPanel;
