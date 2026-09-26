/**
 * Public support inbox shown in the UI.
 * Prefer `VITE_SUPPORT_EMAIL`; fall back to a generic placeholder string for display
 * (never hard-code a personal address in source).
 */
export function getSupportEmail(): string {
  const fromEnv = String(import.meta.env.VITE_SUPPORT_EMAIL || '').trim();
  return fromEnv || 'support@example.com';
}

export function hasConfiguredSupportEmail(): boolean {
  const fromEnv = String(import.meta.env.VITE_SUPPORT_EMAIL || '').trim();
  return !!fromEnv && fromEnv !== 'support@example.com';
}
