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
          bgClass: 'bg-rose-950/20 text-rose-400 border border-rose-500/20',
        };
      case 'TASK_ASSIGNMENT':
        return {
          icon: FiFolder,
          bgClass: 'bg-indigo-950/30 text-indigo-400 border border-indigo-500/20',
        };
      case 'MESSAGE':
        return {
          icon: FiMail,
          bgClass: 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20',
        };
      default:
        return {
          icon: FiBell,
          bgClass: 'bg-[#121D29] text-[#C5CBD3] border border-[#C5CBD3]/10',
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
      className="w-full min-h-screen bg-[#0E1116] text-[#C5CBD3] m-0 p-0 block pb-12"
    >
      
      {/* Top Deck Header Context Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">Communications Center</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] tracking-tight uppercase flex items-center gap-3.5">
            <FiBell className="text-[#6D7886]" size={24} /> Notifications
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
              ? 'bg-[#121D29]/20 text-[#6D7886]/40 border border-[#C5CBD3]/5 cursor-not-allowed opacity-40'
              : 'bg-[#0E1116] border border-[#C5CBD3]/20 text-[#F2F4F7] hover:border-[#F2F4F7]/40 hover:bg-[#121D29] shadow-md cursor-pointer'
          }`}
        >
          <FiCheck size={13} /> Clear Active Buffer
        </motion.button>
      </motion.div>

      <div className="w-full py-8 space-y-6 bg-[#0E1116]">
        
        {/* Structured Segment Navigation Categories */}
        <motion.div variants={blockVariants} className="flex items-center border-b border-[#C5CBD3]/10 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'border-[#F2F4F7] text-[#F2F4F7]'
                : 'border-transparent text-[#6D7886] hover:text-[#C5CBD3]'
            }`}
          >
            All Records
            <span className="ml-2 px-2 py-0.5 text-[9px] bg-[#121D29] border border-[#C5CBD3]/10 text-[#C5CBD3] rounded-sm">
              {notifications.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-5 py-3 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'unread'
                ? 'border-[#F2F4F7] text-[#F2F4F7]'
                : 'border-transparent text-[#6D7886] hover:text-[#C5CBD3]'
            }`}
          >
            Unread Payload
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-[9px] bg-rose-950/60 border border-rose-500/30 text-rose-400 rounded-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`px-5 py-3 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'read'
                ? 'border-[#F2F4F7] text-[#F2F4F7]'
                : 'border-transparent text-[#6D7886] hover:text-[#C5CBD3]'
            }`}
          >
            Archived Ledger
            <span className="ml-2 px-2 py-0.5 text-[9px] bg-[#121D29] border border-[#C5CBD3]/10 text-[#6D7886] rounded-sm">
              {readCount}
            </span>
          </button>
        </motion.div>

        {/* Master Queue Terminal Box */}
        <motion.div variants={blockVariants} className="bg-[#121D29]/20 border border-[#C5CBD3]/15 rounded-sm shadow-2xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 space-y-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#C5CBD3] border-t-transparent"></div>
              <p className="text-[10px] uppercase tracking-widest text-[#6D7886] font-mono">Polling Live Stream Nodes...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-14 w-16 bg-[#040A12] border border-[#C5CBD3]/10 rounded-sm flex items-center justify-center text-gray-400 mb-4 shadow-inner">
                <FiInbox size={22} className="text-[#6D7886] opacity-70" />
              </div>
              <h3 className="text-base font-serif text-[#F2F4F7] uppercase tracking-wide">Stream Queue Cleared</h3>
              <p className="text-xs text-[#6D7886] mt-1.5 max-w-xs font-light leading-relaxed px-4">
                {activeTab === 'unread' 
                  ? "Excellent synchronization. All inbound operations vectors have been processed."
                  : activeTab === 'read'
                  ? "No archived elements discovered within this workspace filter."
                  : "Your administrative stream is completely empty at this juncture."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#C5CBD3]/10">
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
                          ? 'bg-[#121D29]/40 border-[#F2F4F7] hover:bg-[#121D29]/60'
                          : 'border-transparent hover:bg-[#121D29]/30 bg-transparent'
                      }`}
                    >
                      
                      {/* Indicator Icon Context Box */}
                      <div className={`p-2.5 rounded-sm shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-md ${bgClass}`}>
                        <Icon size={15} />
                      </div>

                      {/* Body Parameter Cluster */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#6D7886]">
                            {notification.type ? notification.type.replace(/_/g, ' ') : 'General Broadcast'}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#6D7886] font-light">
                            <FiClock size={11} className="text-[#6D7886]" />
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed ${isUnread ? 'font-medium text-[#F2F4F7]' : 'text-[#C5CBD3]/80 font-light'}`}>
                          {notification.message}
                        </p>
                      </div>

                      {/* Telemetry Actions Node Flag */}
                      <div className="flex items-center gap-3 shrink-0 self-center pl-2">
                        {isUnread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-4 ring-rose-950 animate-pulse"></span>
                        )}
                        {isActionLoading ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-[#C5CBD3] border-t-transparent"></div>
                        ) : (
                          <FiChevronRight 
                            size={16} 
                            className="text-[#6D7886]/40 group-hover:text-[#F2F4F7] transition-colors transform group-hover:translate-x-0.5" 
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