import React from 'react';

/**
 * ITC Logo Component
 * Colors:
 * I = Deep Royal Blue (#08376f)
 * T = Teal Cyan Gradient (#03505f -> #016970)
 * C = Orange to Green Gradient (#f7870a -> #00A651)
 * Enhanced thickness & font weight
 */

export function ItcLogoBadge({ size = 'md', className = '' }) {
  const isXs = size === 'xs';
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const textSize = isXs
    ? 'text-[18px]'
    : isSm
    ? 'text-[24px]'
    : isLg
    ? 'text-[42px]'
    : 'text-[32px]';

  return (
    <div
      className={`inline-flex items-center tracking-tight leading-none select-none shrink-0 ${textSize} ${className}`}
      title="ITC - India Trade Center"
      style={{
        fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
        fontWeight: 900
      }}
    >
      {/* Letter I */}
      <span
        style={{
          color: '#08376f',
          fontWeight: 900,
          paddingRight: '1.5px',
          WebkitTextStroke: '0.5px #08376f',
          filter: 'drop-shadow(0 1px 1px rgba(8,55,111,0.25))'
        }}
      >
        I
      </span>

      {/* Letter T */}
      <span
        style={{
          background: 'linear-gradient(180deg, #03505f 0%, #016970 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 900,
          paddingRight: '1.5px',
          WebkitTextStroke: '0.5px #016970',
          filter: 'drop-shadow(0 1px 1px rgba(1,105,112,0.25))'
        }}
      >
        T
      </span>

      {/* Letter C */}
      <span
        style={{
          background: 'linear-gradient(135deg, #f7870a 0%, #00A651 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 900,
          WebkitTextStroke: '0.5px #00A651',
          filter: 'drop-shadow(0 1px 1px rgba(247,135,10,0.25))'
        }}
      >
        C
      </span>
    </div>
  );
}

export default function ItcLogo({
  showText = true,
  size = 'md',
  className = '',
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <ItcLogoBadge size={size} />

      {showText && (
        <div className="flex flex-col leading-none text-left justify-center">
          <span
            className="font-serif uppercase tracking-[0.04em] text-[14px] sm:text-[16px] itc-brand-title"
            style={{
              fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
              fontWeight: 900
            }}
          >
            INDIA TRADE CENTRE
          </span>

          <span
            className="mt-0.5 font-serif text-[9px] sm:text-[10.5px] tracking-normal itc-brand-subtitle"
            style={{
              fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
              fontWeight: 600
            }}
          >
            Global Trade Made Simple
          </span>
        </div>
      )}
    </div>
  );
}