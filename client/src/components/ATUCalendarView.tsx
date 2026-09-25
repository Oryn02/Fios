import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ExternalLink, GraduationCap, Clock, BookOpen } from 'lucide-react';

interface AcademicEvent {
  date: string;
  title: string;
  category: 'term' | 'exam' | 'repeat' | 'deadline' | 'holiday';
  description: string;
}

const ATU_KEY_DATES: AcademicEvent[] = [
  {
    date: '17 August 2026',
    title: 'Start of Repeat Exam Session',
    category: 'repeat',
    description: 'Repeat exam session running from Mon 17th to Wed 28th August, incl. Sat[cite: 6].',
  },
  {
    date: '26 August 2026',
    title: 'End of Repeat Exam Session',
    category: 'repeat',
    description: 'Conclusion of autumn repeat exams[cite: 6].',
  },
  {
    date: '15 September 2026',
    title: 'Start of Teaching (All Students)',
    category: 'term',
    description: 'Start of teaching for all full-time / CAO / OFPD new and returning students[cite: 6].',
  },
  {
    date: '17 September 2026',
    title: 'Deadline for Review / Appeal of Autumn Results',
    category: 'deadline',
    description: 'Deadline for applications for review or appeal of autumn results[cite: 6].',
  },
  {
    date: '27 October 2026',
    title: 'Reading Week',
    category: 'holiday',
    description: 'Reading week for all students (excl. craft apprentices), Tue 27th Oct – Fri 30th Oct[cite: 6].',
  },
  {
    date: '13 November 2026',
    title: 'Week 8 Deadline for Programme Deferal',
    category: 'deadline',
    description: 'Deadline for programme deferral[cite: 6].',
  },
  {
    date: '18 December 2026',
    title: 'End of Semester 1 Teaching',
    category: 'term',
    description: 'End of teaching term before the Christmas break[cite: 6].',
  },
  {
    date: '5 January 2027',
    title: 'Winter Examinations Begin',
    category: 'exam',
    description: 'Winter exams running from 5th to 18th Jan inclusive (weekdays and Sat)[cite: 6].',
  },
  {
    date: '18 January 2027',
    title: 'Teaching Start (Semester 2)',
    category: 'term',
    description: 'Teaching start for full-time, part-time, and online students[cite: 6].',
  },
  {
    date: '22 March 2027',
    title: 'Easter Break',
    category: 'holiday',
    description: 'No teaching for full-time, part-time & online students Mon 22nd Mar – Fri 2nd Apr[cite: 6].',
  },
  {
    date: '30 April 2027',
    title: 'End of Teaching for Semester 2',
    category: 'term',
    description: 'End of teaching for semester 2 and year-long modules[cite: 6].',
  },
  {
    date: '10 May 2027',
    title: 'Summer Exam Session Begins',
    category: 'exam',
    description: 'All students main summer examination period[cite: 6].',
  },
  {
    date: '16 August 2027',
    title: 'Autumn Repeat Exam Session',
    category: 'repeat',
    description: 'Autumn repeat exam session running from 16th to 28th August[cite: 6].',
  },
];

const CATEGORY_STYLES = {
  term: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  exam: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  holiday: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  repeat: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  deadline: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export const ATUCalendarView: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');

  const filteredDates = filter === 'all' 
    ? ATU_KEY_DATES 
    : ATU_KEY_DATES.filter((d) => d.category === filter);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2 text-white">
            <GraduationCap className="w-6 h-6 accent-solid-text" /> ATU Academic Calendar
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Atlantic Technological University · Official key dates & exam schedules (2026–27)[cite: 6].
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://studenthub.atu.ie/GalwayMayo/getgoing"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#0e131f] border border-slate-800 text-xs font-mono font-bold text-slate-300 rounded-xl hover:border-slate-700 transition-colors inline-flex items-center gap-1.5"
          >
            ATU Student Hub <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
          <a
            href="https://studenthub.atu.ie/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#0e131f] border border-slate-800 text-xs font-mono font-bold accent-solid-text rounded-xl hover:border-emerald-500/50 transition-colors inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" /> ATU Galway-Mayo VLE <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'term', 'exam', 'repeat', 'deadline', 'holiday'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors cursor-pointer shrink-0 ${
              filter === cat
                ? 'accent-bg text-slate-950'
                : 'bg-[#0e131f] border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? 'All Key Dates' : cat}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredDates.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="p-4 rounded-xl bg-[#0e131f]/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-[#07090e] border border-slate-800 accent-solid-text shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${CATEGORY_STYLES[item.category]}`}>
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{item.description}</p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-slate-300 shrink-0 bg-[#07090e] border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-fit">
              <Clock className="w-3.5 h-3.5 accent-solid-text" />
              {item.date}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ATUCalendarView;