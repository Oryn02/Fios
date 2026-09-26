/**
 * Official ATU (Atlantic Technological University) academic key dates.
 * Used in Schedule monthly view + ATU Calendar tab.
 */

export type AtuEventCategory = 'term' | 'exam' | 'repeat' | 'deadline' | 'holiday';

export interface AtuAcademicEvent {
  id: string;
  /** Local calendar day YYYY-MM-DD */
  dateKey: string;
  title: string;
  category: AtuEventCategory;
  description: string;
}

/** Parse "17 August 2026" → date key / Date at local noon (avoids TZ day-shift). */
export function parseAtuDateLabel(label: string): { dateKey: string; date: Date } | null {
  const d = new Date(`${label} 12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { dateKey: `${y}-${m}-${day}`, date: d };
}

const RAW: Array<{ date: string; title: string; category: AtuEventCategory; description: string }> = [
  {
    date: '17 August 2026',
    title: 'Start of Repeat Exam Session',
    category: 'repeat',
    description: 'Repeat exam session running from Mon 17th to Wed 28th August, incl. Sat.',
  },
  {
    date: '26 August 2026',
    title: 'End of Repeat Exam Session',
    category: 'repeat',
    description: 'Conclusion of autumn repeat exams.',
  },
  {
    date: '15 September 2026',
    title: 'Start of Teaching (All Students)',
    category: 'term',
    description: 'Start of teaching for all full-time / CAO / OFPD new and returning students.',
  },
  {
    date: '17 September 2026',
    title: 'Deadline for Review / Appeal of Autumn Results',
    category: 'deadline',
    description: 'Deadline for applications for review or appeal of autumn results.',
  },
  {
    date: '27 October 2026',
    title: 'Reading Week',
    category: 'holiday',
    description: 'Reading week for all students (excl. craft apprentices), Tue 27th Oct – Fri 30th Oct.',
  },
  {
    date: '13 November 2026',
    title: 'Week 8 Deadline for Programme Deferral',
    category: 'deadline',
    description: 'Deadline for programme deferral.',
  },
  {
    date: '18 December 2026',
    title: 'End of Semester 1 Teaching',
    category: 'term',
    description: 'End of teaching term before the Christmas break.',
  },
  {
    date: '5 January 2027',
    title: 'Winter Examinations Begin',
    category: 'exam',
    description: 'Winter exams running from 5th to 18th Jan inclusive (weekdays and Sat).',
  },
  {
    date: '18 January 2027',
    title: 'Teaching Start (Semester 2)',
    category: 'term',
    description: 'Teaching start for full-time, part-time, and online students.',
  },
  {
    date: '22 March 2027',
    title: 'Easter Break',
    category: 'holiday',
    description: 'No teaching for full-time, part-time & online students Mon 22nd Mar – Fri 2nd Apr.',
  },
  {
    date: '30 April 2027',
    title: 'End of Teaching for Semester 2',
    category: 'term',
    description: 'End of teaching for semester 2 and year-long modules.',
  },
  {
    date: '10 May 2027',
    title: 'Summer Exam Session Begins',
    category: 'exam',
    description: 'All students main summer examination period.',
  },
  {
    date: '16 August 2027',
    title: 'Autumn Repeat Exam Session',
    category: 'repeat',
    description: 'Autumn repeat exam session running from 16th to 28th August.',
  },
];

export const ATU_ACADEMIC_EVENTS: AtuAcademicEvent[] = RAW.flatMap((item, index) => {
  const parsed = parseAtuDateLabel(item.date);
  if (!parsed) return [];
  return [{
    id: `atu-academic-${index}`,
    dateKey: parsed.dateKey,
    title: item.title,
    category: item.category,
    description: item.description,
  }];
});

export const ATU_CATEGORY_STYLES: Record<AtuEventCategory, string> = {
  term: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  exam: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  holiday: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  repeat: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
  deadline: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
};

/** ATU academic events falling on a local calendar day. */
export function atuEventsOnDay(date: Date): AtuAcademicEvent[] {
  const key = localDateKey(date);
  return ATU_ACADEMIC_EVENTS.filter((e) => e.dateKey === key);
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
