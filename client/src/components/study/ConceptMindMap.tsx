import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GitBranch, Loader2, Sparkles, X } from 'lucide-react';
import { generateMindMap } from '../../services/studyApi';
import { toast } from '../../lib/toast';

interface ConceptMindMapProps {
  initialText?: string;
  onClose?: () => void;
}

export const ConceptMindMap: React.FC<ConceptMindMapProps> = ({ initialText = '', onClose }) => {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<{ id: string; label: string; summary?: string } | null>(null);
  const [quizBusy, setQuizBusy] = useState(false);

  const generate = async () => {
    if (!text.trim()) {
      toast('Paste notes or text first', 'info');
      return;
    }
    setBusy(true);
    try {
      const res = await generateMindMap({ text: text.trim() });
      const rawNodes = res.nodes || res.graph?.nodes || [];
      const rawEdges = res.edges || res.graph?.edges || [];
      const mappedNodes: Node[] = rawNodes.map((n: any, i: number) => ({
        id: String(n.id || `n${i}`),
        position: n.position || {
          x: (i % 4) * 180 + 40,
          y: Math.floor(i / 4) * 120 + 40,
        },
        data: {
          label: n.label || n.title || n.name || `Concept ${i + 1}`,
          summary: n.summary || n.description || '',
        },
        style: {
          background: 'var(--fios-surface)',
          border: '1px solid var(--fios-border, #334155)',
          borderRadius: 12,
          padding: 8,
          fontSize: 11,
          color: 'var(--fios-text)',
          maxWidth: 160,
        },
      }));
      const mappedEdges: Edge[] = rawEdges.map((e: any, i: number) => ({
        id: String(e.id || `e${i}`),
        source: String(e.source || e.from),
        target: String(e.target || e.to),
        label: e.label,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'var(--fios-accent-solid, #34d399)' },
      }));
      // Fallback: linear chain if API returns only labels
      if (!mappedNodes.length && Array.isArray(res.concepts)) {
        const concepts = res.concepts as string[];
        setNodes(
          concepts.map((c, i) => ({
            id: `c${i}`,
            position: { x: (i % 3) * 200, y: Math.floor(i / 3) * 100 },
            data: { label: c, summary: '' },
          }))
        );
        setEdges(
          concepts.slice(1).map((_, i) => ({
            id: `ce${i}`,
            source: `c${i}`,
            target: `c${i + 1}`,
          }))
        );
      } else {
        setNodes(mappedNodes);
        setEdges(mappedEdges);
      }
      toast('Mind map ready', 'success');
    } catch (e: any) {
      toast(e?.message || 'Mind map generation failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelected({
      id: node.id,
      label: String(node.data?.label || ''),
      summary: String(node.data?.summary || ''),
    });
  }, []);

  const miniQuiz = async () => {
    if (!selected) return;
    setQuizBusy(true);
    try {
      const res = await generateMindMap({
        text: `Create a short 3-question mini quiz about: ${selected.label}. Context: ${selected.summary || text.slice(0, 800)}`,
      });
      const quiz = res.quiz || res.questions || res.summary || JSON.stringify(res).slice(0, 500);
      setSelected((s) => (s ? { ...s, summary: (s.summary ? s.summary + '\n\n' : '') + String(quiz) } : s));
      toast('Mini quiz added to panel', 'success');
    } catch (e: any) {
      toast(e?.message || 'Quiz failed', 'error');
    } finally {
      setQuizBusy(false);
    }
  };

  const flow = useMemo(() => ({ nodes, edges }), [nodes, edges]);

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl overflow-hidden shadow-sm dark:shadow-none flex flex-col min-h-[420px]">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b fios-border">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <GitBranch className="w-4 h-4 accent-solid-text" /> Concept mind map
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="touch-target text-[var(--fios-text-muted)] cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-3 border-b fios-border space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste lecture notes or upload-extracted text…"
          className="w-full h-20 p-2.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg text-xs font-mono text-[var(--fios-text)] focus:outline-none focus:accent-border"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void generate()}
          className="px-4 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate map
        </button>
      </div>
      <div className="flex-1 min-h-[280px] grid grid-cols-1 md:grid-cols-[1fr_240px]">
        <div className="h-[280px] md:h-full">
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            onNodeClick={onNodeClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
        <aside className="border-t md:border-t-0 md:border-l fios-border p-3 space-y-2 overflow-y-auto scroll-touch">
          {selected ? (
            <>
              <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">Node</p>
              <h4 className="text-sm font-bold text-[var(--fios-text)]">{selected.label}</h4>
              <p className="text-xs text-[var(--fios-text-muted)] whitespace-pre-wrap leading-relaxed">
                {selected.summary || 'No summary yet — generate a mini quiz for a drill.'}
              </p>
              <button
                type="button"
                disabled={quizBusy}
                onClick={() => void miniQuiz()}
                className="w-full py-2 border fios-border rounded-lg text-[10px] font-bold uppercase cursor-pointer text-[var(--fios-text)] disabled:opacity-40"
              >
                {quizBusy ? '…' : 'Mini quiz'}
              </button>
            </>
          ) : (
            <p className="text-xs text-[var(--fios-text-muted)]">Click a node for summary & mini quiz.</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ConceptMindMap;
