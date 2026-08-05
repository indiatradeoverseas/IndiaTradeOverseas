import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiCornerDownLeft, FiCommand } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { getCrmCommandItems } from '../../config/crmNav';

export default function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(() => getCrmCommandItems(user), [user]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    function handleKeyDown(e) {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isModK) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const goTo = (item) => {
    if (!item) return;
    navigate(item.to);
    setOpen(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      goTo(results[activeIndex]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-all cursor-pointer"
        style={{
          fontFamily: 'var(--crm-font-mono)',
          color: 'var(--crm-ink-soft)',
          borderColor: 'var(--crm-line)',
          background: 'var(--crm-bg-raised)'
        }}
      >
        <FiSearch size={12} />
        <span>Jump to...</span>
        <span
          className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm"
          style={{ background: 'var(--crm-bg-sunken)', color: 'var(--crm-ink-faint)' }}
        >
          <FiCommand size={9} />K
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
            style={{ background: 'rgba(8,9,10,0.7)', backdropFilter: 'blur(3px)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-md border shadow-2xl overflow-hidden crm-portal"
              style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line-strong)', fontFamily: 'var(--crm-font-body)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--crm-line)' }}>
                <FiSearch size={15} style={{ color: 'var(--crm-ink-faint)' }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search pages..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--crm-ink)' }}
                />
                <span
                  className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm"
                  style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)', background: 'var(--crm-bg-sunken)' }}
                >
                  Esc
                </span>
              </div>

              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar py-2">
                {results.length === 0 ? (
                  <p
                    className="text-center text-xs py-8"
                    style={{ color: 'var(--crm-ink-faint)', fontFamily: 'var(--crm-font-mono)' }}
                  >
                    No matching pages
                  </p>
                ) : (
                  results.map((item, idx) => (
                    <button
                      key={item.to}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => goTo(item)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer"
                      style={{
                        background: idx === activeIndex ? 'var(--crm-accent-bg)' : 'transparent',
                        color: idx === activeIndex ? 'var(--crm-heading)' : 'var(--crm-ink-soft)'
                      }}
                    >
                      <span className="flex items-center gap-3 text-xs">
                        <item.icon size={14} style={{ color: idx === activeIndex ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }} />
                        {item.label}
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className="text-[9px] uppercase tracking-wide"
                          style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
                        >
                          {item.group}
                        </span>
                        {idx === activeIndex && <FiCornerDownLeft size={12} style={{ color: 'var(--crm-accent)' }} />}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
