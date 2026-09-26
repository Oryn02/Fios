/**
 * Client-side semantic-ish chunking (~500 words + overlap).
 * Mirrors `server/src/geminiService.ts#chunkText` so notes can be indexed
 * into Supabase `note_chunks` without a round-trip.
 */

function wordCount(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function chunkText(
  text: string,
  targetWords: number = 500,
  overlapWords: number = 50
): string[] {
  const normalized = (text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  if (wordCount(normalized) <= targetWords) return [normalized];

  const paragraphs = normalized.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  const units: string[] = [];
  for (const para of paragraphs) {
    if (wordCount(para) <= targetWords) {
      units.push(para);
    } else {
      const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para];
      for (const s of sentences) {
        const t = s.trim();
        if (t) units.push(t);
      }
    }
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push(current.join('\n\n'));
    if (overlapWords > 0) {
      const words = chunks[chunks.length - 1].split(/\s+/);
      const overlap = words.slice(-Math.min(overlapWords, words.length)).join(' ');
      current = overlap ? [overlap] : [];
      currentWords = wordCount(overlap);
    } else {
      current = [];
      currentWords = 0;
    }
  };

  for (const unit of units) {
    const w = wordCount(unit);
    if (currentWords + w > targetWords && current.length > 0) flush();
    current.push(unit);
    currentWords += w;
  }
  flush();

  // Drop pure-overlap duplicates that can appear as trailing stubs
  return chunks.filter((c) => wordCount(c) > overlapWords / 2 || chunks.length === 1);
}
