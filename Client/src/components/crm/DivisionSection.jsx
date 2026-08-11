import React from 'react';
import { motion } from 'framer-motion';

export default function DivisionSection({ title, count, emptyLabel, children, sectionRef, highlighted }) {
    return (
        <motion.div
            ref={sectionRef}
            animate={
                highlighted
                    ? {
                        boxShadow: [
                            '0 0 0 0px rgba(45, 212, 167, 0)',
                            '0 0 0 3px rgba(45, 212, 167, 0.45)',
                            '0 0 0 0px rgba(45, 212, 167, 0)'
                        ]
                    }
                    : { boxShadow: '0 0 0 0px rgba(45, 212, 167, 0)' }
            }
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm overflow-hidden scroll-mt-24"
        >
            <div className="flex items-center justify-between bg-[var(--crm-bg)]/60 border-b border-[var(--crm-ink-soft)]/10 px-4 py-3">
                <h3 className="font-serif text-sm uppercase tracking-wide text-[var(--crm-heading)]">{title}</h3>
                <span className="font-mono text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">{count}</span>
            </div>
            <div className="p-4 space-y-3">
                {count === 0 ? (
                    <div className="p-6 text-center text-[var(--crm-ink-faint)] font-light italic text-xs">
                        {emptyLabel}
                    </div>
                ) : children}
            </div>
        </motion.div>
    );
}
