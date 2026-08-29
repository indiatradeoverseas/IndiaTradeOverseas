import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiActivity, FiRefreshCw, FiClock, FiAlertCircle, FiCheckCircle, FiFileText, FiTruck, FiUserCheck } from 'react-icons/fi';

export default function ActivityFeed({ events = [], onRefresh }) {
  const [feedEvents, setFeedEvents] = useState(events);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    setFeedEvents(events);
  }, [events]);

  // Auto-polling interval every 30 seconds (Prompt Point 4)
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setLastUpdated(new Date());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const getEventIcon = (event) => {
    if (event.isCritical || event.type === 'OVERDUE') return <FiAlertCircle size={13} className="text-rose-400" />;
    if (event.type === 'POD_UPLOAD' || event.type === 'POD_VERIFIED') return <FiFileText size={13} className="text-emerald-400" />;
    if (event.type === 'ASSIGNMENT') return <FiUserCheck size={13} className="text-sky-400" />;
    return <FiTruck size={13} className="text-amber-400" />;
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Recently';
    const diffMins = Math.round((new Date() - new Date(date)) / 60000);
    if (isNaN(diffMins) || diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div 
      className="border rounded-sm flex flex-col font-mono text-xs overflow-hidden"
      style={{ 
        background: 'var(--crm-bg-raised)', 
        borderColor: 'var(--crm-line)',
        boxShadow: 'var(--crm-shadow)'
      }}
    >
      {/* Feed Header */}
      <div 
        className="p-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}
      >
        <div className="flex items-center gap-2">
          <FiActivity size={14} className="text-[var(--crm-accent)]" />
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-[var(--crm-heading)]">
            Live Activity Stream (30s Polling)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-[var(--crm-ink-faint)]">
          <span>Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button 
            onClick={handleRefresh}
            className="p-1 hover:text-[var(--crm-heading)] transition cursor-pointer"
            title="Refresh feed"
          >
            <FiRefreshCw size={11} className={isRefreshing ? 'animate-spin text-[var(--crm-accent)]' : ''} />
          </button>
        </div>
      </div>

      {/* Feed Event List */}
      <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--crm-line)' }}>
        {feedEvents.length === 0 ? (
          <div className="p-6 text-center text-[var(--crm-ink-faint)] text-[10px]">
            No recent activity logged. Live events will stream here automatically.
          </div>
        ) : (
          feedEvents.map((ev, index) => (
            <div 
              key={ev.id || index}
              className={`p-3 transition-colors ${
                ev.isCritical 
                  ? 'bg-rose-950/20 border-l-2 border-l-rose-500' 
                  : 'hover:bg-[var(--crm-bg-sunken)]/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {getEventIcon(ev)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] leading-snug ${ev.isCritical ? 'text-rose-300 font-bold' : 'text-[var(--crm-ink-soft)]'}`}>
                    {ev.message || ev.text || 'Event updated'}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[9px] text-[var(--crm-ink-faint)]">
                    <span className="flex items-center gap-1 font-mono">
                      <FiClock size={9} /> {formatTimeAgo(ev.timestamp || ev.createdAt)}
                    </span>
                    {ev.isCritical && (
                      <span className="px-1.5 py-0.5 bg-rose-900/60 text-rose-300 border border-rose-800 text-[8px] font-bold uppercase tracking-wider rounded">
                        Critical Alert
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
