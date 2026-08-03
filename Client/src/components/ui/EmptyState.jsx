import React from 'react';
import { motion } from 'framer-motion';
import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ icon: Icon = FiInbox, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center py-10 px-4"
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-3.5"
        style={{ background: 'var(--crm-accent-bg)', color: 'var(--crm-accent)' }}
      >
        <Icon size={18} />
      </div>
      <p
        className="text-xs font-bold uppercase tracking-widest mb-1.5"
        style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink)' }}
      >
        {title}
      </p>
      {description && (
        <p className="text-xs max-w-xs" style={{ color: 'var(--crm-ink-faint)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
