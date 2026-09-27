import React from 'react';
import {
  CandyCane,
  Clover,
  Coins,
  Egg,
  Flame,
  Flower2,
  Ghost,
  Gift,
  Moon,
  Rabbit,
  Rainbow,
  Skull,
  Snowflake,
  Star,
  TreePine,
  type LucideProps,
  type LucideIcon,
} from 'lucide-react';

/** Minimal Lucide-compatible bat silhouette (lucide has no Bat). */
const BatIcon: LucideIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, className, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d="M12 14c1.2-2.4 2-4.2 2-6.2A2 2 0 0 0 10 8c0 2 .8 3.8 2 6.2Z" />
      <path d="M12 14c-1.2-2.4-2-4.2-2-6.2A2 2 0 0 1 14 8c0 2-.8 3.8-2 6.2Z" />
      <path d="M3 11c2.5-.5 4.2.3 5.5 2.2L12 18l3.5-4.8C16.8 11.3 18.5 10.5 21 11c-1.8 1.4-2.6 3.2-2.2 5.5-.8-.4-1.8-.5-2.8-.2L12 18l-4-1.7c-1-.3-2-.2-2.8.2.4-2.3-.4-4.1-2.2-5.5Z" />
    </svg>
  )
);
BatIcon.displayName = 'BatIcon';

/** Soft leprechaun cue — hat + smile (lucide has no Leprechaun). */
const LeprechaunIcon: LucideIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, className, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d="M7 9h10l-1.2-3.2A2 2 0 0 0 13.9 4h-3.8a2 2 0 0 0-1.9 1.8L7 9Z" />
      <path d="M5 9h14" />
      <circle cx="12" cy="15" r="5" />
      <path d="M10 15.5h4" />
      <path d="M10 13.5v.5" />
      <path d="M14 13.5v.5" />
      <path d="M9 19.5c.8.7 1.9 1.1 3 1.1s2.2-.4 3-1.1" />
    </svg>
  )
);
LeprechaunIcon.displayName = 'LeprechaunIcon';

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
  easter: Rabbit,
  'st-patrick': Clover,
};

/**
 * Secondary motifs for ambience particles / admin preview flair.
 * Per-family sets stay distinct — Christmas keeps candy canes; Halloween does not.
 */
export const HOLIDAY_MOTIF_ICONS: Record<FestiveFamily, LucideIcon[]> = {
  halloween: [Ghost, Skull, Flame, BatIcon, Moon],
  christmas: [TreePine, Snowflake, Gift, CandyCane],
  easter: [Rabbit, Egg, Star, Flower2],
  'st-patrick': [Clover, Rainbow, LeprechaunIcon, Coins],
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
