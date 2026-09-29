/**
 * Safe rich-text renderer for flashcards / notes.
 * Avoids hard crashes if syntax-highlighter or KaTeX plugins misbehave on mobile.
 */
import React, { useMemo, Component, type ReactNode, type ErrorInfo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MermaidDiagram } from './MermaidDiagram';
import 'katex/dist/katex.min.css';

interface FormattedContentProps {
  text?: string;
}

class SoftBoundary extends Component<{ children: ReactNode; fallback: string }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FormattedContent]', error, info.componentStack);
  }
  render() {
    if (this.state.err) {
      return (
        <pre className="whitespace-pre-wrap text-sm text-[var(--fios-text)] font-sans leading-relaxed">
          {this.props.fallback}
        </pre>
      );
    }
    return this.props.children;
  }
}

export const FormattedContent: React.FC<FormattedContentProps> = ({ text = '' }) => {
  const content = useMemo(() => (typeof text === 'string' ? text : String(text ?? '')), [text]);
  if (!content) return null;

  return (
    <SoftBoundary fallback={content}>
      <div className="fios-prose text-sm text-[var(--fios-text)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match?.[1];
              const code = String(children ?? '').replace(/\n$/, '');
              const isInline = !className && !String(children ?? '').includes('\n');

              if (isInline) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }

              if (lang === 'mermaid') {
                return <MermaidDiagram chart={code} />;
              }

              // Avoid react-syntax-highlighter on mobile flashcards — it has pulled
              // "undefined is not a function" TypeErrors on some iOS Safari builds.
              return (
                <div className="fios-code-scroll rounded-lg border border-slate-800 text-xs font-mono text-left my-2 bg-[#07090e] text-slate-200">
                  {lang ? <span className="block text-[10px] uppercase tracking-wider text-slate-500 px-3 pt-2">{lang}</span> : null}
                  <pre className="fios-code-pre min-w-[500px] whitespace-pre p-3">
                    <code>{code}</code>
                  </pre>
                </div>
              );
            },
            pre({ children }) {
              return <>{children}</>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </SoftBoundary>
  );
};

export default FormattedContent;
