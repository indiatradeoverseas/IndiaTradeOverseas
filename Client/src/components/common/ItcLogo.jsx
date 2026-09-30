import React from 'react';

/**
 * ITC Logo
 * UI inspired by the provided ITC screenshot
 *
 * Colors:
 * I = Blue
 * T = Orange
 * C = Green
 */

export function ItcLogoBadge({ size = 'md', className = '' }) {
  const isXs = size === 'xs';
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const textSize = isXs
    ? 'text-[16px] sm:text-[18px]'
    : isSm
    ? 'text-[20px] sm:text-[22px]'
    : isLg
    ? 'text-[40px] sm:text-[44px]'
    : 'text-[30px] sm:text-[34px]';

  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
    >
      <div
        className={`
          ${textSize}
          font-bold
          tracking-[0.02em]
          leading-none
        `}
        style={{
          fontFamily: "var(--crm-font-display), 'Newsreader', Georgia, serif",
          background:
            'linear-gradient(135deg, #0057B8 0%, #0077CC 32%, #F7941D 52%, #F7941D 68%, #00A651 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',

          filter:
            'drop-shadow(0 1px 1px rgba(0,0,0,0.12))',
        }}
        title="ITC - India Trade Center"
      >
        I T C
      </div>
    </div>
  );
}

export default function ItcLogo({
  showText = true,
  size = 'md',
  className = '',
}) {
  return (
    <div
      className={`
        inline-flex
        items-center
        gap-2.5
        select-none
        ${className}
      `}
    >
      {/* ITC Logo */}
      <ItcLogoBadge size={size} />

      {/* Company Name */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="
              font-sans
              font-extrabold
              uppercase
              tracking-[0.04em]
              text-[#071B3A]
              text-[13px]
              sm:text-[15px]
            "
          >
            INDIA TRADE CENTRE
          </span>

          <span
            className="
              mt-1
              font-sans
              font-medium
              text-[#64748B]
              text-[8px]
              sm:text-[9px]
              tracking-[0.08em]
            "
          >
            GLOBAL TRADE MADE SIMPLE
          </span>
        </div>
      )}
    </div>
  );
}