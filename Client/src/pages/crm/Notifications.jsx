import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { 
  processNotifications, 
  saveReadNotificationId, 
  saveAllReadNotificationIds, 
  saveDeletedNotificationId, 
  saveAllDeletedNotificationIds 
} from '../../utils/notificationStorage';
import { 
  FiBell, 
  FiCheck, 
  FiShield, 
  FiFolder, 
  FiClock, 
  FiChevronRight,
  FiMail,
  FiInbox,
  FiTrash2
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
        const processed = processNotifications(response.data.notifications || []);
        setNotifications(processed);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
    if (unreadIds.length === 0) {
      toast.success('All notifications are already marked as read');
      return;
    }

    saveAllReadNotificationIds(unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');

    try {
      await notificationsApi.markAllRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteAll = async () => {
    const allIds = notifications.map(n => n._id);
    if (allIds.length === 0) return;

    saveAllDeletedNotificationIds(allIds);
    setNotifications([]);
    toast.success('All notifications deleted');

    try {
      await notificationsApi.deleteAllNotifications();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    if (e) e.stopPropagation();
    saveDeletedNotificationId(notificationId);
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    toast.success('Notification deleted');

    try {
      await notificationsApi.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      setActionLoadingId(notification._id);
      
      saveReadNotificationId(notification._id);
      setNotifications(prev => prev.map(n => 
        n._id === notification._id ? { ...n, isRead: true } : n
      ));

      if (!notification.isRead) {
        notificationsApi.markRead(notification._id).catch(() => {});
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
      case 'LEAD_ASSIGNED':
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
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm px-4">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">Communications Center</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] tracking-tight uppercase flex items-center gap-3.5">
            <FiBell className="text-[var(--crm-ink-faint)]" size={24} /> Notifications
          </h1>
          <p className="text-xs text-[#a4afbc] font-light max-w-2xl font-mono">
            Real-time operations stream • Lead assignments, attendance reminders & leave request approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={unreadCount > 0 ? { scale: 1.02 } : {}}
            whileTap={unreadCount > 0 ? { scale: 0.98 } : {}}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className={`flex items-center gap-2 px-4 h-[38px] rounded-sm text-[10px] uppercase tracking-widest font-semibold transition-all font-mono ${
              unreadCount === 0
                ? 'bg-[var(--crm-bg-raised)]/20 text-[var(--crm-ink-faint)]/40 border border-[var(--crm-ink-soft)]/5 cursor-not-allowed opacity-40'
                : 'bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-heading)] hover:border-[var(--crm-heading)]/40 hover:bg-[var(--crm-bg-raised)] shadow-md cursor-pointer'
            }`}
          >
            <FiCheck size={13} /> Mark All Read
          </motion.button>

          {notifications.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteAll}
              className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-sm text-[10px] uppercase tracking-widest font-semibold font-mono bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50 transition cursor-pointer"
              title="Clear all notifications"
            >
              <FiTrash2 size={12} /> Clear All
            </motion.button>
          )}
        </div>
      </motion.div>

      <div className="w-full py-6 space-y-6 bg-[var(--crm-bg)] px-4">
        
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
            {unreadCount > 0 ? (
              <span className="ml-2 px-2 py-0.5 text-[9px] bg-rose-950 border border-rose-800 text-rose-400 font-bold rounded-sm animate-pulse">
                {unreadCount}
              </span>
            ) : (
              <span className="ml-2 px-2 py-0.5 text-[9px] bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-faint)] rounded-sm">
                0
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
              <p className="text-xs text-[var(--crm-ink-faint)] mt-1.5 max-w-xs font-light leading-relaxed px-4 font-mono">
                {activeTab === 'unread' 
                  ? "All notifications have been read."
                  : activeTab === 'read'
                  ? "No archived read notifications."
                  : "Your notification log is empty."}
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
                        <p className={`text-xs sm:text-sm leading-relaxed ${isUnread ? 'font-medium text-[var(--crm-heading)] font-mono' : 'text-[var(--crm-ink-soft)]/80 font-light font-mono'}`}>
                          {notification.message}
                        </p>
                      </div>

                      {/* Actions Cluster: Unread Dot + Delete Button */}
                      <div className="flex items-center gap-3 shrink-0 self-center pl-2">
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 ring-4 ring-rose-950 animate-pulse"></span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(notification._id, e)}
                          className="p-1.5 text-[var(--crm-ink-faint)] hover:text-rose-400 hover:bg-rose-950/60 border border-transparent hover:border-rose-800/40 rounded transition cursor-pointer"
                          title="Delete notification"
                        >
                          <FiTrash2 size={14} />
                        </button>

                        <FiChevronRight 
                          size={16} 
                          className="text-[var(--crm-ink-faint)]/40 group-hover:text-[var(--crm-heading)] transition-colors transform group-hover:translate-x-0.5" 
                        />
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