import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';

/**
 * Generic press -> busy -> done micro-interaction button.
 * `action` may return a promise; rejecting it snaps the button back to idle
 * without showing the done state (callers keep their own toast.error calls).
 */
export function AnimatedActionButton({
  action,
  icon: Icon,
  doneIcon: DoneIcon = FiCheck,
  idleLabel,
  busyLabel,
  doneLabel,
  iconOnly = false,
  resetDelay = 1600,
  onDone,
  disabled = false,
  className = '',
  iconSize = 14,
  title,
  type = 'button',
  ...rest
}) {
  const [phase, setPhase] = useState('idle');
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = async (e) => {
    if (phase !== 'idle' || disabled) return;
    setPhase('busy');
    try {
      await action?.(e);
      if (!mountedRef.current) return;
      setPhase('done');
      if (resetDelay === null) {
        onDone?.();
      } else {
        timeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setPhase('idle');
          onDone?.();
        }, resetDelay);
      }
    } catch (err) {
      if (mountedRef.current) setPhase('idle');
    }
  };

  const label = phase === 'busy' ? busyLabel : phase === 'done' ? doneLabel : idleLabel;

  return (
    <motion.button
      type={type}
      layout
      onClick={handleClick}
      disabled={disabled || phase !== 'idle'}
      title={title}
      whileTap={phase === 'idle' ? { scale: 0.96 } : undefined}
      transition={{ layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
      className={className}
      {...rest}
    >
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'busy' ? (
          <motion.span
            key="busy"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="inline-flex shrink-0"
          >
            <motion.span
              className="inline-flex"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            >
              {Icon ? <Icon size={iconSize} /> : null}
            </motion.span>
          </motion.span>
        ) : phase === 'done' ? (
          <motion.span
            key="done"
            initial={{ opacity: 0, rotate: -90, scale: 0.4 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="inline-flex shrink-0"
          >
            <DoneIcon size={iconSize} />
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="inline-flex shrink-0"
          >
            {Icon ? <Icon size={iconSize} /> : null}
          </motion.span>
        )}
      </AnimatePresence>

      {!iconOnly && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="inline-block whitespace-nowrap"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      )}
    </motion.button>
  );
}

export function OrderButton({ className = '', ...rest }) {
  return (
    <AnimatedActionButton
      className={`inline-flex items-center justify-center gap-2 ${className}`}
      {...rest}
    />
  );
}

export function DownloadButton({ className = '', ...rest }) {
  return (
    <AnimatedActionButton
      className={`inline-flex items-center justify-center gap-1.5 ${className}`}
      {...rest}
    />
  );
}
