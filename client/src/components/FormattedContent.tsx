import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';

interface FormattedContentProps {
  text?: string;
}

export const FormattedContent: React.FC<FormattedContentProps> = ({ text = '' }) => {
  if (!text) return null;

  // Regex to detect markdown code fences (```lang ... ```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: { type: 'text' | 'code'; language?: string; content: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'javascript',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return (
    <div className="space-y-2">
      {parts.map((part, i) =>
        part.type === 'code' && part.language === 'mermaid' ? (
          <MermaidDiagram key={i} chart={part.content} />
        ) : part.type === 'code' ? (
          <div key={i} className="rounded-lg overflow-hidden border border-slate-800 text-xs font-mono text-left">
            <SyntaxHighlighter 
              language={part.language} 
              style={vscDarkPlus} 
              customStyle={{ margin: 0, padding: '1rem', background: '#07090e' }}
            >
              {part.content}
            </SyntaxHighlighter>
          </div>
        ) : (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {part.content}
          </p>
        )
      )}
    </div>
  );
};

export default FormattedContent;