import React, { useState, useEffect } from 'react';
import { BookOpen, Folder, Layers, Sparkles, ArrowRight, Trash2, Tag, Plus, Palette, X } from 'lucide-react';
import { getUserDecksWithCards } from '../lib/deckService';
import { getUserModules, createModule, deleteModule, DBModule, COLOR_OPTIONS } from '../lib/moduleService';
import { supabase } from '../lib/supabase';

interface ModulesViewProps {
  onOpenFlashcards: (
    deckCards?: any[],
    title?: string,
    moduleCode?: string,
    isSaved?: boolean
  ) => void;
}

export const ModulesView: React.FC<ModulesViewProps> = ({ onOpenFlashcards }) => {
  const [modules, setModules] = useState<DBModule[]>([]);
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // New Module Creation State
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('emerald');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedModules, fetchedDecks] = await Promise.all([
        getUserModules(),
        getUserDecksWithCards(),
      ]);
      setModules(fetchedModules);
      setDecks(fetchedDecks || []);
    } catch (err) {
      console.error('Error loading module data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    setCreating(true);
    try {
      const created = await createModule(newCode, newName, newColor);
      if (created) {
        setModules((prev) => [...prev, created]);
        setNewCode('');
        setNewName('');
        setIsCreatingModule(false);
      }
    } catch (err: any) {
      alert(`Failed to create module: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteModule = async (e: React.MouseEvent, modId: string, modCode: string) => {
    e.stopPropagation();
    if (!confirm(`Delete module folder "${modCode}"? Associated decks will revert to 'General'.`)) return;

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
    if (!confirm('Are you sure you want to delete this study deck?')) return;

    try {
      const { error } = await supabase.from('decks').delete().eq('id', deckId);
      if (error) throw error;
      
      // Remove deck locally
      setDecks((prev) => prev.filter((d) => d.id !== deckId));

      // Reset App.tsx active state so deleted cards won't persist in memory
      onOpenFlashcards();
    } catch (err: any) {
      alert(`Failed to delete deck: ${err.message}`);
    }
  };

  const handleUpdateDeckModule = async (e: React.ChangeEvent<HTMLSelectElement>, deckId: string) => {
    e.stopPropagation();
    const newModuleCode = e.target.value;
    try {
      const { error } = await supabase
        .from('decks')
        .update({ module_code: newModuleCode || null })
        .eq('id', deckId);

      if (error) throw error;
      setDecks((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, module_code: newModuleCode || null } : d))
      );
    } catch (err: any) {
      console.error('Failed to update deck module:', err);
    }
  };

  const filteredDecks = selectedModule
    ? decks.filter((d) => d.module_code === selectedModule)
    : decks;

  return (
    <div className="space-y-8 animate-fadeIn font-sans text-slate-100 max-w-6xl mx-auto">
      
      {/* 1. HEADER & ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-white uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            ACADEMIC MODULES
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Organize study decks and lecture notes into subject folders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingModule(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            + New Module
          </button>
          <button
            onClick={() => onOpenFlashcards()}
            className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            + Generate Deck
          </button>
        </div>
      </div>

      {/* 2. MODAL: CREATE CUSTOM MODULE FOLDER */}
      {isCreatingModule && (
        <form
          onSubmit={handleCreateModule}
          className="bg-[#0e131f] border border-cyan-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-black uppercase text-cyan-400 flex items-center gap-2">
              <Folder className="w-4 h-4" /> CREATE CUSTOM ACADEMIC MODULE
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingModule(false)}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Module Code (e.g. SOFT201)..."
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400 uppercase font-bold"
              required
            />
            <input
              type="text"
              placeholder="Module Name (e.g. Software Engineering)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="sm:col-span-2 bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          {/* Color Theme Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" /> Module Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(COLOR_OPTIONS).map((cKey) => (
                <button
                  type="button"
                  key={cKey}
                  onClick={() => setNewColor(cKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                    COLOR_OPTIONS[cKey].badge
                  } ${newColor === cKey ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`}
                >
                  {COLOR_OPTIONS[cKey].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-40"
            >
              {creating ? 'Creating...' : 'Save Module Folder'}
            </button>
          </div>
        </form>
      )}

      {/* 3. DYNAMIC MODULE FOLDERS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 'All Decks' Card */}
        <button
          onClick={() => setSelectedModule(null)}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedModule === null
              ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
              : 'border-slate-800 bg-[#0e131f]/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            <span>All Decks</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{decks.length}</p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">Total Saved Decks</p>
        </button>

        {/* Database Modules */}
        {modules.map((mod) => {
          const modDeckCount = decks.filter((d) => d.module_code === mod.code).length;
          const isSelected = selectedModule === mod.code;
          const colorTheme = COLOR_OPTIONS[mod.color] || COLOR_OPTIONS['emerald'];

          return (
            <div
              key={mod.id}
              onClick={() => setSelectedModule(mod.code)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                isSelected
                  ? `${colorTheme.border} bg-[#0e131f] shadow-xl`
                  : 'border-slate-800 bg-[#0e131f]/60 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded border ${colorTheme.badge}`}>
                    {mod.code}
                  </span>
                  <button
                    onClick={(e) => handleDeleteModule(e, mod.id, mod.code)}
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                    title="Delete Module Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-100 truncate mt-2">{mod.name}</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{modDeckCount} {modDeckCount === 1 ? 'deck' : 'decks'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. SAVED DECKS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Folder className="w-4 h-4 text-emerald-400" />
            {selectedModule ? `Decks in ${selectedModule}` : 'All Saved Study Decks'}
          </h3>
          <span className="text-xs font-mono text-slate-500">{filteredDecks.length} Decks</span>
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-slate-500 animate-pulse">
            Loading module decks from Supabase...
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="p-12 text-center bg-[#0e131f]/40 border border-slate-800/80 rounded-2xl space-y-3">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No Decks in this Module</p>
              <p className="text-[11px] font-mono text-slate-600 max-w-sm mx-auto">
                Generate a deck or reassign an existing deck using the dropdown tag selector below.
              </p>
            </div>
            <button
              onClick={() => onOpenFlashcards()}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase text-xs rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Flashcards
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map((deck) => (
              <div
                key={deck.id}
                onClick={() => onOpenFlashcards(deck.cards, deck.title, deck.module_code, true)}
                className="p-5 bg-[#0e131f]/90 border border-slate-800 rounded-xl space-y-3 hover:border-emerald-500/50 transition-all group cursor-pointer relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Tag className="w-3 h-3 text-slate-500" />
                    <select
                      value={deck.module_code || ''}
                      onChange={(e) => handleUpdateDeckModule(e, deck.id)}
                      className="bg-[#07090e] border border-slate-800 text-[10px] font-mono font-bold text-emerald-400 rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      <option value="">General</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.code}>{m.code}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(deck.created_at).toLocaleDateString('en-GB')}
                    </span>
                    <button
                      onClick={(e) => handleDeleteDeck(e, deck.id)}
                      className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Delete deck"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
                  {deck.title}
                </h4>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                  <span>{deck.cards?.length || 0} Flashcards</span>
                  <span className="text-emerald-400 group-hover:underline text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    Study Deck <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default ModulesView;