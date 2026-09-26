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
 * Fios brandmark — terminal brackets `</>` only (no decorative dots / frame).
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
          <linearGradient id={gradId} x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor={from} />
            <stop offset="0.5" stopColor={via} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>

        {/* Terminal brackets </> — scaled up, no dots / frame / glow */}
        <path
          d="M15 10L6 24L15 38"
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M33 10L42 24L33 38"
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29 9L19 39"
          stroke={`url(#${gradId})`}
          strokeWidth="4"
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
