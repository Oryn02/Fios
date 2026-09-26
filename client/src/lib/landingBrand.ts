/**
 * Lock the marketing / logged-out surface to the default Fios emerald brand
 * (and dark chrome) regardless of saved Settings theme/accent.
 * ThemeProvider is not mounted on landing; the HTML boot script still applies
 * stored accent vars — this overrides them for the duration of the landing view.
 */
export const LANDING_EMERALD = {
  from: '#34d399',
  via: '#2dd4bf',
  to: '#14b8a6',
  solid: '#34d399',
} as const;

const ACCENT_KEYS = [
  '--fios-accent-from',
  '--fios-accent-via',
  '--fios-accent-to',
  '--fios-accent-solid',
] as const;

export function lockLandingBrand(): () => void {
  const root = document.documentElement;
  const prev = {
    theme: root.getAttribute('data-theme'),
    accent: root.dataset.accent,
    classLight: root.classList.contains('light'),
    classDark: root.classList.contains('dark'),
    vars: ACCENT_KEYS.map((k) => [k, root.style.getPropertyValue(k)] as const),
    meta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
  };

  root.setAttribute('data-landing-active', 'true');
  root.setAttribute('data-theme', 'dark');
  root.classList.remove('light');
  root.classList.add('dark');
  root.style.setProperty('--fios-accent-from', LANDING_EMERALD.from);
  root.style.setProperty('--fios-accent-via', LANDING_EMERALD.via);
  root.style.setProperty('--fios-accent-to', LANDING_EMERALD.to);
  root.style.setProperty('--fios-accent-solid', LANDING_EMERALD.solid);
  root.dataset.accent = 'emerald';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#07090e');

  return () => {
    root.removeAttribute('data-landing-active');
    // Dashboard ThemeProvider re-applies stored theme/accent on mount.
    // Restore boot values only if ThemeProvider is not about to take over.
    if (prev.theme) root.setAttribute('data-theme', prev.theme);
    else root.removeAttribute('data-theme');
    if (prev.accent) root.dataset.accent = prev.accent;
    else delete root.dataset.accent;
    root.classList.toggle('light', prev.classLight);
    root.classList.toggle('dark', prev.classDark);
    for (const [k, v] of prev.vars) {
      if (v) root.style.setProperty(k, v);
      else root.style.removeProperty(k);
    }
    if (meta && prev.meta != null) meta.setAttribute('content', prev.meta);
  };
}
