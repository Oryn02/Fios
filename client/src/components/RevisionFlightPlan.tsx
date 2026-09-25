import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { computeFlightPlan, type FlightStep } from '../lib/flightPlan';

interface Props {
  onNavigate: (tab: string) => void;
}

export const RevisionFlightPlan: React.FC<Props> = ({ onNavigate }) => {
  const [steps, setSteps] = useState<FlightStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    computeFlightPlan().then(setSteps).catch(() => setSteps([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 space-y-4 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] accent-bg" />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-1 flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5" /> Revision Flight Plan
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-wide text-[var(--fios-text)]">To study today</h3>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--fios-text-muted)]" /></div>
      ) : steps.length === 0 ? (
        <div className="py-8 border border-dashed fios-border rounded-xl flex flex-col items-center justify-center text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 accent-solid-text" />
          <p className="text-xs font-bold text-[var(--fios-text-muted)] uppercase">You're all caught up</p>
          <p className="text-[11px] font-mono text-[var(--fios-text-muted)]">Create modules, add decks, and set exam dates to build your plan.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {steps.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onNavigate(s.tab)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border fios-border bg-[var(--fios-surface-2)] hover:accent-border transition-colors cursor-pointer text-left group"
            >
              <span className="w-7 h-7 rounded-lg accent-bg text-slate-950 flex items-center justify-center font-black text-sm shrink-0">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--fios-text)] truncate">{s.action}</p>
                <p className="text-[11px] font-mono text-[var(--fios-text-muted)]">{s.reason}{s.moduleCode ? ` · ${s.moduleCode}` : ''}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--fios-text-muted)] group-hover:accent-solid-text transition-colors shrink-0" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RevisionFlightPlan;
