import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Folder, Layers, Sparkles, ArrowRight, Trash2, Tag, Plus, Palette, X,
  HelpCircle, Code2, CheckSquare, Square, Bug, Terminal, PencilRuler, Brain, FileText,
} from 'lucide-react';
import { getUserDecksWithCards } from '../lib/deckService';
import { getUserModules, createModule, deleteModule, DBModule, COLOR_OPTIONS } from '../lib/moduleService';
import { getQuizzes } from '../lib/mcqService';
import { getCodeExams } from '../lib/codeExamService';
import { getTasks, toggleTask } from '../lib/taskService';
import { getDocuments, deleteDocument } from '../lib/documentService';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/demo';
import type { MCQQuiz, CodeExam, Task, CodeExamType, FiosDocument } from '../types/db';
import { ActiveRecall } from './ActiveRecall';

interface ModulesViewProps {
  onOpenFlashcards: (deckCards?: any[], title?: string, moduleCode?: string, isSaved?: boolean) => void;
  onOpenQuiz?: (quizId: string) => void;
  onOpenCodeExam?: (examId: string) => void;
  onOpenDocument?: (docId: string) => void;
  setActiveTab?: (tab: string) => void;
}

type EntityTab = 'decks' | 'quizzes' | 'code' | 'tasks' | 'documents';

const ENTITY_TABS: { id: EntityTab; label: string; icon: React.ElementType }[] = [
  { id: 'decks', label: 'Decks', icon: Layers },
  { id: 'quizzes', label: 'MCQ Quizzes', icon: HelpCircle },
  { id: 'code', label: 'Code Exams', icon: Code2 },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const EXAM_ICON: Record<CodeExamType, React.ReactNode> = {
  bug_fix: <Bug className="w-3.5 h-3.5" />,
  output_prediction: <Terminal className="w-3.5 h-3.5" />,
  logic_completion: <PencilRuler className="w-3.5 h-3.5" />,
};

const ModulesViewInner: React.FC<ModulesViewProps> = ({
  onOpenFlashcards,
  onOpenQuiz,
  onOpenCodeExam,
  onOpenDocument,
  setActiveTab,
}) => {
  const [modules, setModules] = useState<DBModule[]>([]);
  const [decks, setDecks] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<MCQQuiz[]>([]);
  const [codeExams, setCodeExams] = useState<CodeExam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<FiosDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [entityTab, setEntityTab] = useState<EntityTab>('decks');

  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('emerald');
  const [newTags, setNewTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d, q, c, t, docList] = await Promise.all([
        getUserModules(),
        getUserDecksWithCards(),
        getQuizzes(),
        getCodeExams(),
        getTasks(),
        getDocuments(),
      ]);
      setModules(m);
      setDecks(d || []);
      setQuizzes(q);
      setCodeExams(c);
      setTasks(t);
      setDocuments(docList || []);
    } catch (err) {
      console.error('Error loading module data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const matchesModule = useCallback(
    (code?: string | null) => (selectedModule ? code === selectedModule : true),
    [selectedModule]
  );

  const filtered = useMemo(() => ({
    decks: decks.filter((d) => matchesModule(d.module_code)),
    quizzes: quizzes.filter((q) => matchesModule(q.module_code)),
    code: codeExams.filter((c) => matchesModule(c.module_code)),
    tasks: tasks.filter((t) => matchesModule(t.module_code)),
    documents: documents.filter((doc) => matchesModule(doc.module_code)),
  }), [decks, quizzes, codeExams, tasks, documents, matchesModule]);

  const countsFor = useCallback((code: string) => ({
    decks: decks.filter((d) => d.module_code === code).length,
    quizzes: quizzes.filter((q) => q.module_code === code).length,
    code: codeExams.filter((c) => c.module_code === code).length,
    tasks: tasks.filter((t) => t.module_code === code).length,
    documents: documents.filter((doc) => doc.module_code === code).length,
  }), [decks, quizzes, codeExams, tasks, documents]);

  const tagFolders = useMemo(() => {
    const map = new Map<string, DBModule[]>();
    for (const m of modules) {
      const tags = (m.tags && m.tags.length > 0) ? m.tags : ['Untagged'];
      for (const tag of tags) {
        const key = tag.trim() || 'Untagged';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [modules]);

  const visibleModules = useMemo(() => {
    if (!folderFilter) return modules;
    return modules.filter((m) => (m.tags || []).includes(folderFilter) || (folderFilter === 'Untagged' && (!m.tags || m.tags.length === 0)));
  }, [modules, folderFilter]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean);
      const created = await createModule(newCode, newName, newColor, { tags });
      if (created) {
        setModules((prev) => [...prev, created]);
        setNewCode(''); setNewName(''); setNewTags(''); setIsCreatingModule(false);
      }
    } catch (err: any) {
      alert(`Failed to create module: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteModule = async (e: React.MouseEvent, modId: string, modCode: string) => {
    e.stopPropagation();
    if (!confirm(`Delete module folder "${modCode}"? Associated content reverts to General.`)) return;
    try {
      await deleteModule(modId);
      setModules((prev) => prev.filter((m) => m.id !== modId));
      if (selectedModule === modCode) setSelectedModule(null);
    } catch (err: any) {
      alert(`Failed to delete module: ${err.message}`);
    }
  };

  const handleDeleteDeck = async (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this study deck?')) return;
    try {
      if (!IS_DEMO) {
        const { error } = await supabase.from('decks').delete().eq('id', deckId);
        if (error) throw error;
      }
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
    } catch (err: any) {
      alert(`Failed to delete deck: ${err.message}`);
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err: any) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  const handleUpdateDeckModule = async (e: React.ChangeEvent<HTMLSelectElement>, deckId: string) => {
    e.stopPropagation();
    const newModuleCode = e.target.value;
    setDecks((prev) => prev.map((d) => (d.id === deckId ? { ...d, module_code: newModuleCode || null } : d)));
    if (IS_DEMO) return;
    try {
      const { error } = await supabase.from('decks').update({ module_code: newModuleCode || null }).eq('id', deckId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to update deck module:', err);
    }
  };

  const handleToggleTask = async (task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !task.completed } : t)));
    try { await toggleTask(task.id, !task.completed); } catch (err) { console.error(err); }
  };

  const activeCount = filtered[entityTab].length;

  return (
    <div className="space-y-8 font-sans text-slate-100 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-white uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" /> Academic Modules
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">Organize decks, quizzes, code exams, tasks, and documents into subject folders.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRecallOpen(true)} className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
            <Brain className="w-3.5 h-3.5 accent-solid-text" /> Active Recall
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setIsCreatingModule(true)} className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5 accent-solid-text" /> New Module
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onOpenFlashcards()} className="px-4 py-2 accent-bg text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5" /> Generate Deck
          </motion.button>
        </div>
      </div>

      {/* Create module */}
      <AnimatePresence>
        {isCreatingModule && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateModule}
            className="bg-[#0e131f] border border-cyan-500/50 rounded-2xl p-6 shadow-2xl space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-black uppercase text-cyan-400 flex items-center gap-2"><Folder className="w-4 h-4" /> Create Custom Academic Module</span>
              <button type="button" onClick={() => setIsCreatingModule(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Module Code (e.g. SOFT201)…" value={newCode} onChange={(e) => setNewCode(e.target.value)} required
                className="bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400 uppercase font-bold" />
              <input type="text" placeholder="Module Name (e.g. Software Engineering)…" value={newName} onChange={(e) => setNewName(e.target.value)} required
                className="sm:col-span-2 bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400" />
            </div>
            <input
              type="text"
              placeholder="Folder tags (comma-separated, e.g. Year1, Core)…"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              className="w-full bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            />
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-cyan-400" /> Module Accent Color</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(COLOR_OPTIONS).map((cKey) => (
                  <button type="button" key={cKey} onClick={() => setNewColor(cKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase border transition-transform cursor-pointer ${COLOR_OPTIONS[cKey].badge} ${newColor === cKey ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`}>
                    {COLOR_OPTIONS[cKey].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={creating} className="px-5 py-2.5 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors cursor-pointer shadow-lg disabled:opacity-40">
                {creating ? 'Creating…' : 'Save Module Folder'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Tag / folder groups */}
      {tagFolders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Folders:</span>
          <button
            type="button"
            onClick={() => setFolderFilter(null)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border cursor-pointer ${folderFilter === null ? 'accent-bg text-slate-950 border-transparent' : 'border-slate-800 text-slate-400'}`}
          >
            All
          </button>
          {tagFolders.map(([tag, list]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setFolderFilter(tag)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border cursor-pointer ${folderFilter === tag ? 'accent-bg text-slate-950 border-transparent' : 'border-slate-800 text-slate-400'}`}
            >
              <Tag className="w-3 h-3 inline mr-1" />{tag} ({list.length})
            </button>
          ))}
        </div>
      )}

      {/* Module folders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setSelectedModule(null)}
          className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${selectedModule === null ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-slate-800 bg-[#0e131f]/60 hover:border-slate-700'}`}>
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            <span>All Modules</span><Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{modules.length}</p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">{decks.length} decks · {quizzes.length} quizzes · {codeExams.length} exams · {documents.length} docs</p>
        </button>

        {visibleModules.map((mod) => {
          const counts = countsFor(mod.code);
          const isSelected = selectedModule === mod.code;
          const colorTheme = COLOR_OPTIONS[mod.color] || COLOR_OPTIONS['emerald'];
          return (
            <motion.div key={mod.id} whileHover={{ y: -2 }} onClick={() => setSelectedModule(mod.code)}
              className={`p-4 rounded-xl border text-left transition-colors cursor-pointer relative group flex flex-col justify-between ${isSelected ? `${colorTheme.border} bg-[#0e131f] shadow-xl` : 'border-slate-800 bg-[#0e131f]/60 hover:border-slate-700'}`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded border ${colorTheme.badge}`}>{mod.code}</span>
                  <button onClick={(e) => handleDeleteModule(e, mod.id, mod.code)} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer" title="Delete Module Folder">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-100 truncate mt-2">{mod.name}</p>
                {mod.tags && mod.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {mod.tags.map((t) => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-cyan-400" />{counts.decks}</span>
                <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3 text-emerald-400" />{counts.quizzes}</span>
                <span className="flex items-center gap-1"><Code2 className="w-3 h-3 text-indigo-400" />{counts.code}</span>
                <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-amber-400" />{counts.tasks}</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-rose-400" />{counts.documents}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Entity type tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-1 bg-[#07090e] border border-slate-800 rounded-xl p-1 w-fit overflow-x-auto">
            {ENTITY_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setEntityTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${entityTab === t.id ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs font-mono text-slate-500">
            {selectedModule ? `${selectedModule} · ` : 'All · '}{activeCount} items
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-slate-500 animate-pulse">Loading module content…</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={entityTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {/* DECKS */}
              {entityTab === 'decks' && (
                filtered.decks.length === 0 ? <EmptyState label="No decks in this module" onAction={() => onOpenFlashcards()} actionLabel="Generate Flashcards" /> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.decks.map((deck) => (
                      <motion.div key={deck.id} whileHover={{ y: -2 }} onClick={() => onOpenFlashcards(deck.cards, deck.title, deck.module_code, true)}
                        className="p-5 bg-[#0e131f]/90 border border-slate-800 rounded-xl space-y-3 hover:border-emerald-500/50 transition-colors group cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Tag className="w-3 h-3 text-slate-500" />
                            <select value={deck.module_code || ''} onChange={(e) => handleUpdateDeckModule(e, deck.id)}
                              className="bg-[#07090e] border border-slate-800 text-[10px] font-mono font-bold text-emerald-400 rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-400 cursor-pointer">
                              <option value="">General</option>
                              {modules.map((m) => <option key={m.id} value={m.code}>{m.code}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500">{new Date(deck.created_at).toLocaleDateString('en-GB')}</span>
                            <button onClick={(e) => handleDeleteDeck(e, deck.id)} className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer" title="Delete deck">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-2">{deck.title}</h4>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                          <span>{deck.cards?.length || 0} Flashcards</span>
                          <span className="text-emerald-400 group-hover:underline text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">Study <ArrowRight className="w-3 h-3" /></span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}

              {/* QUIZZES */}
              {entityTab === 'quizzes' && (
                filtered.quizzes.length === 0 ? <EmptyState label="No MCQ quizzes in this module" /> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.quizzes.map((quiz) => (
                      <motion.div
                        key={quiz.id}
                        whileHover={{ y: -2 }}
                        onClick={() => {
                          if (onOpenQuiz) onOpenQuiz(quiz.id);
                          if (setActiveTab) setActiveTab('quiz');
                        }}
                        className="p-5 bg-[#0e131f]/90 border border-slate-800 rounded-xl space-y-3 hover:border-emerald-500/50 transition-colors group cursor-pointer shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{quiz.questions.length} Q</span>
                          {quiz.module_code && <span className="text-[10px] font-mono text-cyan-400">{quiz.module_code}</span>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-2 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          {quiz.title}
                        </h4>
                        <div className="flex items-center justify-end pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                          <span className="text-emerald-400 group-hover:underline text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">Take Exam <ArrowRight className="w-3 h-3" /></span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}

              {/* CODE EXAMS */}
              {entityTab === 'code' && (
                filtered.code.length === 0 ? <EmptyState label="No code exams in this module" /> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.code.map((exam) => (
                      <motion.div
                        key={exam.id}
                        whileHover={{ y: -2 }}
                        onClick={() => {
                          if (onOpenCodeExam) onOpenCodeExam(exam.id);
                          if (setActiveTab) setActiveTab('code');
                        }}
                        className="p-5 bg-[#0e131f]/90 border border-slate-800 rounded-xl space-y-3 hover:border-indigo-500/50 transition-colors group cursor-pointer shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{exam.language}</span>
                          {exam.module_code && <span className="text-[10px] font-mono text-indigo-400">{exam.module_code}</span>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
                          {exam.title}
                        </h4>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                          <span className="flex items-center gap-1.5 capitalize">
                            {EXAM_ICON[exam.exam_type]} {exam.exam_type.replace('_', ' ')}
                          </span>
                          <span className="text-indigo-400 group-hover:underline text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">Open Lab <ArrowRight className="w-3 h-3" /></span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}

              {/* TASKS */}
              {entityTab === 'tasks' && (
                filtered.tasks.length === 0 ? <EmptyState label="No tasks in this module" /> : (
                  <div className="space-y-2">
                    {filtered.tasks.map((task) => (
                      <div key={task.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${task.completed ? 'bg-[#07090e]/50 border-slate-800/50 opacity-50' : 'bg-[#0e131f] border-slate-800'}`}>
                        <button onClick={() => handleToggleTask(task)} className="flex items-center gap-3 min-w-0 cursor-pointer text-left">
                          {task.completed ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-500 shrink-0" />}
                          <span className={`text-xs font-mono truncate ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</span>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.module_code && <span className="text-[10px] font-mono text-cyan-400">{task.module_code}</span>}
                          {task.due_date && <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">{task.due_date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* DOCUMENTS */}
              {entityTab === 'documents' && (
                filtered.documents.length === 0 ? (
                  <EmptyState
                    label="No documents in this module"
                    onAction={() => setActiveTab && setActiveTab('documents')}
                    actionLabel="Upload & Summarize Document"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.documents.map((doc) => (
                      <motion.div
                        key={doc.id}
                        whileHover={{ y: -2 }}
                        onClick={() => {
                          if (onOpenDocument) onOpenDocument(doc.id);
                          if (setActiveTab) setActiveTab('documents');
                        }}
                        className="p-5 bg-[#0e131f]/90 border border-slate-800 rounded-xl space-y-3 hover:border-rose-500/50 transition-colors group cursor-pointer shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {doc.glossary?.length || 0} terms
                          </span>
                          <div className="flex items-center gap-2">
                            {doc.module_code && <span className="text-[10px] font-mono text-cyan-400">{doc.module_code}</span>}
                            <button
                              onClick={(e) => handleDeleteDocument(e, doc.id)}
                              className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-rose-300 transition-colors line-clamp-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono line-clamp-2">{doc.summary}</p>
                        <div className="flex items-center justify-end pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                          <span className="text-rose-400 group-hover:underline text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                            Open Notes <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {recallOpen && <ActiveRecall modules={modules} initialModule={selectedModule || ''} onClose={() => setRecallOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

const EmptyState: React.FC<{ label: string; onAction?: () => void; actionLabel?: string }> = ({ label, onAction, actionLabel }) => (
  <div className="p-12 text-center bg-[#0e131f]/40 border border-slate-800/80 rounded-2xl space-y-3">
    <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
    {onAction && actionLabel && (
      <button onClick={onAction} className="px-4 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer">
        <Sparkles className="w-3.5 h-3.5" /> {actionLabel}
      </button>
    )}
  </div>
);

export const ModulesView = React.memo(ModulesViewInner);
export default ModulesView;