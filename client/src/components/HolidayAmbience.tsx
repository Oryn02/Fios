import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { HolidayMotif, isFestiveFamily, HOLIDAY_MOTIF_ICONS, type FestiveFamily } from './HolidayMotif';

const PARTICLE_COUNTS: Record<FestiveFamily, number> = {
  halloween: 16,
  christmas: 20,
  easter: 14,
  'st-patrick': 14,
};

/**
 * Festive atmosphere for the app shell when a holiday theme is active
 * (calendar day-auto or admin session preview via ThemeContext.holidayTheme).
 * Landing marketing never mounts this — stays emerald.
 *
 * Layers on top of holiday accent/gradient palettes (does not replace them):
 * stronger color wash + holiday-specific motif particles (icons, not plain dots).
 * prefers-reduced-motion / low-power → static wash, no motion.
 */
export const HolidayAmbience: React.FC = () => {
  const { holidayTheme } = useTheme();
  const family = holidayTheme?.themeFamily;

  const particles = useMemo(() => {
    if (!isFestiveFamily(family)) return [];
    const n = PARTICLE_COUNTS[family];
    const iconCount = HOLIDAY_MOTIF_ICONS[family].length;
    return Array.from({ length: n }, (_, i) => ({
      i,
      variant: i % iconCount,
    }));
  }, [family]);

  if (!isFestiveFamily(family)) return null;

  return (
    <div
      className="fios-holiday-ambience"
      data-ambience={family}
      aria-hidden="true"
    >
      <div className="fios-holiday-wash" />
      <div className="fios-holiday-particles">
        {particles.map(({ i, variant }) => (
          <span
            key={i}
            className="fios-holiday-particle fios-holiday-motif"
            style={{ '--i': i } as React.CSSProperties}
          >
            <HolidayMotif themeFamily={family} variant={variant} size={14} strokeWidth={2} />
          </span>
        ))}
      </div>
    </div>
  );
};

export default HolidayAmbience;
