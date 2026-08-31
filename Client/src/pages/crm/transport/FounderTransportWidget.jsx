import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTruck, FiAlertCircle, FiCheckCircle, FiClock, FiArrowRight, FiActivity, FiMapPin } from 'react-icons/fi';

export default function FounderTransportWidget({ summary }) {
  const activeDispatches = summary?.transport?.total || 0;
  const inTransit = summary?.transport?.inTransit || 0;
  const overdue = summary?.transport?.issueRaised || 0;
  const pendingPod = summary?.transport?.pending || 0;

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="border rounded-sm overflow-hidden flex flex-col font-mono text-xs text-left"
      style={{ 
        background: 'var(--crm-bg-raised)', 
        borderColor: 'var(--crm-line)',
        boxShadow: 'var(--crm-shadow)' 
      }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}
      >
        <div className="flex items-center gap-2">
          <FiTruck size={16} className="text-[#c9a84c]" />
          <h3 className="text-xs uppercase font-bold tracking-widest text-[var(--crm-heading)]">
            Transport Operations Overview
          </h3>
        </div>
        {/* Prominent Navigation Link (Prompt Point 8) */}
        <Link
          to="/crm/transport/manager"
          className="px-3 py-1.5 bg-[#0a192f] hover:bg-[#122b50] border border-[#c9a84c] text-[#c9a84c] hover:text-white rounded text-[9px] uppercase font-bold tracking-wider transition flex items-center gap-1.5 cursor-pointer"
        >
          Go to Transport Operations <FiArrowRight size={11} />
        </Link>
      </div>

      {/* KPI Grid Mini */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 border rounded bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">Active Trips</span>
          <span className="text-xl font-light text-[var(--crm-heading)] mt-0.5 block">{activeDispatches}</span>
        </div>
        <div className="p-3 border rounded bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">In Transit</span>
          <span className="text-xl font-light text-sky-400 mt-0.5 block">{inTransit}</span>
        </div>
        <div className="p-3 border rounded bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">Pending POD</span>
          <span className="text-xl font-light text-amber-400 mt-0.5 block">{pendingPod}</span>
        </div>
        <div className="p-3 border rounded bg-rose-950/20" style={{ borderColor: 'rgba(220, 38, 38, 0.4)' }}>
          <span className="text-[8px] uppercase tracking-wider text-rose-400 font-bold block">Overdue Alerts</span>
          <span className="text-xl font-light text-rose-400 mt-0.5 block">{overdue}</span>
        </div>
      </div>

      {/* Critical Logistics Alerts Banner */}
      {overdue > 0 && (
        <div className="mx-4 mb-4 p-3 bg-rose-950/30 border border-rose-800/60 rounded flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2 text-rose-300">
            <FiAlertCircle size={14} className="text-rose-400 shrink-0 animate-pulse" />
            <span><strong>{overdue} Dispatches Overdue</strong> — Requires Transport Manager review.</span>
          </div>
          <Link 
            to="/crm/transport/manager" 
            className="text-rose-300 font-bold uppercase underline hover:text-white shrink-0 ml-2"
          >
            Review Now
          </Link>
        </div>
      )}
    </motion.div>
  );
}
