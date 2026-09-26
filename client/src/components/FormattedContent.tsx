import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';
import 'katex/dist/katex.min.css';

interface FormattedContentProps {
  text?: string;
}

export const FormattedContent: React.FC<FormattedContentProps> = ({ text = '' }) => {
  const content = useMemo(() => text || '', [text]);
  if (!content) return null;

  return (
    <div className="fios-prose text-sm text-[var(--fios-text)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];
            const code = String(children).replace(/\n$/, '');
            const isInline = !className && !String(children).includes('\n');

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

            return (
              <div className="rounded-lg overflow-hidden border border-slate-800 text-xs font-mono text-left my-2">
                <SyntaxHighlighter
                  language={lang || 'javascript'}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1rem', background: '#07090e' }}
                >
                  {code}
                </SyntaxHighlighter>
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
  );
};

export default FormattedContent;
