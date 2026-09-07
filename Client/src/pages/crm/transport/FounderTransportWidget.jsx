import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTruck, FiAlertCircle, FiMessageSquare, FiArrowRight } from 'react-icons/fi';

export default function FounderTransportWidget({ summary }) {
  const activeDispatches = summary?.transport?.total || 0;
  const inTransit = summary?.transport?.inTransit || 0;
  const overdue = summary?.transport?.issueRaised || 0;
  const pendingPod = summary?.transport?.pending || 0;

  const [transportChats, setTransportChats] = useState([]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch('/api/chat/transport');
        const data = await res.json();
        if (data && (data.chats || data.data?.chats)) {
          const list = data.chats || data.data?.chats || [];
          setTransportChats(list.slice(-5).reverse());
        }
      } catch (e) {}
    };

    fetchChats();
    const interval = setInterval(fetchChats, 4000);
    return () => clearInterval(interval);
  }, []);

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
            Transport Operations & Live Driver Chat Overview
          </h3>
        </div>
        <Link
          to="/crm/transport/manager?tab=DASHBOARD"
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

      {/* Live MongoDB Transport Chat Feed for Founder */}
      <div className="mx-4 mb-4 p-3 border rounded bg-[#090b0e] border-teal-900/60 space-y-2">
        <div className="flex justify-between items-center border-b border-teal-900/40 pb-1.5">
          <span className="text-[10px] uppercase font-bold text-teal-400 flex items-center gap-1.5">
            <FiMessageSquare size={13} /> Live Driver & Transport Chat Log (MongoDB Persisted)
          </span>
          <span className="text-[8px] text-emerald-400 font-mono flex items-center gap-1">
            ● LIVE MONGO DB FEED
          </span>
        </div>
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 text-[11px] custom-scrollbar">
          {transportChats.length === 0 ? (
            <div className="text-[10px] text-slate-500 italic">No transport chat messages logged in database yet.</div>
          ) : (
            transportChats.map(c => (
              <div key={c.id} className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center text-[10px]">
                <div>
                  <strong className="text-teal-300 font-bold">{c.sender}: </strong>
                  <span className="text-slate-200">{c.text || c.message}</span>
                </div>
                <span className="text-[8px] text-slate-500 font-mono ml-2 shrink-0">{c.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
