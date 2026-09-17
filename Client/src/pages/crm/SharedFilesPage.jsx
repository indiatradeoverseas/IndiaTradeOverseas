import React from 'react';
import FileSharingWidget from '../../components/crm/FileSharingWidget';
import { motion } from 'framer-motion';

export default function SharedFilesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full min-h-screen p-4 sm:p-6 space-y-6 font-sans"
      style={{ background: 'var(--crm-bg)' }}
    >
      <FileSharingWidget />
    </motion.div>
  );
}
