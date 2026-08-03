import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { 
  FiBell, 
  FiCheck, 
  FiShield, 
  FiFolder, 
  FiClock, 
  FiChevronRight,
  FiMail,
  FiInbox
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); 
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await notificationsApi.getNotifications();
      if (response.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount === 0) {
      toast.success('All notifications are already marked as read');
      return;
    }

    try {
      const response = await notificationsApi.markAllRead();
      if (response.success) {
        toast.success('All notifications marked as read');
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      setActionLoadingId(notification._id);
      
      if (!notification.isRead) {
        const res = await notificationsApi.markRead(notification._id);
        if (res.success) {
          setNotifications(prev => prev.map(n => 
            n._id === notification._id ? { ...n, isRead: true } : n
          ));
        }
      }

      if (notification.type === 'TASK_ASSIGNMENT' && notification.metadata?.leadId) {
        navigate(`/crm/leads/${notification.metadata.leadId}`);
      } else if (notification.type === 'SECURITY_ALERT') {
        navigate('/crm/security');
      } else {
        toast.success('Notification marked as read');
      }
    } catch (error) {
      console.error('Error processing notification click:', error);
      toast.error('An error occurred while opening the notification');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SECURITY_ALERT':
        return {
          icon: FiShield,
          bgClass: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/20',
        };
      case 'TASK_ASSIGNMENT':
        return {
          icon: FiFolder,
          bgClass: 'bg-[var(--crm-accent-bg)] text-[var(--crm-accent)] border border-[var(--crm-accent)]/20',
        };
      case 'MESSAGE':
        return {
          icon: FiMail,
          bgClass: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border border-[var(--crm-positive)]/20',
        };
      default:
        return {
          icon: FiBell,
          bgClass: 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/10',
        };
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="w-full min-h-screen bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] m-0 p-0 block pb-12"
    >
      
      {/* Top Deck Header Context Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">Communications Center</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] tracking-tight uppercase flex items-center gap-3.5">
            <FiBell className="text-[var(--crm-ink-faint)]" size={24} /> Notifications
          </h1>
          <p className="text-xs text-[#a4afbc] font-light max-w-2xl">
            Monitor real-time task dispatches, cross-border shipping anomalies, and system operations logs.
          </p>
        </div>
        <motion.button
          whileHover={unreadCount > 0 ? { scale: 1.02 } : {}}
          whileTap={unreadCount > 0 ? { scale: 0.98 } : {}}
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className={`flex items-center gap-2 px-5 h-[42px] rounded-sm text-[11px] uppercase tracking-widest font-semibold transition-all rounded-sm ${
            unreadCount === 0
              ? 'bg-[var(--crm-bg-raised)]/20 text-[var(--crm-ink-faint)]/40 border border-[var(--crm-ink-soft)]/5 cursor-not-allowed opacity-40'
              : 'bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-heading)] hover:border-[var(--crm-heading)]/40 hover:bg-[var(--crm-bg-raised)] shadow-md cursor-pointer'
          }`}
        >
          <FiCheck size={13} /> Clear Active Buffer
        </motion.button>
      </motion.div>

      <div className="w-full py-8 space-y-6 bg-[var(--crm-bg)]">
        
        {/* Structured Segment Navigation Categories */}
        <motion.div variants={blockVariants} className="flex items-center border-b border-[var(--crm-ink-soft)]/10 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'border-[var(--crm-heading)] text-[var(--crm-heading)]'
                : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
            }`}
          >
            All Records
            <span className="ml-2 px-2 py-0.5 text-[9px] bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)] rounded-sm">
              {notifications.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-5 py-3 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'unread'
                ? 'border-[var(--crm-heading)] text-[var(--crm-heading)]'
                : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
            }`}
          >
            Unread Payload
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-[9px] bg-[var(--crm-danger-bg)] border border-[var(--crm-danger)]/30 text-[var(--crm-danger)] rounded-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`px-5 py-3 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'read'
                ? 'border-[var(--crm-heading)] text-[var(--crm-heading)]'
                : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
            }`}
          >
            Archived Ledger
            <span className="ml-2 px-2 py-0.5 text-[9px] bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-faint)] rounded-sm">
              {readCount}
            </span>
          </button>
        </motion.div>

        {/* Master Queue Terminal Box */}
        <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)]/20 border border-[var(--crm-ink-soft)]/15 rounded-sm shadow-2xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 space-y-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--crm-ink-soft)] border-t-transparent"></div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-mono">Polling Live Stream Nodes...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-14 w-16 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm flex items-center justify-center text-gray-400 mb-4 shadow-inner">
                <FiInbox size={22} className="text-[var(--crm-ink-faint)] opacity-70" />
              </div>
              <h3 className="text-base font-serif text-[var(--crm-heading)] uppercase tracking-wide">Stream Queue Cleared</h3>
              <p className="text-xs text-[var(--crm-ink-faint)] mt-1.5 max-w-xs font-light leading-relaxed px-4">
                {activeTab === 'unread' 
                  ? "Excellent synchronization. All inbound operations vectors have been processed."
                  : activeTab === 'read'
                  ? "No archived elements discovered within this workspace filter."
                  : "Your administrative stream is completely empty at this juncture."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--crm-ink-soft)]/10">
              <AnimatePresence mode="wait">
                {filteredNotifications.map((notification) => {
                  const { icon: Icon, bgClass } = getNotificationIcon(notification.type);
                  const isUnread = !notification.isRead;
                  const isActionLoading = actionLoadingId === notification._id;

                  return (
                    <motion.div
                      layout
                      key={notification._id}
                      onClick={() => !isActionLoading && handleNotificationClick(notification)}
                      className={`group relative p-5 flex items-start gap-5 transition-all duration-150 cursor-pointer border-l-2 text-left ${
                        isUnread
                          ? 'bg-[var(--crm-bg-raised)]/40 border-[var(--crm-heading)] hover:bg-[var(--crm-bg-raised)]/60'
                          : 'border-transparent hover:bg-[var(--crm-bg-raised)]/30 bg-transparent'
                      }`}
                    >
                      
                      {/* Indicator Icon Context Box */}
                      <div className={`p-2.5 rounded-sm shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-md ${bgClass}`}>
                        <Icon size={15} />
                      </div>

                      {/* Body Parameter Cluster */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--crm-ink-faint)]">
                            {notification.type ? notification.type.replace(/_/g, ' ') : 'General Broadcast'}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--crm-ink-faint)] font-light">
                            <FiClock size={11} className="text-[var(--crm-ink-faint)]" />
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed ${isUnread ? 'font-medium text-[var(--crm-heading)]' : 'text-[var(--crm-ink-soft)]/80 font-light'}`}>
                          {notification.message}
                        </p>
                      </div>

                      {/* Telemetry Actions Node Flag */}
                      <div className="flex items-center gap-3 shrink-0 self-center pl-2">
                        {isUnread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-danger)] ring-4 ring-[var(--crm-danger-bg)] animate-pulse"></span>
                        )}
                        {isActionLoading ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--crm-ink-soft)] border-t-transparent"></div>
                        ) : (
                          <FiChevronRight 
                            size={16} 
                            className="text-[var(--crm-ink-faint)]/40 group-hover:text-[var(--crm-heading)] transition-colors transform group-hover:translate-x-0.5" 
                          />
                        )}
                      </div>
                      
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

      </div>
    </motion.div>
  );
}