/**
 * Public support inbox shown in the UI.
 * Prefer `VITE_SUPPORT_EMAIL`; fall back to the operator inbox used in production.
 */
export const DEFAULT_SUPPORT_EMAIL = 'oryn02@gmail.com';

export function getSupportEmail(): string {
  const fromEnv = String(import.meta.env.VITE_SUPPORT_EMAIL || '').trim();
  return fromEnv || DEFAULT_SUPPORT_EMAIL;
}

export function hasConfiguredSupportEmail(): boolean {
  return !!String(import.meta.env.VITE_SUPPORT_EMAIL || '').trim() || !!DEFAULT_SUPPORT_EMAIL;
}
