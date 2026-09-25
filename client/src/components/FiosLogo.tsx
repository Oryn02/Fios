import React, { useId } from 'react';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface FiosLogoProps {
  size?: LogoSize;
  withWordmark?: boolean;
  /** When true, always render the signature emerald→teal gradient (used on the fixed-theme landing page). */
  fixedEmerald?: boolean;
  className?: string;
}

const ICON_PX: Record<LogoSize, number> = { sm: 24, md: 32, lg: 44, xl: 64 };
const TEXT_CLASS: Record<LogoSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

/**
 * Fios brandmark — an abstract open book (knowledge) with a rising spark
 * (insight), built from clean geometric lines. Recolours with the active
 * accent via CSS variables unless `fixedEmerald` is set.
 */
export const FiosLogo: React.FC<FiosLogoProps> = ({
  size = 'md',
  withWordmark = true,
  fixedEmerald = false,
  className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const gradId = `fios-grad-${id}`;
  const px = ICON_PX[size];

  const from = fixedEmerald ? '#34d399' : 'var(--fios-accent-from, #34d399)';
  const to = fixedEmerald ? '#14b8a6' : 'var(--fios-accent-to, #22d3ee)';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Fios logo"
      >
        <defs>
          <linearGradient id={gradId} x1="6" y1="6" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>

        {/* Rounded badge outline */}
        <rect x="1.25" y="1.25" width="45.5" height="45.5" rx="11" stroke={`url(#${gradId})`} strokeWidth="2.5" opacity="0.55" />

        {/* Open book — two angled pages meeting at a spine */}
        <path
          d="M24 16.5C21 14.4 17.6 13.6 13.5 14.2C12.7 14.3 12 15 12 15.9V32.4C12 33.4 12.9 34.2 13.9 34C17.6 33.5 21 34.2 24 36"
          stroke={`url(#${gradId})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 16.5C27 14.4 30.4 13.6 34.5 14.2C35.3 14.3 36 15 36 15.9V32.4C36 33.4 35.1 34.2 34.1 34C30.4 33.5 27 34.2 24 36"
          stroke={`url(#${gradId})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Spine */}
        <path d="M24 16.5V36" stroke={`url(#${gradId})`} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />

        {/* Knowledge spark rising from the book */}
        <path
          d="M24 5.5L25.4 9L29 10.4L25.4 11.8L24 15.3L22.6 11.8L19 10.4L22.6 9L24 5.5Z"
          fill={`url(#${gradId})`}
        />
      </svg>

      {withWordmark && (
        <span className={`font-black italic tracking-tight leading-none ${TEXT_CLASS[size]}`}>
          <span className="text-white">Fios</span>
        </span>
      )}
    </span>
  );
};

export default FiosLogo;
