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

/** Column name from `null value in column "X" … violates not-null` (23502). */
export function notNullRejectedColumn(err: unknown): string | null {
  const text = errorText(err);
  const m = text.match(/null value in column ["'`]?(\w+)["'`]?/i);
  return m?.[1]?.toLowerCase() || null;
}

/**
 * Empty write defaults for documents.* so NOT NULL live columns accept the row.
 * Body aliases (body/text/notes) mirror `content`.
 */
export function emptyDefaultForDocumentsColumn(
  column: string,
  payload: { content?: string; title?: string; summary?: string; glossary?: unknown }
): unknown {
  const col = column.toLowerCase();
  if (col === 'glossary') return parseGlossary(payload.glossary ?? []);
  if (col === 'module_code' || col === 'summary') return '';
  if (col === 'title') return payload.title || 'Untitled Document';
  if (
    col === 'content' ||
    col === 'body' ||
    col === 'text' ||
    col === 'notes' ||
    col === 'note'
  ) {
    return payload.content || '';
  }
  // Unknown text-ish columns: prefer '' over omitting (omitting still inserts NULL).
  return '';
}

export function formatDocumentsSchemaError(err: unknown): string {
  const raw = errorText(err) || 'Cloud save failed.';
  if (isNotNullConstraintError(err)) {
    const col = notNullRejectedColumn(err);
    const colHint = col
      ? `documents.${col} rejected null`
      : 'a documents column rejected null (often module_code / summary / legacy body when General is selected)';
    return (
      `Smart Notes cloud save failed: ${colHint}. ` +
      'In Supabase SQL editor run supabase/v3.1.5-documents-module-code.sql, then Project Settings → API → Reload schema. ' +
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

type DocumentsInsertPayload = ReturnType<typeof buildPayload> & Record<string, unknown>;

function isReturningEmptyError(err: unknown): boolean {
  const text = errorText(err);
  return /pgrst116|contains 0 rows|multiple \(or no\) rows returned/i.test(text);
}

async function tryDocumentsInsert(
  row: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
  const withId: Record<string, unknown> = {
    ...row,
    id: typeof row.id === 'string' && row.id ? row.id : crypto.randomUUID(),
  };
  const result = await supabase.from('documents').insert(withId).select().single();
  if (!result.error && result.data) {
    return { data: result.data as Record<string, unknown>, error: null };
  }
  // Insert committed but RETURNING returned no row (RLS) — do not local-fallback /
  // cloudWarning; the note is already in documents under withId.id.
  if ((!result.error && !result.data) || isReturningEmptyError(result.error)) {
    const existingCreated = withId['created_at'];
    return {
      data: {
        ...withId,
        created_at:
          typeof existingCreated === 'string' ? existingCreated : new Date().toISOString(),
      },
      error: null,
    };
  }
  return { data: null, error: result.error };
}

/**
 * When Postgres 23502 names a column, fill an empty default and retry.
 * Also fills empty defaults for known optional columns still missing/null
 * so a second NOT NULL does not bounce us to IndexedDB + cloudWarning.
 */
function applyNotNullFix(
  working: Record<string, unknown>,
  err: unknown,
  payload: DocumentsInsertPayload
): { next: Record<string, unknown>; changed: boolean } {
  const rejected = notNullRejectedColumn(err);
  const next = { ...working };
  let changed = false;

  const setIfDifferent = (col: string, value: unknown) => {
    if (!(col in next) || next[col] === null || next[col] === undefined) {
      next[col] = value;
      changed = true;
      return;
    }
    // Only overwrite when the rejected column still does not match the safe default.
    if (rejected === col) {
      const same =
        Array.isArray(value) && Array.isArray(next[col])
          ? JSON.stringify(next[col]) === JSON.stringify(value)
          : next[col] === value;
      if (!same) {
        next[col] = value;
        changed = true;
      }
    }
  };

  setIfDifferent(
    'module_code',
    normalizeModuleCodeForWrite(payload.module_code as string | null | undefined)
  );
  setIfDifferent('summary', payload.summary == null ? '' : String(payload.summary));
  setIfDifferent('content', payload.content || '');
  setIfDifferent('title', payload.title || 'Untitled Document');
  setIfDifferent('glossary', parseGlossary(payload.glossary ?? []));

  if (rejected) {
    const value = emptyDefaultForDocumentsColumn(rejected, payload);
    if (!(rejected in next) || next[rejected] == null || next[rejected] === undefined) {
      next[rejected] = value;
      changed = true;
      console.warn(`[documents] retrying insert after 23502 on missing "${rejected}"`);
    } else {
      const same =
        Array.isArray(value) && Array.isArray(next[rejected])
          ? JSON.stringify(next[rejected]) === JSON.stringify(value)
          : next[rejected] === value;
      if (!same) {
        next[rejected] = value;
        changed = true;
        console.warn(`[documents] retrying insert after 23502 on "${rejected}"`);
      } else if (rejected === 'module_code' && 'module_code' in next) {
        // Already sending '' and still 23502 — omit column so DB DEFAULT '' applies
        // (covers odd coercions / triggers that nullify empty strings before check).
        delete next.module_code;
        changed = true;
        console.warn('[documents] retrying insert omitting module_code (use DB default)');
      }
    }
  }

  return { next, changed };
}

/**
 * Insert preferring the canonical `content` column.
 * Recovers from:
 *  - PostgREST PGRST204 / schema cache (strip missing cols, try legacy body aliases)
 *  - Postgres 23502 not-null (fill '' / [] for the rejected column — often module_code
 *    or a legacy body column) so General / no-module saves do not false-alarm
 *    with cloudWarning after IndexedDB fallback when the note is actually writable.
 */
async function insertWithColumnFallback(
  payload: ReturnType<typeof buildPayload>
): Promise<{ data: Record<string, unknown> | null; error: unknown; usedColumn: string }> {
  let working: Record<string, unknown> = { ...payload };
  // Never ship explicit nulls for optional module / summary.
  working.module_code = normalizeModuleCodeForWrite(
    working.module_code as string | null | undefined
  );
  working.summary =
    working.summary == null || working.summary === '' ? '' : String(working.summary);
  working.glossary = parseGlossary(working.glossary ?? []);
  working.content = working.content || '';
  working.title = working.title || 'Untitled Document';

  let lastError: unknown = null;
  let usedColumn: string = DOCUMENTS_CONTENT_COLUMN;

  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await tryDocumentsInsert(working);
    if (!result.error && result.data) {
      return { data: result.data, error: null, usedColumn };
    }
    lastError = result.error;

    if (isNotNullConstraintError(lastError)) {
      const { next, changed } = applyNotNullFix(working, lastError, payload);
      if (changed) {
        working = next;
        continue;
      }
      // Named column already set to empty default and still failing — stop.
      return { data: null, error: lastError, usedColumn };
    }

    if (isSchemaCacheError(lastError)) {
      const missing = missingDocumentsColumn(lastError);
      if (missing && missing in working && missing !== 'content') {
        const { [missing]: _dropped, ...rest } = working;
        void _dropped;
        working = rest;
        console.warn(`[documents] retrying insert without missing column "${missing}"`);
        continue;
      }

      // Prefer legacy body aliases when `content` is uncached / missing.
      const body = String(working.content ?? payload.content ?? '');
      let aliasProgress = false;
      for (const alias of LEGACY_BODY_KEYS) {
        if (alias in working && working[alias] === body) continue;
        const { content: _ignoredContent, ...rest } = working;
        void _ignoredContent;
        const altPayload = { ...rest, [alias]: body };
        const aliasAttempt = await tryDocumentsInsert(altPayload);
        if (!aliasAttempt.error && aliasAttempt.data) {
          console.warn(
            `[documents] inserted using legacy column "${alias}" — align DB to documents.content`
          );
          return { data: aliasAttempt.data, error: null, usedColumn: alias };
        }
        lastError = aliasAttempt.error;
        if (isNotNullConstraintError(lastError)) {
          const { next, changed } = applyNotNullFix(altPayload, lastError, payload);
          if (changed) {
            working = next;
            usedColumn = alias;
            aliasProgress = true;
            break;
          }
        }
        if (!isSchemaCacheError(lastError)) {
          return { data: null, error: lastError, usedColumn: alias };
        }
      }
      if (aliasProgress) continue;
    }

    // Non-recoverable error (RLS, FK, network, etc.)
    return { data: null, error: lastError, usedColumn };
  }

  return { data: null, error: lastError, usedColumn };
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
    // Prefer write-payload module_code ('') over a DB null echo for General.
    if (!normalized.module_code) {
      normalized.module_code = payload.module_code || null;
    }
    return normalized;
  }

  // Only reach here when cloud insert truly failed after not-null / schema retries.
  // Cloud upsert failed — keep summarize usable via IndexedDB fallback.
  const localDoc: FiosDocument = {
    id: crypto.randomUUID(),
    user_id: user.id,
    title: payload.title,
    content: payload.content,
    summary: payload.summary,
    glossary: payload.glossary as FiosDocument['glossary'],
    module_code: payload.module_code || null,
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
