import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Shortest signed distance from `index` to `active` on a circular track of length `total`.
function circularOffset(index, active, total) {
  let raw = index - active;
  if (raw > total / 2) raw -= total;
  if (raw < -total / 2) raw += total;
  return raw;
}

const MAX_VISIBLE_OFFSET = 3;
const ROTATE_DEG = 20;
const TRANSLATE_PERCENT = 34;
const DEPTH_PX = 34;
const AUTOPLAY_DELAY_MS = 3500;

export default function TestimonialCoverflow({
  items,
  accentColor = '#F2F4F7',
  accentTextColor = '#0E1116',
  aspectClass = 'aspect-[3/4]',
  cardWidthClass = 'w-[115px] sm:w-[140px] md:w-[160px] lg:w-[175px]',
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isHovering = hoveredIndex !== null;
  const total = items.length;

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + total) % total);
  }, [total]);

  // Autoplay: advances on a timer, pauses while hovered or being dragged, and
  // restarts its countdown on every index change (manual or automatic).
  useEffect(() => {
    if (isHovering || isDragging || total <= 1) return undefined;
    const id = setInterval(goNext, AUTOPLAY_DELAY_MS);
    return () => clearInterval(id);
  }, [isHovering, isDragging, total, activeIndex, goNext]);

  const handleDragEnd = (_event, info) => {
    setIsDragging(false);
    const distanceThreshold = 50;
    const velocityThreshold = 350;
    if (info.offset.x < -distanceThreshold || info.velocity.x < -velocityThreshold) {
      goNext();
    } else if (info.offset.x > distanceThreshold || info.velocity.x > velocityThreshold) {
      goPrev();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') goNext();
    if (event.key === 'ArrowLeft') goPrev();
  };

  if (!total) return null;

  return (
    <div
      className="select-none"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full flex items-center justify-center"
        style={{ perspective: '1000px', height: 'clamp(190px, 28vw, 260px)' }}
      >
        <motion.div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{ transformStyle: 'preserve-3d' }}
          drag="x"
          dragElastic={0.2}
          dragConstraints={{ left: 0, right: 0 }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
        >
          {items.map((item, index) => {
            const offset = circularOffset(index, activeIndex, total);
            const abs = Math.abs(offset);
            if (abs > MAX_VISIBLE_OFFSET) return null;

            const isCenter = offset === 0;
            const scale = Math.max(1 - abs * 0.1, 0.62);
            const opacity = abs === 0 ? 1 : Math.max(1 - abs * 0.3, 0);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !isCenter && setActiveIndex(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex((h) => (h === index ? null : h))}
                aria-hidden={!isCenter}
                aria-label={isCenter ? undefined : `Go to slide ${index + 1}`}
                className={`absolute top-1/2 left-1/2 ${cardWidthClass} ${aspectClass} rounded-lg sm:rounded-xl overflow-hidden shadow-2xl border border-white/10 ${isCenter ? 'cursor-default' : 'cursor-pointer'}`}
                style={{
                  transform: `translate(-50%, -50%) translateX(${offset * TRANSLATE_PERCENT}%) rotateY(${offset * -ROTATE_DEG}deg) translateZ(${-abs * DEPTH_PX}px) scale(${scale})`,
                  transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease',
                  opacity,
                  zIndex: total - abs,
                  pointerEvents: abs > MAX_VISIBLE_OFFSET ? 'none' : 'auto',
                }}
              >
                <img
                  src={item.image}
                  alt={item.alt}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/50 via-45% to-transparent pointer-events-none" />

                <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3.5 text-left pointer-events-none">
                  {item.badge && (
                    <span
                      className="inline-block text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5"
                      style={{ backgroundColor: item.accent || accentColor, color: item.accentTextColor || accentTextColor }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.trustTag && (
                    <p
                      className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider mb-1 drop-shadow"
                      style={{ color: item.accent || accentColor }}
                    >
                      ✓ {item.trustTag}
                    </p>
                  )}
                  <p className="font-serif text-white text-[11px] sm:text-sm md:text-[15px] font-medium leading-snug drop-shadow-md">
                    {item.headline}
                  </p>
                </div>
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Pill-shaped control cluster: prev arrow, dot pagination, next arrow */}
      <div className="mt-2 sm:mt-3 flex justify-center">
        <div className="flex items-center gap-3 sm:gap-4 bg-white/10 border border-white/15 backdrop-blur-md rounded-full px-3 sm:px-4 py-2 shadow-lg">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous testimonial"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors"
          >
            <FiChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: isActive ? '20px' : '6px',
                    backgroundColor: isActive ? (item.accent || accentColor) : 'rgba(255,255,255,0.25)',
                  }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next testimonial"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
