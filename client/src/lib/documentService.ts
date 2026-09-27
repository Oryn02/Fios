import { supabase } from './supabase';
import type { FiosDocument } from '../types/db';
import { IS_DEMO, demoDocuments } from './demo';

let demoDocState: FiosDocument[] = [...demoDocuments];

/** Canonical note-body column in `public.documents` (see supabase/schema.sql). */
export const DOCUMENTS_CONTENT_COLUMN = 'content' as const;

/**
 * Historical / mistaken aliases some projects may have used before aligning
 * on `content`. Prefer `content` for all writes; map these on read only.
 */
const LEGACY_BODY_KEYS = ['body', 'text', 'notes', 'note'] as const;

const LOCAL_DB = 'fios-smart-notes';
const LOCAL_STORE = 'documents';
const LOCAL_DB_VERSION = 1;

export type SaveDocumentResult = FiosDocument & {
  /** True when cloud upsert failed and the note was kept in IndexedDB. */
  savedLocally?: boolean;
  /** Human-readable cloud failure already shown via thrown Error / toast. */
  cloudWarning?: string;
};

function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOCAL_DB, LOCAL_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOCAL_STORE)) {
        db.createObjectStore(LOCAL_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listLocalDocuments(): Promise<FiosDocument[]> {
  try {
    const db = await openLocalDb();
    const rows = await new Promise<FiosDocument[]>((resolve, reject) => {
      const tx = db.transaction(LOCAL_STORE, 'readonly');
      const req = tx.objectStore(LOCAL_STORE).getAll();
      req.onsuccess = () => resolve((req.result as FiosDocument[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows;
  } catch (err) {
    console.warn('[documents] local list failed', err);
    return [];
  }
}

async function putLocalDocument(doc: FiosDocument): Promise<void> {
  const db = await openLocalDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LOCAL_STORE, 'readwrite');
    tx.objectStore(LOCAL_STORE).put(doc);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function removeLocalDocument(id: string): Promise<void> {
  try {
    const db = await openLocalDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LOCAL_STORE, 'readwrite');
      tx.objectStore(LOCAL_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('[documents] local delete failed', err);
  }
}

function pickBody(row: Record<string, unknown>): string {
  if (typeof row.content === 'string') return row.content;
  for (const key of LEGACY_BODY_KEYS) {
    const v = row[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return '';
}

/**
 * Harden glossary JSON from PostgREST / IndexedDB / AI payloads.
 * Accepts arrays, JSON strings, a single {term,definition} object, and
 * filters malformed entries so DocumentsView never crashes on `.map`.
 */
export function parseGlossary(raw: unknown): FiosDocument['glossary'] {
  let value: unknown = raw;
  if (value == null) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null') return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>;
      if ('term' in o || 'definition' in o || 'name' in o) {
        value = [o];
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  const out: FiosDocument['glossary'] = [];
  for (const item of value as unknown[]) {
    if (item == null) continue;
    if (typeof item === 'string') {
      const term = item.trim();
      if (term) out.push({ term, definition: '' });
      continue;
    }
    if (typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const term = String(o.term ?? o.name ?? '').trim();
    const definition = String(o.definition ?? o.def ?? o.meaning ?? '').trim();
    if (!term && !definition) continue;
    out.push({ term, definition });
  }
  return out;
}

/** Normalize a Supabase / local row into the client `FiosDocument` shape. */
export function normalizeDocument(row: Record<string, unknown> | FiosDocument): FiosDocument {
  const r = row as Record<string, unknown>;
  const summaryRaw = r.summary;
  return {
    id: String(r.id || ''),
    user_id: String(r.user_id || ''),
    module_code: (r.module_code as string | null | undefined) ?? null,
    title: String(r.title || 'Untitled Document'),
    content: pickBody(r),
    // Consolidated schema: summary text not null default ''
    summary: summaryRaw == null ? '' : String(summaryRaw),
    glossary: parseGlossary(r.glossary),
    created_at: String(r.created_at || new Date().toISOString()),
  };
}

function errorText(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' ');
}

/** Columns the Smart Notes upsert may reference (PostgREST PGRST204 / schema cache). */
const DOCUMENTS_UPSERT_COLUMNS = [
  'content',
  'summary',
  'glossary',
  'module_code',
  'title',
  'body',
  'text',
  'notes',
] as const;

/** PostgREST PGRST204 / “schema cache” when a column is missing or cache is stale. */
export function isSchemaCacheError(err: unknown): boolean {
  const text = errorText(err).toLowerCase();
  if (!text) return false;
  if (text.includes('schema cache') || text.includes('pgrst204')) return true;
  return DOCUMENTS_UPSERT_COLUMNS.some((col) =>
    new RegExp(`could not find the ['"]?${col}['"]? column`).test(text)
  );
}

/** Which documents.* column PostgREST complained about (if any). */
export function missingDocumentsColumn(err: unknown): string | null {
  const text = errorText(err);
  const m = text.match(/could not find the ['"]?(\w+)['"]? column of ['"]?documents['"]?/i);
  return m?.[1]?.toLowerCase() || null;
}

/** Postgres 23502 / not-null when a live column rejects null (e.g. module_code). */
export function isNotNullConstraintError(err: unknown): boolean {
  const text = errorText(err).toLowerCase();
  if (!text) return false;
  return (
    text.includes('23502') ||
    (text.includes('null value in column') && text.includes('violates not-null'))
  );
}

export function formatDocumentsSchemaError(err: unknown): string {
  const raw = errorText(err) || 'Cloud save failed.';
  if (isNotNullConstraintError(err)) {
    return (
      'Smart Notes cloud save failed: a documents column rejected null ' +
      '(often module_code when General / no module is selected). In Supabase SQL editor run ' +
      'supabase/v3.1.5-documents-module-code.sql, then Project Settings → API → Reload schema. ' +
      'Your note was kept locally if possible.'
    );
  }
  if (isSchemaCacheError(err)) {
    const col = missingDocumentsColumn(err) || 'content / summary / glossary';
    return (
      `Smart Notes cloud save failed: documents.${col} is missing ` +
      'or the Supabase PostgREST schema cache is stale. In Supabase SQL editor run ' +
      'supabase/v3.1.5-documents-module-code.sql (or v3.1.4-documents-load.sql / the documents ' +
      'columns block in supabase/schema.sql), then Project Settings → API → Reload schema ' +
      "(or NOTIFY pgrst, 'reload schema'). Your note was kept locally if possible."
    );
  }
  return raw;
}

/** Surface the real PostgREST error for Smart Notes list/load failures. */
export function formatDocumentsLoadError(err: unknown): string {
  const raw = errorText(err);
  if (!raw) return 'Documents load failed.';
  if (isSchemaCacheError(err)) {
    const col = missingDocumentsColumn(err) || 'content / summary / glossary / created_at';
    return (
      `Documents load failed: documents.${col} is missing or the PostgREST schema cache is stale. ` +
      'Run supabase/v3.1.5-documents-module-code.sql (or v3.1.4-documents-load.sql), then Project Settings → API → Reload schema. ' +
      `(${raw})`
    );
  }
  return `Documents load failed: ${raw}`;
}

/** Canonical columns for Smart Notes selects (matches consolidated documents schema). */
const DOCUMENTS_SELECT =
  'id, user_id, module_code, title, content, summary, glossary, created_at';

/**
 * Fetch documents rows with resilient select/order fallbacks.
 * Prefer explicit columns; fall back when created_at/order or schema cache breaks.
 */
async function fetchDocumentsRows(): Promise<{
  data: Record<string, unknown>[] | null;
  error: unknown;
}> {
  const ordered = await supabase
    .from('documents')
    .select(DOCUMENTS_SELECT)
    .order('created_at', { ascending: false });

  if (!ordered.error) {
    return { data: (ordered.data as Record<string, unknown>[]) || [], error: null };
  }

  const orderedErr = ordered.error;
  const orderedText = errorText(orderedErr);

  // Missing / uncached created_at → retry without ORDER BY
  if (/created_at/i.test(orderedText) || isSchemaCacheError(orderedErr)) {
    const noOrder = await supabase.from('documents').select(DOCUMENTS_SELECT);
    if (!noOrder.error) {
      const rows = (noOrder.data as Record<string, unknown>[]) || [];
      rows.sort((a, b) => {
        const ta = new Date(String(a.created_at || 0)).getTime();
        const tb = new Date(String(b.created_at || 0)).getTime();
        return tb - ta;
      });
      return { data: rows, error: null };
    }

    // Column list rejected → try select *
    const starOrdered = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (!starOrdered.error) {
      return { data: (starOrdered.data as Record<string, unknown>[]) || [], error: null };
    }

    const star = await supabase.from('documents').select('*');
    if (!star.error) {
      const rows = (star.data as Record<string, unknown>[]) || [];
      rows.sort((a, b) => {
        const ta = new Date(String(a.created_at || 0)).getTime();
        const tb = new Date(String(b.created_at || 0)).getTime();
        return tb - ta;
      });
      return { data: rows, error: null };
    }

    return { data: null, error: star.error || starOrdered.error || noOrder.error || orderedErr };
  }

  return { data: null, error: orderedErr };
}

function mergeById(cloud: FiosDocument[], local: FiosDocument[]): FiosDocument[] {
  const map = new Map<string, FiosDocument>();
  for (const d of cloud) map.set(d.id, d);
  for (const d of local) {
    if (!map.has(d.id)) map.set(d.id, d);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** General / no module → empty string (never null) so NOT NULL live columns accept the row. */
function normalizeModuleCodeForWrite(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function buildPayload(userId: string, doc: Partial<FiosDocument>) {
  return {
    user_id: userId,
    title: doc.title || 'Untitled Document',
    content: doc.content || '',
    // Match consolidated schema: summary text not null default ''
    summary: doc.summary == null || doc.summary === '' ? '' : String(doc.summary),
    glossary: parseGlossary(doc.glossary ?? []),
    // Never upsert module_code: null — General uses '' (canonical: nullable text, default '')
    module_code: normalizeModuleCodeForWrite(doc.module_code),
  };
}

/**
 * Insert preferring the canonical `content` column. If PostgREST rejects a
 * column (stale cache / missing glossary|summary|content), strip the reported
 * column and/or try legacy body aliases so Summarize still lands somewhere —
 * local IndexedDB remains the final fallback.
 */
async function insertWithColumnFallback(
  payload: ReturnType<typeof buildPayload>
): Promise<{ data: Record<string, unknown> | null; error: unknown; usedColumn: string }> {
  const primary = await supabase.from('documents').insert(payload).select().single();
  if (!primary.error) {
    return { data: primary.data as Record<string, unknown>, error: null, usedColumn: DOCUMENTS_CONTENT_COLUMN };
  }

  if (!isSchemaCacheError(primary.error)) {
    return { data: null, error: primary.error, usedColumn: DOCUMENTS_CONTENT_COLUMN };
  }

  // If glossary / summary / module_code is missing, retry without those fields
  // so a DB that only has title+content still accepts the note body.
  let working: Record<string, unknown> = { ...payload };
  let lastError: unknown = primary.error;
  for (let i = 0; i < 4; i++) {
    const missing = missingDocumentsColumn(lastError);
    if (!missing || !(missing in working) || missing === 'content') break;
    const { [missing]: _dropped, ...rest } = working;
    void _dropped;
    working = rest;
    console.warn(`[documents] retrying insert without missing column "${missing}"`);
    const attempt = await supabase.from('documents').insert(working).select().single();
    if (!attempt.error) {
      return { data: attempt.data as Record<string, unknown>, error: null, usedColumn: DOCUMENTS_CONTENT_COLUMN };
    }
    lastError = attempt.error;
    if (!isSchemaCacheError(attempt.error)) {
      return { data: null, error: attempt.error, usedColumn: DOCUMENTS_CONTENT_COLUMN };
    }
  }

  const body = String(working.content ?? payload.content ?? '');
  for (const alias of LEGACY_BODY_KEYS) {
    const { content: _ignoredContent, ...rest } = working;
    void _ignoredContent;
    const altPayload = { ...rest, [alias]: body };
    const attempt = await supabase.from('documents').insert(altPayload).select().single();
    if (!attempt.error) {
      console.warn(`[documents] inserted using legacy column "${alias}" — align DB to documents.content`);
      return { data: attempt.data as Record<string, unknown>, error: null, usedColumn: alias };
    }
    if (!isSchemaCacheError(attempt.error)) {
      return { data: null, error: attempt.error, usedColumn: alias };
    }
    lastError = attempt.error;
  }

  return { data: null, error: lastError || primary.error, usedColumn: DOCUMENTS_CONTENT_COLUMN };
}

export type DocumentsQueryResult = {
  documents: FiosDocument[];
  /** Real PostgREST / schema error when cloud load failed (local docs may still be present). */
  loadError?: string;
};

/**
 * Load Smart Notes. Never swallows PostgREST errors silently — callers should
 * surface `loadError` in the UI. Local IndexedDB notes are always merged in.
 */
export async function getDocuments(): Promise<DocumentsQueryResult> {
  if (IS_DEMO) return { documents: [...demoDocState] };

  const local = await listLocalDocuments();
  const localDocs = local.map((d) => normalizeDocument(d));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { documents: localDocs };

  const { data, error } = await fetchDocumentsRows();

  if (error) {
    console.error('Error loading documents:', error);
    return {
      documents: mergeById([], localDocs),
      loadError: formatDocumentsLoadError(error),
    };
  }

  let cloud: FiosDocument[] = [];
  try {
    cloud = ((data as Record<string, unknown>[]) || []).map((row) => normalizeDocument(row));
  } catch (parseErr) {
    console.error('Error parsing documents:', parseErr);
    return {
      documents: mergeById([], localDocs),
      loadError: formatDocumentsLoadError(parseErr),
    };
  }

  return { documents: mergeById(cloud, localDocs) };
}

export async function saveDocument(doc: Partial<FiosDocument>): Promise<SaveDocumentResult> {
  if (IS_DEMO) {
    const saved: FiosDocument = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      title: doc.title || 'Untitled Document',
      content: doc.content || '',
      summary: doc.summary ?? '',
      glossary: parseGlossary(doc.glossary ?? []),
      module_code: normalizeModuleCodeForWrite(doc.module_code) || null,
      created_at: new Date().toISOString(),
    };
    demoDocState = [saved, ...demoDocState];
    return saved;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const payload = buildPayload(user.id, doc);
  const { data, error, usedColumn } = await insertWithColumnFallback(payload);

  if (!error && data) {
    const normalized = normalizeDocument(data);
    // If we had to use a legacy column, still expose `content` on the client.
    if (usedColumn !== DOCUMENTS_CONTENT_COLUMN && !normalized.content) {
      normalized.content = payload.content;
    }
    return normalized;
  }

  // Cloud upsert failed — keep summarize usable via IndexedDB fallback.
  const localDoc: FiosDocument = {
    id: crypto.randomUUID(),
    user_id: user.id,
    title: payload.title,
    content: payload.content,
    summary: payload.summary,
    glossary: payload.glossary as FiosDocument['glossary'],
    module_code: payload.module_code,
    created_at: new Date().toISOString(),
  };

  try {
    await putLocalDocument(localDoc);
  } catch (localErr) {
    console.error('[documents] local fallback failed', localErr);
    throw new Error(formatDocumentsSchemaError(error));
  }

  const warning = formatDocumentsSchemaError(error);
  return { ...localDoc, savedLocally: true, cloudWarning: warning };
}

export async function deleteDocument(id: string): Promise<void> {
  if (IS_DEMO) {
    demoDocState = demoDocState.filter((d) => d.id !== id);
    return;
  }
  await removeLocalDocument(id);
  // note_chunks cascade on document_id when FK is present; also clear explicitly
  await supabase.from('note_chunks').delete().eq('document_id', id);
  const { error } = await supabase.from('documents').delete().eq('id', id);
  // Ignore not-found for local-only rows that never reached the cloud.
  if (error && !/0 rows|not find|PGRST116/i.test(errorText(error))) {
    throw error;
  }
}

export async function updateDocumentTitle(id: string, title: string): Promise<void> {
  const next = title.trim() || 'Untitled Document';
  if (IS_DEMO) {
    demoDocState = demoDocState.map((d) => (d.id === id ? { ...d, title: next } : d));
    return;
  }

  const locals = await listLocalDocuments();
  const localHit = locals.find((d) => d.id === id);
  if (localHit) {
    await putLocalDocument({ ...localHit, title: next });
  }

  const { error } = await supabase.from('documents').update({ title: next }).eq('id', id);
  if (error && localHit) return; // local-only is fine
  if (error) throw error;
}
