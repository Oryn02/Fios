/**
 * Clean numeric parse for grade weights/scores/targets.
 * Strips leading zeros ("039" → 39) and rejects NaN.
 */
export function parseCleanNumber(
  raw: string | number | null | undefined,
  fallback: number | null = null
): number | null {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return fallback;
    return raw;
  }
  const trimmed = String(raw).trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') return fallback;
  // Remove leading zeros but keep "0" / "0.5"
  const normalized = trimmed.replace(/^(-?)0+(?=\d)/, '$1');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

/** Format for controlled number inputs — no leading zeros. */
export function formatCleanNumber(n: number | null | undefined, empty = ''): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return empty;
  // Avoid scientific notation for typical 0–100 grade fields
  return String(n);
}
