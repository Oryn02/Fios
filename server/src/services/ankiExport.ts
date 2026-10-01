import { createRequire } from 'node:module';

export type AnkiCardInput = {
  front: string;
  back: string;
};

/**
 * Build an Anki .apkg buffer from flashcard front/back pairs.
 * Uses anki-apkg-export (CJS) via createRequire for ESM interop.
 */
export async function buildAnkiApkg(
  deckName: string,
  cards: AnkiCardInput[]
): Promise<Buffer> {
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AnkiExport = require('anki-apkg-export').default || require('anki-apkg-export');
  const apkg = new AnkiExport(deckName || 'Fios Deck');
  for (const c of cards) {
    const front = String(c.front || '').trim() || '…';
    const back = String(c.back || '').trim() || '…';
    apkg.addCard(front, back);
  }
  const zip: ArrayBuffer | Buffer | Uint8Array = await apkg.save();
  if (Buffer.isBuffer(zip)) return zip;
  if (zip instanceof ArrayBuffer) return Buffer.from(zip);
  return Buffer.from(zip);
}
