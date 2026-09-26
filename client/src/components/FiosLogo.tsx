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
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

/**
 * Fios brandmark — clean terminal brackets `</>` (no decorative dots / frame).
 * Square optical balance with ~20% padding and even stroke gaps; matches PWA icons.
 * Recolours with the active accent via CSS variables unless `fixedEmerald` is set.
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
  const via = fixedEmerald ? '#2dd4bf' : 'var(--fios-accent-via, #2dd4bf)';
  const to = fixedEmerald ? '#14b8a6' : 'var(--fios-accent-to, #22d3ee)';

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
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
          <linearGradient id={gradId} x1="8" y1="10" x2="40" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor={from} />
            <stop offset="0.5" stopColor={via} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>

        {/* Terminal brackets </> — ~20% inset, open tracking, square balance */}
        <path
          d="M15.5 13L9.5 24L15.5 35"
          stroke={`url(#${gradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32.5 13L38.5 24L32.5 35"
          stroke={`url(#${gradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26.4 13L21.6 35"
          stroke={`url(#${gradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>

      {withWordmark && (
        <span className={`font-black italic tracking-tight leading-none ${TEXT_CLASS[size]}`}>
          <span className={fixedEmerald ? 'text-white' : 'text-[var(--fios-text)]'}>Fios</span>
        </span>
      )}
    </span>
  );
};

export default FiosLogo;
