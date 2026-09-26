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
 * Fios brandmark — geometric terminal brackets `</>` with a glowing core node.
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
  const glowId = `fios-glow-${id}`;
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
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={from} stopOpacity="0.9" />
            <stop offset="100%" stopColor={from} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft glow core */}
        <circle cx="24" cy="24" r="14" fill={`url(#${glowId})`} opacity="0.55" />

        {/* Outer geometric frame */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          stroke={`url(#${gradId})`}
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Terminal brackets </> */}
        <path
          d="M16 14L9 24L16 34"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 14L39 24L32 34"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27.5 13.5L20.5 34.5"
          stroke={`url(#${gradId})`}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Orbit nodes */}
        <circle cx="24" cy="24" r="2.4" fill={`url(#${gradId})`} />
        <circle cx="12" cy="12" r="1.6" fill={from} opacity="0.85" />
        <circle cx="36" cy="12" r="1.6" fill={to} opacity="0.85" />
        <circle cx="12" cy="36" r="1.6" fill={via} opacity="0.85" />
        <circle cx="36" cy="36" r="1.6" fill={from} opacity="0.85" />
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
