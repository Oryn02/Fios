import React, { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '../context/ThemeContext';

interface Props {
  chart: string;
}

let initializedTheme: string | null = null;

/**
 * Renders a Mermaid diagram from a chart definition. Used to visualize
 * ```mermaid code blocks returned by Gemini in summaries, tutor answers,
 * and code-exam explanations.
 */
export const MermaidDiagram: React.FC<Props> = ({ chart }) => {
  const { theme } = useTheme();
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mermaidTheme = theme === 'light' ? 'default' : 'dark';
    if (initializedTheme !== mermaidTheme) {
      mermaid.initialize({ startOnLoad: false, theme: mermaidTheme, securityLevel: 'strict' });
      initializedTheme = mermaidTheme;
    }

    (async () => {
      try {
        const { svg } = await mermaid.render(`m-${id}`, chart.trim());
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [chart, theme, id]);

  if (error) {
    return (
      <pre className="rounded-lg border fios-border bg-[var(--fios-surface-2)] p-3 text-xs font-mono text-[var(--fios-text-muted)] overflow-x-auto whitespace-pre-wrap">
        {chart}
      </pre>
    );
  }

  return <div ref={ref} className="fios-mermaid my-2 flex justify-center rounded-lg border fios-border bg-[var(--fios-surface-2)] p-3 overflow-x-auto" />;
};

export default MermaidDiagram;
