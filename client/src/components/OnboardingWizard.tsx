import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, BookOpen, Layers, ArrowRight, ArrowLeft, CheckCircle2, Sparkles,
} from 'lucide-react';
import { createModule, type DBModule } from '../lib/moduleService';
import { toast } from '../lib/toast';
import { IS_DEMO } from '../lib/demo';

const ONBOARD_KEY = 'fios_onboarding_v41_done';

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARD_KEY, '1');
  } catch {
    /* ignore */
  }
}

const UNIVERSITIES = [
  'Atlantic Technological University (ATU)',
  'University College Dublin (UCD)',
  'Trinity College Dublin (TCD)',
  'University of Galway',
  'Dublin City University (DCU)',
  'Other / International',
];

interface OnboardingWizardProps {
  onComplete: (opts: {
    university: string;
    modules: DBModule[];
    firstDeckNotes?: string;
  }) => void;
  onGenerateFirstDeck: (notes: string, moduleCode?: string) => Promise<void>;
}

/**
 * Blocks blank Overview until university → modules → first deck flip path completes.
 */
export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onGenerateFirstDeck,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [university, setUniversity] = useState(UNIVERSITIES[0]);
  const [modCode, setModCode] = useState('');
  const [modName, setModName] = useState('');
  const [created, setCreated] = useState<DBModule[]>([]);
  const [notes, setNotes] = useState(
    'Object-oriented programming: classes encapsulate state and behaviour. Inheritance reuses shared APIs. Polymorphism lets subclasses override methods. Stack stores frames; heap stores objects.'
  );
  const [busy, setBusy] = useState(false);
  const [deckReady, setDeckReady] = useState(false);

  const canAddModule = useMemo(
    () => modCode.trim().length >= 2 && modName.trim().length >= 2,
    [modCode, modName]
  );

  const addModule = async () => {
    if (!canAddModule) return;
    setBusy(true);
    try {
      const mod = await createModule(
        modCode.trim().toUpperCase(),
        modName.trim(),
        'emerald'
      );
      if (!mod) throw new Error('Could not create module');
      setCreated((prev) => [...prev, mod]);
      setModCode('');
      setModName('');
      toast('Module added', 'success');
    } catch (e) {
      if (IS_DEMO) {
        const fake = {
          id: `demo-${Date.now()}`,
          code: modCode.trim().toUpperCase(),
          name: modName.trim(),
          color: 'emerald',
        } as DBModule;
        setCreated((prev) => [...prev, fake]);
        setModCode('');
        setModName('');
        toast('Module added (demo)', 'success');
      } else {
        toast(e instanceof Error ? e.message : 'Could not add module', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const finishDeck = async () => {
    if (!notes.trim()) return;
    setBusy(true);
    try {
      await onGenerateFirstDeck(notes.trim(), created[0]?.code);
      setDeckReady(true);
      markOnboardingComplete();
      onComplete({ university, modules: created, firstDeckNotes: notes.trim() });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not generate deck', 'error');
    } finally {
      setBusy(false);
    }
  };

  const skipToApp = () => {
    markOnboardingComplete();
    onComplete({ university, modules: created });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-[var(--fios-surface)] border fios-border rounded-2xl p-6 shadow-xl space-y-5"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">
            Setup · Step {step} of 3
          </p>
          <button
            type="button"
            onClick={skipToApp}
            className="text-[10px] font-mono uppercase text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= step ? 'accent-bg' : 'bg-[var(--fios-surface-2)]'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black italic uppercase text-[var(--fios-text)] flex items-center gap-2">
              <GraduationCap className="w-5 h-5 accent-solid-text" /> Your university
            </h2>
            <p className="text-xs text-[var(--fios-text-muted)]">
              We use this to tailor calendar feeds and module suggestions.
            </p>
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full min-h-11 px-3 py-2 rounded-xl bg-[var(--fios-surface-2)] border fios-border text-sm text-[var(--fios-text)] cursor-pointer"
            >
              {UNIVERSITIES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full min-h-11 py-3 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black italic uppercase text-[var(--fios-text)] flex items-center gap-2">
              <BookOpen className="w-5 h-5 accent-solid-text" /> Add a module
            </h2>
            <p className="text-xs text-[var(--fios-text-muted)]">
              Create at least one subject folder (you can add more later).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={modCode}
                onChange={(e) => setModCode(e.target.value)}
                placeholder="Code (e.g. COMP07012)"
                className="min-h-11 px-3 py-2 rounded-xl bg-[var(--fios-surface-2)] border fios-border text-sm font-mono text-[var(--fios-text)]"
              />
              <input
                value={modName}
                onChange={(e) => setModName(e.target.value)}
                placeholder="Name (e.g. OOP)"
                className="min-h-11 px-3 py-2 rounded-xl bg-[var(--fios-surface-2)] border fios-border text-sm text-[var(--fios-text)]"
              />
            </div>
            <button
              type="button"
              disabled={!canAddModule || busy}
              onClick={() => void addModule()}
              className="w-full min-h-11 py-2.5 border fios-border rounded-xl text-xs font-black uppercase cursor-pointer disabled:opacity-40 text-[var(--fios-text)]"
            >
              Add module
            </button>
            {created.length > 0 && (
              <ul className="space-y-1.5">
                {created.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2 text-xs font-bold text-[var(--fios-text)] px-3 py-2 rounded-lg bg-[var(--fios-surface-2)] border fios-border"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 accent-solid-text" />
                    <span className="font-mono accent-solid-text">{m.code}</span>
                    <span className="truncate">{m.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-11 px-4 py-3 border fios-border rounded-xl text-xs font-bold cursor-pointer text-[var(--fios-text-muted)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={created.length === 0}
                onClick={() => setStep(3)}
                className="flex-1 min-h-11 py-3 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black italic uppercase text-[var(--fios-text)] flex items-center gap-2">
              <Layers className="w-5 h-5 accent-solid-text" /> First deck
            </h2>
            <p className="text-xs text-[var(--fios-text-muted)]">
              Generate cards from sample notes, then flip your first card in the Study Lab.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full p-3 rounded-xl bg-[var(--fios-surface-2)] border fios-border text-sm font-mono text-[var(--fios-text)] resize-y field-sizing-content min-h-[6rem]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-11 px-4 py-3 border fios-border rounded-xl text-xs font-bold cursor-pointer text-[var(--fios-text-muted)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={busy || !notes.trim()}
                onClick={() => void finishDeck()}
                className="flex-1 min-h-11 py-3 accent-bg text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {busy ? 'Generating…' : deckReady ? 'Open deck' : 'Generate & study'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OnboardingWizard;
