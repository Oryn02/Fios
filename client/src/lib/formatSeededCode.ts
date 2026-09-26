/**
 * Normalize AI-seeded starter/solution code so Monaco shows readable
 * multi-line source instead of a single minified line.
 */

function unescapeLiteralNewlines(src: string): string {
  if (src.includes('\n')) return src;
  if (!/\\n|\\t/.test(src)) return src;
  return src.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
}

function reindent(lines: string[]): string {
  let depth = 0;
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      out.push('');
      continue;
    }
    const closes = /^[}\])]/.test(line);
    if (closes) depth = Math.max(0, depth - 1);
    out.push(`${'  '.repeat(depth)}${line}`);
    const opens = /[{[(]$/.test(line) || /\{\s*$/.test(line);
    const netOpen =
      (line.match(/[{[(]/g) || []).length - (line.match(/[}\])]/g) || []).length;
    if (opens || netOpen > 0) depth += Math.max(1, netOpen);
    else if (netOpen < 0 && !closes) depth = Math.max(0, depth + netOpen);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** Lightweight brace/semicolon pretty-print for JS/TS/C-like sources. */
function formatCLike(src: string): string {
  const s = src.trim();
  let out = '';
  let inStr: '"' | "'" | '`' | null = null;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      out += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      out += ch;
      continue;
    }
    if (ch === '{') {
      out += ' {\n';
      continue;
    }
    if (ch === '}') {
      out += '\n}\n';
      continue;
    }
    if (ch === ';') {
      out += ';\n';
      continue;
    }
    if (ch === '\n') {
      out += '\n';
      continue;
    }
    out += ch;
  }
  const lines = out
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l, idx, arr) => l || (idx > 0 && arr[idx - 1]));
  return reindent(lines);
}

/** Expand compacted Python one-liners when possible. */
function formatPythonish(src: string): string {
  let s = src.trim();
  if (s.includes('\n') && s.split('\n').length >= 3) {
    return s.trimEnd() + '\n';
  }
  // Common Gemini pattern: statements joined by `; `
  if (s.includes(';')) {
    s = s.replace(/;\s*/g, '\n');
  }
  // Insert newlines before def/class/if/for/while/return at top level-ish
  s = s.replace(/\s+(def |class |if |for |while |return |else:|elif )/g, '\n$1');
  const lines = s.split('\n').map((l) => l.trimEnd());
  let depth = 0;
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      out.push('');
      continue;
    }
    if (t.startsWith('else:') || t.startsWith('elif ') || t.startsWith('except') || t.startsWith('finally:')) {
      depth = Math.max(0, depth - 1);
    }
    out.push(`${'    '.repeat(depth)}${t}`);
    if (t.endsWith(':')) depth += 1;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/**
 * Format seeded challenge code for the editor.
 * No-ops when source already looks multi-line and readable.
 */
export function formatSeededCode(code: string | undefined | null, language: string): string {
  if (!code) return '';
  let src = unescapeLiteralNewlines(String(code)).replace(/\r\n/g, '\n');
  const lineCount = src.split('\n').filter((l) => l.trim()).length;
  const avgLen =
    src.split('\n').reduce((a, l) => a + l.length, 0) / Math.max(1, lineCount);

  // Already readable
  if (lineCount >= 4 && avgLen < 120) {
    return src.trimEnd() + '\n';
  }

  const lang = (language || '').toLowerCase();
  try {
    if (lang === 'python') return formatPythonish(src);
    return formatCLike(src);
  } catch {
    return src.trimEnd() + '\n';
  }
}
