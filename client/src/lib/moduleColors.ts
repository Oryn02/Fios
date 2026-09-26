/**
 * Module accent palette — paired solid/text/bg/border tokens for dark + light.
 * Keys are stored on `modules.color`; legacy keys map to the rich set.
 */

export interface ModuleColorDef {
  key: string;
  label: string;
  /** Hex solid (dark UI) — also used for left borders / pills */
  solid: string;
  /** Hex solid tuned for light cream surfaces */
  solidLight: string;
}

/** Canonical rich palette (v2.2.3). */
export const MODULE_COLORS: ModuleColorDef[] = [
  { key: 'deep-emerald', label: 'Deep Emerald', solid: '#10b981', solidLight: '#047857' },
  { key: 'vibrant-indigo', label: 'Vibrant Indigo', solid: '#818cf8', solidLight: '#4338ca' },
  { key: 'sunset-amber', label: 'Sunset Amber', solid: '#fbbf24', solidLight: '#b45309' },
  { key: 'slate-teal', label: 'Slate Teal', solid: '#2dd4bf', solidLight: '#0f766e' },
  { key: 'rose-quartz', label: 'Rose Quartz', solid: '#fb7185', solidLight: '#be123c' },
  { key: 'neon-violet', label: 'Neon Violet', solid: '#c084fc', solidLight: '#7e22ce' },
  { key: 'ocean-cyan', label: 'Ocean Cyan', solid: '#22d3ee', solidLight: '#0e7490' },
  { key: 'copper', label: 'Copper', solid: '#f59e0b', solidLight: '#c2410c' },
  { key: 'glacier', label: 'Glacier', solid: '#67e8f9', solidLight: '#0369a1' },
  { key: 'lime', label: 'Lime', solid: '#a3e635', solidLight: '#4d7c0f' },
];

/** Legacy DB values → canonical keys */
const LEGACY_ALIASES: Record<string, string> = {
  emerald: 'deep-emerald',
  cyan: 'ocean-cyan',
  indigo: 'vibrant-indigo',
  amber: 'sunset-amber',
  rose: 'rose-quartz',
  purple: 'neon-violet',
  teal: 'slate-teal',
  violet: 'neon-violet',
};

const KEY_SET = new Set(MODULE_COLORS.map((c) => c.key));

export function normalizeModuleColor(raw: string | null | undefined): string {
  if (!raw) return 'deep-emerald';
  const key = raw.trim().toLowerCase();
  if (KEY_SET.has(key)) return key;
  if (LEGACY_ALIASES[key]) return LEGACY_ALIASES[key];
  return 'deep-emerald';
}

export function getModuleColorDef(raw: string | null | undefined): ModuleColorDef {
  const key = normalizeModuleColor(raw);
  return MODULE_COLORS.find((c) => c.key === key) || MODULE_COLORS[0];
}

/** Stable hash → palette key for titles without a linked module. */
export function colorKeyForSubject(title: string | null | undefined): string {
  const s = (title || 'class').trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return MODULE_COLORS[h % MODULE_COLORS.length].key;
}

/**
 * Resolve a class/event color: prefer module map by code match in title,
 * else hash the title.
 */
export function resolveSubjectColorKey(
  title: string,
  modules?: { code: string; color: string }[]
): string {
  if (modules?.length) {
    const upper = title.toUpperCase();
    const hit = modules.find((m) => m.code && upper.includes(m.code.toUpperCase()));
    if (hit) return normalizeModuleColor(hit.color);
  }
  return colorKeyForSubject(title);
}

/** Tailwind-free class helpers using CSS vars set by `data-mod-color`. */
export const MOD_BADGE_CLASS =
  'mod-badge inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase rounded border tracking-widest';

export const MOD_PILL_CLASS =
  'mod-pill inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold truncate rounded border';

export const MOD_CARD_ACCENT_CLASS = 'mod-card-accent';

/** COLOR_OPTIONS-shaped map for ModulesView pickers (badge uses CSS classes). */
export function buildColorOptions(): Record<string, { label: string; badge: string; border: string }> {
  const out: Record<string, { label: string; badge: string; border: string }> = {};
  for (const c of MODULE_COLORS) {
    out[c.key] = {
      label: c.label,
      badge: `${MOD_BADGE_CLASS}`,
      border: 'mod-border',
    };
  }
  // Legacy keys point at same styles so old picker state still works
  for (const [legacy, canon] of Object.entries(LEGACY_ALIASES)) {
    if (!out[legacy] && out[canon]) {
      out[legacy] = { ...out[canon], label: legacy.charAt(0).toUpperCase() + legacy.slice(1) };
    }
  }
  return out;
}
