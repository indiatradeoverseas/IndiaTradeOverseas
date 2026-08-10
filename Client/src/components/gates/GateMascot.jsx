import React from 'react';
import { motion } from 'framer-motion';

/**
 * Optional entry-gate companion image: slides in from the left once when the
 * gate mounts and settles beside the form panel. No looping animation —
 * it simply arrives and stays put.
 */
export default function GateMascot({ src, alt = '' }) {
  return (
    <motion.img
      src={src}
      alt={alt}
      initial={{ x: -220, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="hidden sm:block pointer-events-none select-none shrink-0 h-64 md:h-80 w-auto drop-shadow-2xl"
    />
  );
}
