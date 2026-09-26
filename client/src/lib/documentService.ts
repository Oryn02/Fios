import { supabase } from './supabase';
import type { FiosDocument } from '../types/db';
import { IS_DEMO, demoDocuments } from './demo';

let demoDocState: FiosDocument[] = [...demoDocuments];

export async function getDocuments(): Promise<FiosDocument[]> {
  if (IS_DEMO) return [...demoDocState];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading documents:', error);
    throw new Error(error.message || 'Failed to load documents');
  }
  return (data as FiosDocument[]) || [];
}

/** Fetch one document by id — throws a clear error when missing (not a silent empty). */
export async function getDocumentById(id: string): Promise<FiosDocument> {
  if (!id?.trim()) throw new Error('Document id is required');
  if (IS_DEMO) {
    const found = demoDocState.find((d) => d.id === id);
    if (!found) throw new Error('Document not found');
    return found;
  }
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load document');
  if (!data) throw new Error('Document not found');
  return data as FiosDocument;
}

export async function saveDocument(doc: Partial<FiosDocument>): Promise<FiosDocument> {
  if (IS_DEMO) {
    const saved: FiosDocument = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      title: doc.title || 'Untitled Document',
      content: doc.content || '',
      summary: doc.summary || null,
      glossary: doc.glossary || [],
      module_code: doc.module_code || null,
      created_at: new Date().toISOString(),
    };
    demoDocState = [saved, ...demoDocState];
    return saved;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title: doc.title || 'Untitled Document',
      content: doc.content || '',
      summary: doc.summary || null,
      glossary: doc.glossary || [],
      module_code: doc.module_code || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FiosDocument;
}

export async function deleteDocument(id: string): Promise<void> {
  if (IS_DEMO) {
    demoDocState = demoDocState.filter((d) => d.id !== id);
    return;
  }
  // note_chunks cascade on document_id when FK is present; also clear explicitly
  await supabase.from('note_chunks').delete().eq('document_id', id);
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}
