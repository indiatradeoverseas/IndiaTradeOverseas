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
  stackedText = false,
  size = 'md',
  className = '',
}) {
  const isSm = size === 'sm' || size === 'xs';
  const titleTextSize = isSm ? 'text-[11px] sm:text-[12px]' : 'text-[12.5px] sm:text-[14px]';
  const subTextSize = isSm ? 'text-[7.5px] sm:text-[8px]' : 'text-[8.5px] sm:text-[9.5px]';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none min-w-0 ${className}`}>
      <ItcLogoBadge size={size} />

      {showText && (
        <div className="flex flex-col text-left justify-center min-w-0">
          {stackedText ? (
            <>
              <span
                className={`font-serif uppercase tracking-[0.03em] leading-[1.08] itc-brand-title ${titleTextSize}`}
                style={{
                  fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
                  fontWeight: 900
                }}
              >
                INDIA TRADE<br />CENTER
              </span>
              <span
                className={`mt-1 font-serif tracking-normal leading-tight itc-brand-subtitle ${subTextSize}`}
                style={{
                  fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
                  fontWeight: 600
                }}
              >
                Global Trade Made Simple
              </span>
            </>
          ) : (
            <>
              <span
                className={`font-serif uppercase tracking-[0.03em] whitespace-nowrap truncate itc-brand-title ${titleTextSize}`}
                style={{
                  fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
                  fontWeight: 900
                }}
              >
                INDIA TRADE CENTER
              </span>
              <span
                className={`mt-0.5 font-serif tracking-normal whitespace-nowrap truncate itc-brand-subtitle ${subTextSize}`}
                style={{
                  fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
                  fontWeight: 600
                }}
              >
                Global Trade Made Simple
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
