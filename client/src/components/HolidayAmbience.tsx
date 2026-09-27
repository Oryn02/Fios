import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/** Theme families that receive atmospheric ambience (matches curated day-only themes). */
const AMBIENCE_FAMILIES = new Set(['halloween', 'christmas', 'easter', 'st-patrick']);

const PARTICLE_COUNTS: Record<string, number> = {
  halloween: 10,
  christmas: 12,
  easter: 9,
  'st-patrick': 8,
};

/**
 * Subtle festive atmosphere for the app shell when a holiday theme is active
 * (calendar day-auto or session preview). Landing marketing never mounts this.
 * Visuals are CSS-driven; prefers-reduced-motion / low-power disable motion.
 */
export const HolidayAmbience: React.FC = () => {
  const { holidayTheme } = useTheme();
  const family = holidayTheme?.themeFamily;

  const particles = useMemo(() => {
    if (!family || !AMBIENCE_FAMILIES.has(family)) return [];
    const n = PARTICLE_COUNTS[family] ?? 8;
    return Array.from({ length: n }, (_, i) => i);
  }, [family]);

  if (!family || !AMBIENCE_FAMILIES.has(family)) return null;

  return (
    <div
      className="fios-holiday-ambience"
      data-ambience={family}
      aria-hidden="true"
    >
      <div className="fios-holiday-wash" />
      <div className="fios-holiday-particles">
        {particles.map((i) => (
          <span
            key={i}
            className="fios-holiday-particle"
            style={{ '--i': i } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};
