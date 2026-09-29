import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Layers, Sparkles, ArrowRight, Trash2, Tag, Plus, Pencil,
  HelpCircle, Code2, CheckSquare, Square, Bug, Terminal, PencilRuler, Brain, FileText,
  Upload, Download, Share2,
} from 'lucide-react';
import { getUserDecksWithCards, renameDeck, buildDeckExport, downloadDeckJson, deckExportToShareCode } from '../lib/deckService';
import {
  getUserModules, deleteModule, DBModule, normalizeModuleColor,
  moduleDisplayName, moduleCourseCode, resolveModuleLabel, peekCachedModules,
} from '../lib/moduleService';
import { MOD_BADGE_CLASS } from '../lib/moduleColors';
import { getQuizzes, updateQuizTitle } from '../lib/mcqService';
import { getCodeExams, updateCodeExamTitle } from '../lib/codeExamService';
import { getTasks, toggleTask, peekCachedTasks } from '../lib/taskService';
import { getDocuments, deleteDocument, updateDocumentTitle } from '../lib/documentService';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/demo';
import { toast } from '../lib/toast';
import type { MCQQuiz, CodeExam, Task, CodeExamType, FiosDocument } from '../types/db';
import { ActiveRecall } from './ActiveRecall';
import { InlineEditableTitle } from './InlineEditableTitle';
import { ImportDeckModal } from './ImportDeckModal';
import { ModuleFormPanel } from './ModuleFormPanel';

interface ModulesViewProps {
  onOpenFlashcards: (deckCards?: any[], title?: string, moduleCode?: string, isSaved?: boolean) => void;
  onOpenQuiz?: (quizId: string) => void;
  onOpenCodeExam?: (examId: string) => void;
  onOpenDocument?: (docId: string) => void;
  setActiveTab?: (tab: string) => void;
  isActive?: boolean;
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
  isActive = true,
}) => {
  const cachedMods = peekCachedModules();
  const cachedTasksList = peekCachedTasks();
  const [modules, setModules] = useState<DBModule[]>(() => cachedMods || []);
  const [decks, setDecks] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<MCQQuiz[]>([]);
  const [codeExams, setCodeExams] = useState<CodeExam[]>([]);
  const [tasks, setTasks] = useState<Task[]>(() => cachedTasksList || []);
  const [documents, setDocuments] = useState<FiosDocument[]>([]);
  const [loading, setLoading] = useState(() => !cachedMods);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [entityTab, setEntityTab] = useState<EntityTab>('decks');

  const [moduleFormMode, setModuleFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingModule, setEditingModule] = useState<DBModule | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const entityTabStripRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft || modules.length > 0 || tasks.length > 0;
    if (!soft) setLoading(true);
    try {
      const [m, d, q, c, t, docsResult] = await Promise.all([
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
      setDocuments(docsResult?.documents || []);
      if (docsResult?.loadError) {
        console.error('Error loading documents:', docsResult.loadError);
      }
    } catch (err) {
      console.error('Error loading module data:', err);
    } finally {
      setLoading(false);
    }
  }, [modules.length, tasks.length]);

  useEffect(() => { void loadData({ soft: !!(cachedMods || cachedTasksList) }); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount once

  // Soft refresh when returning via keep-alive (no empty spinner).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (isActive) void loadData({ soft: true });
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the active entity tab visible when the strip is narrower than all tabs (mobile).
  useEffect(() => {
    const strip = entityTabStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-entity-tab="${entityTab}"]`);
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [entityTab]);

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

  const closeModuleForm = () => {
    setModuleFormMode(null);
    setEditingModule(null);
  };

  const handleModuleSaved = (mod: DBModule) => {
    if (moduleFormMode === 'edit') {
      const prev = editingModule;
      setModules((list) => list.map((m) => (m.id === mod.id ? mod : m)));
      if (prev && selectedModule === prev.code && prev.code !== mod.code) {
        setSelectedModule(mod.code);
      }
      // Refresh linked content if internal code changed
      if (prev && prev.code !== mod.code) loadData();
    } else {
      setModules((list) => [...list, mod]);
    }
    closeModuleForm();
  };

  const openEditModule = (e: React.MouseEvent, mod: DBModule) => {
    e.stopPropagation();
    setEditingModule(mod);
    setModuleFormMode('edit');
  };

  const handleDeleteModule = async (e: React.MouseEvent, mod: DBModule) => {
    e.stopPropagation();
    const label = moduleDisplayName(mod);
    if (!confirm(`Delete module folder "${label}"? Associated content reverts to General.`)) return;
    try {
      await deleteModule(mod.id);
      setModules((prev) => prev.filter((m) => m.id !== mod.id));
      if (selectedModule === mod.code) setSelectedModule(null);
      if (editingModule?.id === mod.id) closeModuleForm();
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
    <div className="space-y-8 font-sans text-foreground max-w-6xl mx-auto min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-foreground uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" /> Academic Modules
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">Organize decks, quizzes, code exams, tasks, and documents into subject folders.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRecallOpen(true)} className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
            <Brain className="w-3.5 h-3.5 accent-solid-text" /> Active Recall
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditingModule(null); setModuleFormMode('create'); }} className="px-4 py-2 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5 accent-solid-text" /> New Module
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onOpenFlashcards()} className="px-4 py-2 accent-bg text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5" /> Generate Deck
          </motion.button>
        </div>
      </div>

      {/* Create / edit module */}
      <AnimatePresence>
        {moduleFormMode && (
          <ModuleFormPanel
            mode={moduleFormMode}
            module={editingModule}
            onClose={closeModuleForm}
            onSaved={handleModuleSaved}
          />
        )}
      </AnimatePresence>

      {/* Tag / folder groups */}
      {tagFolders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Folders:</span>
          <button
            type="button"
            onClick={() => setFolderFilter(null)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border cursor-pointer ${folderFilter === null ? 'accent-bg text-slate-950 border-transparent' : 'border-border text-muted-foreground'}`}
          >
            All
          </button>
          {tagFolders.map(([tag, list]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setFolderFilter(tag)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border cursor-pointer ${folderFilter === tag ? 'accent-bg text-slate-950 border-transparent' : 'border-border text-muted-foreground'}`}
            >
              <Tag className="w-3 h-3 inline mr-1" />{tag} ({list.length})
            </button>
          ))}
        </div>
      )}

      {/* Module folders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setSelectedModule(null)}
          className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${selectedModule === null ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-border bg-card/60 hover:border-border'}`}>
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            <span>All Modules</span><Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{modules.length}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-1">{decks.length} decks · {quizzes.length} quizzes · {codeExams.length} exams · {documents.length} docs</p>
        </button>

        {visibleModules.map((mod) => {
          const counts = countsFor(mod.code);
          const isSelected = selectedModule === mod.code;
          const colorKey = normalizeModuleColor(mod.color);
          const title = moduleDisplayName(mod);
          const courseCode = moduleCourseCode(mod);
          return (
            <motion.div
              key={mod.id}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedModule(mod.code)}
              data-mod-color={colorKey}
              className={`p-4 rounded-xl border text-left transition-colors cursor-pointer relative group flex flex-col justify-between ${isSelected ? 'mod-border bg-card shadow-xl' : 'border-border bg-card/60 hover:border-border'}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span data-mod-color={colorKey} className={`${MOD_BADGE_CLASS} !normal-case tracking-wide`} title={title}>
                    {title}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => openEditModule(e, mod)}
                      className="text-muted-foreground hover:text-cyan-400 p-1 cursor-pointer"
                      title="Edit module"
                      aria-label={`Edit ${title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteModule(e, mod)}
                      className="text-muted-foreground hover:text-rose-400 p-1 cursor-pointer"
                      title="Delete Module Folder"
                      aria-label={`Delete ${title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {courseCode && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-1.5 truncate" title={courseCode}>
                    {courseCode}
                  </p>
                )}
                {mod.tags && mod.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 min-w-0">
                    {mod.tags.map((t) => (
                      <span key={t} data-mod-color={colorKey} className="mod-pill text-[9px] font-mono px-1.5 py-0.5 rounded border max-w-[180px] truncate min-h-[1.25rem]">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/60">
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

      {/* Entity type tabs — fios-h-scroll enables touch pan-x (global button touch-action otherwise blocks swipe) */}
      <div className="space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3 min-w-0">
          <div
            ref={entityTabStripRef}
            role="tablist"
            aria-label="Module content types"
            className="fios-h-scroll flex items-center gap-1 bg-background border border-border rounded-xl p-1 max-w-full w-full sm:w-fit overflow-x-auto overflow-y-hidden"
          >
            {ENTITY_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={entityTab === t.id}
                  data-entity-tab={t.id}
                  onClick={() => setEntityTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${entityTab === t.id ? 'bg-emerald-400 text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {selectedModule
              ? `${resolveModuleLabel(modules, selectedModule, selectedModule)} · `
              : 'All · '}
            {activeCount} items
          </span>
        </div>

        {entityTab === 'decks' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="px-3 py-1.5 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 accent-solid-text" /> Import deck
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-muted-foreground animate-pulse">Loading module content…</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={entityTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {/* DECKS */}
              {entityTab === 'decks' && (
                filtered.decks.length === 0 ? <EmptyState label="No decks in this module" onAction={() => onOpenFlashcards()} actionLabel="Generate Flashcards" /> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.decks.map((deck) => (
                      <motion.div key={deck.id} whileHover={{ y: -2 }} onClick={() => onOpenFlashcards(deck.cards, deck.title, deck.module_code, true)}
                        className="p-5 bg-card/90 border border-border rounded-xl space-y-3 hover:border-emerald-500/50 transition-colors group cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Tag className="w-3 h-3 text-muted-foreground" />
                            <select value={deck.module_code || ''} onChange={(e) => handleUpdateDeckModule(e, deck.id)}
                              className="bg-background border border-border text-[10px] font-mono font-bold text-emerald-400 rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-400 cursor-pointer max-w-[10rem]">
                              <option value="">General</option>
                              {modules.map((m) => <option key={m.id} value={m.code}>{moduleDisplayName(m)}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const payload = buildDeckExport(deck.title, deck.cards || [], deck.module_code);
                                downloadDeckJson(payload);
                                toast('Deck JSON downloaded', 'success');
                              }}
                              className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                              title="Export JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const payload = buildDeckExport(deck.title, deck.cards || [], deck.module_code);
                                const code = deckExportToShareCode(payload);
                                try {
                                  await navigator.clipboard.writeText(code);
                                  toast('Share code copied', 'success');
                                } catch {
                                  toast('Could not copy share code', 'error');
                                }
                              }}
                              className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                              title="Copy share code"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono text-muted-foreground">{new Date(deck.created_at).toLocaleDateString('en-GB')}</span>
                            <button onClick={(e) => handleDeleteDeck(e, deck.id)} className="text-muted-foreground hover:text-rose-400 p-1 transition-colors cursor-pointer" title="Delete deck">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <InlineEditableTitle
                            value={deck.title}
                            onSave={async (next) => {
                              await renameDeck(deck.id, next);
                              setDecks((prev) => prev.map((d) => (d.id === deck.id ? { ...d, title: next } : d)));
                              toast('Deck renamed', 'success');
                            }}
                            className="text-sm font-bold text-foreground group-hover:text-emerald-300 transition-colors line-clamp-2"
                            placeholder="Untitled Deck"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs font-mono text-muted-foreground">
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
                        className="p-5 bg-card/90 border border-border rounded-xl space-y-3 hover:border-emerald-500/50 transition-colors group cursor-pointer shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{quiz.questions.length} Q</span>
                          {quiz.module_code && (() => {
                            const m = modules.find((x) => x.code === quiz.module_code);
                            return (
                              <span data-mod-color={normalizeModuleColor(m?.color)} className={`${MOD_BADGE_CLASS} !normal-case tracking-wide`}>
                                {moduleDisplayName(m, quiz.module_code)}
                              </span>
                            );
                          })()}
                        </div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-300 transition-colors line-clamp-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <InlineEditableTitle
                            value={quiz.title}
                            onSave={async (next) => {
                              await updateQuizTitle(quiz.id, next);
                              setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, title: next } : q)));
                              toast('Quiz renamed', 'success');
                            }}
                            className="truncate"
                            placeholder="Untitled Quiz"
                          />
                        </h4>
                        <div className="flex items-center justify-end pt-2 border-t border-border/60 text-xs font-mono text-muted-foreground">
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
                        className="p-5 bg-card/90 border border-border rounded-xl space-y-3 hover:border-indigo-500/50 transition-colors group cursor-pointer shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{exam.language}</span>
                          {exam.module_code && (() => {
                            const m = modules.find((x) => x.code === exam.module_code);
                            return (
                              <span data-mod-color={normalizeModuleColor(m?.color)} className={`${MOD_BADGE_CLASS} !normal-case tracking-wide`}>
                                {moduleDisplayName(m, exam.module_code)}
                              </span>
                            );
                          })()}
                        </div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-300 transition-colors line-clamp-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
                          <InlineEditableTitle
                            value={exam.title}
                            onSave={async (next) => {
                              await updateCodeExamTitle(exam.id, next);
                              setCodeExams((prev) => prev.map((x) => (x.id === exam.id ? { ...x, title: next } : x)));
                              toast('Code exam renamed', 'success');
                            }}
                            className="truncate"
                            placeholder="Untitled Code Exam"
                          />
                        </h4>
                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] font-mono text-muted-foreground">
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
                      <div key={task.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${task.completed ? 'bg-background/50 border-border/50 opacity-50' : 'bg-card border-border'}`}>
                        <button onClick={() => handleToggleTask(task)} className="flex items-center gap-3 min-w-0 cursor-pointer text-left">
                          {task.completed ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <span className={`text-xs font-mono truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</span>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.module_code && (() => {
                            const m = modules.find((x) => x.code === task.module_code);
                            return (
                              <span data-mod-color={normalizeModuleColor(m?.color)} className={`${MOD_BADGE_CLASS} !normal-case tracking-wide`}>
                                {moduleDisplayName(m, task.module_code)}
                              </span>
                            );
                          })()}
                          {task.due_date && <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded">{task.due_date}</span>}
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
                        className="p-5 bg-card/90 border border-border rounded-xl space-y-3 hover:border-rose-500/50 transition-colors group cursor-pointer shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {doc.glossary?.length || 0} terms
                          </span>
                          <div className="flex items-center gap-2">
                            {doc.module_code && (() => {
                              const m = modules.find((x) => x.code === doc.module_code);
                              return (
                                <span data-mod-color={normalizeModuleColor(m?.color)} className={`${MOD_BADGE_CLASS} !normal-case tracking-wide`}>
                                  {moduleDisplayName(m, doc.module_code)}
                                </span>
                              );
                            })()}
                            <button
                              onClick={(e) => handleDeleteDocument(e, doc.id)}
                              className="text-muted-foreground hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-rose-300 transition-colors line-clamp-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                          <InlineEditableTitle
                            value={doc.title}
                            onSave={async (next) => {
                              await updateDocumentTitle(doc.id, next);
                              setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, title: next } : d)));
                              toast('Document renamed', 'success');
                            }}
                            className="truncate"
                            placeholder="Untitled Document"
                          />
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-mono line-clamp-2">{doc.summary}</p>
                        <div className="flex items-center justify-end pt-2 border-t border-border/60 text-xs font-mono text-muted-foreground">
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

      <ImportDeckModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { void loadData(); }}
      />
    </div>
  );
};

const EmptyState: React.FC<{ label: string; onAction?: () => void; actionLabel?: string }> = ({ label, onAction, actionLabel }) => (
  <div className="p-12 text-center bg-card/40 border border-border/80 rounded-2xl space-y-3">
    <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
    {onAction && actionLabel && (
      <button onClick={onAction} className="px-4 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer">
        <Sparkles className="w-3.5 h-3.5" /> {actionLabel}
      </button>
    )}
  </div>
);

export const ModulesView = React.memo(ModulesViewInner);
export default ModulesView;