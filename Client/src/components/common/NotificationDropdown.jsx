import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBell, FiCheckCircle, FiClock, FiUserCheck, FiCalendar, 
  FiAlertCircle, FiCheck, FiX, FiTrash2 
} from 'react-icons/fi';
import { notificationsApi } from '../../api/notifications';
import { 
  processNotifications, 
  saveReadNotificationId, 
  saveAllReadNotificationIds, 
  saveDeletedNotificationId 
} from '../../utils/notificationStorage';

export default function NotificationDropdown({ compact = false }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getNotifications();
      if (res?.success) {
        const processed = processNotifications(res.data.notifications || []);
        setNotifications(processed);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    saveReadNotificationId(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    try {
      await notificationsApi.markRead(id);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    saveDeletedNotificationId(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    try {
      await notificationsApi.deleteNotification(id);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
    saveAllReadNotificationIds(unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await notificationsApi.markAllRead();
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type) => {
    switch (type) {
      case 'LEAD_ASSIGNED':
      case 'TASK_ASSIGNMENT':
        return <FiUserCheck className="text-teal-400 shrink-0" size={14} />;
      case 'LEAVE_STATUS':
        return <FiCalendar className="text-emerald-400 shrink-0" size={14} />;
      case 'ATTENDANCE_PENDING':
        return <FiClock className="text-amber-400 shrink-0 animate-pulse" size={14} />;
      case 'ATTENDANCE_MARKED':
        return <FiCheckCircle className="text-emerald-400 shrink-0" size={14} />;
      default:
        return <FiBell className="text-sky-400 shrink-0" size={14} />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center transition cursor-pointer font-mono ${
          compact 
            ? 'p-1 text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)]' 
            : 'p-1.5 border border-[var(--crm-line)] rounded-sm hover:border-[var(--crm-heading)] text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] bg-[var(--crm-bg-raised)]'
        }`}
        title="Notifications Hub"
      >
        <FiBell size={compact ? 18 : 13} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-sm font-mono animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-lg shadow-2xl z-[100] overflow-hidden text-left font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]">
              <div className="flex items-center gap-2">
                <FiBell className="text-teal-400" size={15} />
                <span className="font-bold text-[var(--crm-heading)] text-xs uppercase tracking-wider font-mono">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-950 text-teal-400 border border-teal-800 font-mono">
                    {unreadCount} Unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[10px] text-teal-400 hover:text-teal-300 font-mono underline cursor-pointer disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[var(--crm-line)] custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--crm-ink-faint)] font-mono uppercase tracking-wider">
                  No notifications recorded.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={(e) => handleMarkRead(notif._id, e)}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer group ${
                      notif.isRead 
                        ? 'opacity-70 hover:bg-[var(--crm-bg-sunken)]/50' 
                        : 'bg-teal-950/20 hover:bg-teal-950/40'
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] shrink-0">
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1 font-mono text-xs">
                      <div className="text-[var(--crm-heading)] text-xs leading-snug font-medium">
                        {notif.message}
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-[var(--crm-ink-faint)]">
                        <span>{formatTimeAgo(notif.createdAt)}</span>
                        {!notif.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                        )}
                      </div>
                    </div>

                    {/* Delete Action Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(notif._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--crm-ink-faint)] hover:text-rose-400 hover:bg-rose-950/50 rounded transition cursor-pointer shrink-0"
                      title="Delete Notification"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-[var(--crm-bg-sunken)] border-t border-[var(--crm-line)] text-center text-[10px] font-mono text-[var(--crm-ink-faint)]">
              Live Notifications Matrix • India Trade Overseas
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
