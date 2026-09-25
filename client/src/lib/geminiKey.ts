// Holds the current user's BYO Gemini key so the non-React API service layer can
// attach it to requests. ProfileContext keeps this in sync with the profile.
let currentKey: string | null = null;

export function setGeminiKey(key: string | null): void {
  currentKey = key && key.trim() ? key.trim() : null;
}

export function getGeminiKey(): string | null {
  return currentKey;
}

export function hasGeminiKey(): boolean {
  return !!currentKey;
}
