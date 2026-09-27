import React from 'react';
import {
  CandyCane,
  Clover,
  Egg,
  Flame,
  Flower2,
  Ghost,
  Gift,
  Moon,
  Snowflake,
  Sparkles,
  TreePine,
  type LucideIcon,
} from 'lucide-react';

/** Holiday theme families that get festive chrome (matches HolidayAmbience). */
export const FESTIVE_FAMILIES = new Set([
  'halloween',
  'christmas',
  'easter',
  'st-patrick',
]);

export type FestiveFamily = 'halloween' | 'christmas' | 'easter' | 'st-patrick';

/** Primary chrome icon per holiday — layered on top of accent gradients. */
export const HOLIDAY_PRIMARY_ICON: Record<FestiveFamily, LucideIcon> = {
  halloween: Ghost,
  christmas: TreePine,
  easter: Egg,
  'st-patrick': Clover,
};

/** Secondary motifs for ambience particles / admin preview flair. */
export const HOLIDAY_MOTIF_ICONS: Record<FestiveFamily, LucideIcon[]> = {
  halloween: [Ghost, Moon, Flame, CandyCane],
  christmas: [TreePine, Snowflake, Gift, CandyCane],
  easter: [Egg, Sparkles, Flower2, Clover],
  'st-patrick': [Clover, Sparkles, Flame, Gift],
};

interface HolidayMotifProps {
  themeFamily: string | null | undefined;
  /** Prefer secondary index for particle variety (0 = primary). */
  variant?: number;
  className?: string;
  size?: number;
  strokeWidth?: number;
  title?: string;
}

export function isFestiveFamily(family: string | null | undefined): family is FestiveFamily {
  return !!family && FESTIVE_FAMILIES.has(family);
}

/**
 * Festive icon for app chrome / admin tiles when a holiday theme is active.
 * Returns null for non-festive families so callers keep default accents.
 */
export const HolidayMotif: React.FC<HolidayMotifProps> = ({
  themeFamily,
  variant = 0,
  className = '',
  size = 16,
  strokeWidth = 2.25,
  title,
}) => {
  if (!isFestiveFamily(themeFamily)) return null;
  const icons = HOLIDAY_MOTIF_ICONS[themeFamily];
  const Icon = icons[Math.abs(variant) % icons.length] || HOLIDAY_PRIMARY_ICON[themeFamily];
  return (
    <Icon
      className={className}
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    />
  );
};

export default HolidayMotif;
