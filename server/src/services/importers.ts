/**
 * Import helpers: CSV, RemNote JSON/MD, Quizlet text, Notion markdown, Anki .apkg
 */
import JSZip from 'jszip';
import initSqlJs from 'sql.js';

export type ImportedCard = {
  front: string;
  back: string;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  next_review?: string;
  scheduler?: 'sm2' | 'fsrs';
};

export type ImportResult = {
  title: string;
  cards: ImportedCard[];
  source: string;
};

function sm2Defaults(c: { front: string; back: string }): ImportedCard {
  return {
    front: c.front.trim(),
    back: c.back.trim(),
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: new Date().toISOString(),
    scheduler: 'sm2',
  };
}

/** Parse simple CSV / TSV: front,back (header optional). */
export function parseCsvDeck(raw: string, title = 'Imported CSV'): ImportResult {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) throw new Error('CSV is empty');

  const delim = lines[0].includes('\t') ? '\t' : ',';
  const start =
    /^(front|question|term)\b/i.test(lines[0].split(delim)[0].trim()) ? 1 : 0;

  const cards: ImportedCard[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delim);
    if (cols.length < 2) continue;
    const front = cols[0]?.trim() || '';
    const back = cols.slice(1).join(delim === '\t' ? '\t' : ',').trim();
    if (!front && !back) continue;
    cards.push(sm2Defaults({ front, back }));
  }
  if (!cards.length) throw new Error('No cards found in CSV');
  return { title, cards, source: 'csv' };
}

function splitCsvLine(line: string, delim: string): string[] {
  if (delim === '\t') return line.split('\t');
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** RemNote JSON export or markdown Q::A / Q=>A lines. */
export function parseRemNote(raw: string, title = 'Imported RemNote'): ImportResult {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const data = JSON.parse(trimmed);
    const docs = Array.isArray(data) ? data : data.docs || data.rem || data.cards || [];
    const cards: ImportedCard[] = [];
    for (const d of docs) {
      const front = String(d.key || d.front || d.question || d.value?.[0] || '').trim();
      const back = String(d.value || d.back || d.answer || d.children?.[0]?.key || '').trim();
      if (typeof d.value === 'object' && Array.isArray(d.value)) {
        const b = d.value.map(String).join('\n').trim();
        if (front) cards.push(sm2Defaults({ front, back: b || back }));
        continue;
      }
      if (front || back) cards.push(sm2Defaults({ front, back }));
    }
    if (!cards.length) throw new Error('No RemNote cards found in JSON');
    return { title: data.name || title, cards, source: 'remnote' };
  }

  const cards: ImportedCard[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const m = line.match(/^(.+?)\s*(?:::|=>|->)\s*(.+)$/);
    if (m) cards.push(sm2Defaults({ front: m[1], back: m[2] }));
  }
  if (!cards.length) throw new Error('No RemNote cards found (use Q::A or JSON export)');
  return { title, cards, source: 'remnote' };
}

/** Notion page export as markdown — Q/A under headings or Term: Def lines. */
export function parseNotionMarkdown(raw: string, title = 'Imported Notion'): ImportResult {
  const cards: ImportedCard[] = [];
  const blocks = raw.split(/\n(?=##\s)/);
  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    const heading = lines[0]?.replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    if (heading && body) cards.push(sm2Defaults({ front: heading, back: body }));
  }
  if (!cards.length) {
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^[-*]\s*\*\*(.+?)\*\*[:\s]+(.+)$/) ||
        line.match(/^(.+?)\s*[:—–-]\s+(.+)$/);
      if (m) cards.push(sm2Defaults({ front: m[1].replace(/\*\*/g, ''), back: m[2] }));
    }
  }
  if (!cards.length) throw new Error('No cards found in Notion markdown');
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  return { title: titleMatch?.[1]?.trim() || title, cards, source: 'notion' };
}

/** Quizlet text export: term TAB definition per line. */
export function parseQuizletText(raw: string, title = 'Imported Quizlet'): ImportResult {
  return parseCsvDeck(raw, title);
}

/**
 * Fetch a public Quizlet set page and scrape term/definition pairs (best-effort).
 * Falls back error asking for text export if blocked.
 */
export async function importQuizletUrl(url: string): Promise<ImportResult> {
  const m = url.match(/quizlet\.com\/(?:[a-z]{2}\/)?(\d+)/i);
  if (!m) throw new Error('Unrecognized Quizlet URL — paste a set link or text export');
  const id = m[1];
  const pageUrl = `https://quizlet.com/${id}`;
  const res = await fetch(pageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; FiosImporter/3.9; +https://fios-web.onrender.com)',
      Accept: 'text/html',
    },
  });
  if (!res.ok) {
    throw new Error(
      `Could not fetch Quizlet set (${res.status}). Export as text (term TAB definition) and paste instead.`
    );
  }
  const html = await res.text();
  const title =
    html.match(/<title>([^|<]+)/i)?.[1]?.replace(/\s*\|.*$/, '').trim() ||
    `Quizlet ${id}`;

  const cards: ImportedCard[] = [];
  // Common embedded JSON patterns
  const wordRegex =
    /"word"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"definition"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(html))) {
    const front = JSON.parse(`"${match[1]}"`);
    const back = JSON.parse(`"${match[2]}"`);
    if (front || back) cards.push(sm2Defaults({ front, back }));
  }
  if (!cards.length) {
    const termDef =
      /data-testid="set-page-card-side-(?:word|definition)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    const sides: string[] = [];
    let tm: RegExpExecArray | null;
    while ((tm = termDef.exec(html))) sides.push(tm[1].trim());
    for (let i = 0; i + 1 < sides.length; i += 2) {
      cards.push(sm2Defaults({ front: sides[i], back: sides[i + 1] }));
    }
  }
  if (!cards.length) {
    throw new Error(
      'Could not parse Quizlet page. In Quizlet: Export → Text (tab between term and definition) → paste here.'
    );
  }
  return { title, cards, source: 'quizlet' };
}

/** Parse Anki .apkg (zip + sqlite collection). */
export async function parseApkg(
  buffer: Buffer,
  title = 'Imported Anki'
): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(buffer);
  const colName =
    Object.keys(zip.files).find((n) => /collection\.anki2(1)?$/i.test(n)) ||
    Object.keys(zip.files).find((n) => n.endsWith('.anki2') || n.endsWith('.anki21'));
  if (!colName) throw new Error('Invalid .apkg — missing collection database');

  const dbBuf = await zip.files[colName].async('uint8array');
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBuf);

  let deckTitle = title;
  try {
    const dec = db.exec('SELECT decks FROM col');
    if (dec[0]?.values?.[0]?.[0]) {
      const decksJson = JSON.parse(String(dec[0].values[0][0]));
      const first = Object.values(decksJson).find(
        (d: any) => d && d.name && d.name !== 'Default'
      ) as any;
      if (first?.name) deckTitle = String(first.name);
    }
  } catch {
    /* ignore */
  }

  const notes = db.exec('SELECT flds FROM notes');
  const cards: ImportedCard[] = [];
  if (notes[0]) {
    for (const row of notes[0].values) {
      const flds = String(row[0] || '');
      const parts = flds.split('\x1f');
      const front = (parts[0] || '').replace(/<[^>]+>/g, '').trim();
      const back = (parts[1] || parts.slice(1).join('\n') || '')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (front || back) cards.push(sm2Defaults({ front, back }));
    }
  }
  db.close();
  if (!cards.length) throw new Error('No notes found in .apkg');
  return { title: deckTitle, cards, source: 'apkg' };
}
