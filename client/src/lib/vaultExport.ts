/**
 * Obsidian / Markdown vault export — POST /api/vault/export-module, zip with JSZip, download.
 */
import JSZip from 'jszip';
import { exportVaultModule } from '../services/studyApi';

export interface VaultFile {
  path?: string;
  name?: string;
  content?: string;
  body?: string;
}

export async function downloadModuleVault(moduleCode: string): Promise<void> {
  const data = await exportVaultModule(moduleCode);
  const files: VaultFile[] = Array.isArray(data.files)
    ? data.files
    : Array.isArray(data.entries)
      ? data.entries
      : [];

  if (!files.length && data.markdown) {
    files.push({ path: `${moduleCode || 'module'}.md`, content: String(data.markdown) });
  }
  if (!files.length && typeof data === 'object') {
    for (const [path, content] of Object.entries(data as Record<string, unknown>)) {
      if (path === 'files' || path === 'entries' || path === 'error' || path === 'markdown') continue;
      if (typeof content === 'string') files.push({ path, content });
    }
  }
  if (!files.length) {
    throw new Error('Vault export returned no files');
  }

  const zip = new JSZip();
  for (const f of files) {
    const path = String(f.path || f.name || 'note.md').replace(/^\/+/, '');
    zip.file(path, f.content || f.body || '');
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fios-vault-${(moduleCode || 'module').replace(/[^\w\-]+/g, '_')}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
