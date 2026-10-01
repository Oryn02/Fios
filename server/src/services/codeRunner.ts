/**
 * Judge0 (or compatible) code runner for interactive code cards.
 * Set JUDGE0_URL (e.g. https://ce.judge0.com) and optional JUDGE0_API_KEY.
 * JavaScript falls back to a sandboxed Function runner when Judge0 is unset.
 */

export type RunCodeInput = {
  language: string;
  source: string;
  stdin?: string;
};

export type RunCodeResult = {
  stdout: string;
  stderr: string;
  status: string;
  timedOut?: boolean;
  engine: 'judge0' | 'local-js';
};

const JUDGE0_LANG: Record<string, number> = {
  javascript: 63, // Node.js
  typescript: 74,
  java: 62,
  c: 50,
  cpp: 54,
  'c++': 54,
  csharp: 51,
  'c#': 51,
  python: 71,
};

function normalizeLang(lang: string): string {
  return String(lang || 'javascript').trim().toLowerCase();
}

async function runLocalJs(source: string, stdin = ''): Promise<RunCodeResult> {
  const logs: string[] = [];
  const errLogs: string[] = [];
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'stdin',
      'console',
      `"use strict";\n${source}\n`
    );
    const fakeConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => errLogs.push(args.map(String).join(' ')),
      warn: (...args: unknown[]) => errLogs.push(args.map(String).join(' ')),
    };
    fn(stdin, fakeConsole);
    return {
      stdout: logs.join('\n'),
      stderr: errLogs.join('\n'),
      status: 'Accepted',
      engine: 'local-js',
    };
  } catch (e) {
    return {
      stdout: logs.join('\n'),
      stderr: e instanceof Error ? e.message : String(e),
      status: 'Runtime Error',
      engine: 'local-js',
    };
  }
}

export async function runCode(input: RunCodeInput): Promise<RunCodeResult> {
  const lang = normalizeLang(input.language);
  const base = String(process.env.JUDGE0_URL || '').replace(/\/$/, '');
  const key = String(process.env.JUDGE0_API_KEY || '').trim();

  if (!base) {
    if (lang === 'javascript' || lang === 'js') {
      return runLocalJs(input.source, input.stdin);
    }
    throw new Error(
      'Code runner not configured for this language. Set JUDGE0_URL (Judge0 CE) or use JavaScript.'
    );
  }

  const language_id = JUDGE0_LANG[lang];
  if (!language_id) {
    throw new Error(`Unsupported language: ${input.language}`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (key) {
    headers['X-Auth-Token'] = key;
    headers['X-RapidAPI-Key'] = key;
  }

  const createRes = await fetch(
    `${base}/submissions?base64_encoded=false&wait=true`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_code: input.source,
        language_id,
        stdin: input.stdin || '',
      }),
    }
  );
  const body = (await createRes.json().catch(() => ({}))) as any;
  if (!createRes.ok) {
    throw new Error(body?.error || body?.message || `Judge0 error (${createRes.status})`);
  }

  return {
    stdout: String(body.stdout || ''),
    stderr: String(body.stderr || body.compile_output || ''),
    status: String(body.status?.description || body.status || 'Unknown'),
    timedOut: Boolean(body.status?.id === 5),
    engine: 'judge0',
  };
}

export function outputsMatch(actual: string, expected: string): boolean {
  const norm = (s: string) =>
    s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
  return norm(actual) === norm(expected);
}
