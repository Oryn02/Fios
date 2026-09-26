import React, { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  chart: string;
}

let initializedTheme: string | null = null;

/**
 * Renders a Mermaid diagram from a chart definition. Mermaid (+ elk/cytoscape)
 * is loaded on demand so the main bundle stays under Workbox precache limits.
 */
export const MermaidDiagram: React.FC<Props> = ({ chart }) => {
  const { resolvedTheme } = useTheme();
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mermaidTheme = resolvedTheme === 'light' ? 'default' : 'dark';

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        if (initializedTheme !== mermaidTheme) {
          mermaid.initialize({ startOnLoad: false, theme: mermaidTheme, securityLevel: 'strict' });
          initializedTheme = mermaidTheme;
        }
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
  }, [chart, resolvedTheme, id]);

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
