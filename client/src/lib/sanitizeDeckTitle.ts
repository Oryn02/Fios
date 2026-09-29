/**
 * Strip markdown / list / dash artifacts from auto-generated deck titles
 * so card headers and module badges don't wrap or break layouts.
 */
export function sanitizeDeckTitle(raw: string | null | undefined, fallback = 'Untitled Deck'): string {
  if (!raw || typeof raw !== 'string') return fallback;

  let t = raw
    // Strip fenced / heading / emphasis leftovers at edges
    .replace(/^[\s>#*_`~]+/, '')
    .replace(/[\s*_`~]+$/, '')
    // Leading markdown list / thematic-break dashes
    .replace(/^[-–—]{1,}\s*/, '')
    .replace(/\s+[-–—]{2,}\s+/g, ' — ')
    // Collapse leftover bullet markers mid-string
    .replace(/\s+[•·]\s+/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Drop a trailing ellipsis-only / dash-only residue
  t = t.replace(/[-–—.…]+$/, '').trim();

  if (!t) return fallback;
  // Cap extreme lengths that break mobile headers
  if (t.length > 80) t = `${t.slice(0, 77).trimEnd()}…`;
  return t;
}

export default sanitizeDeckTitle;
