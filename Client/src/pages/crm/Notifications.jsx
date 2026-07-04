import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { 
  FiBell, 
  FiCheck, 
  FiShield, 
  FiFolder, 
  FiClock, 
  FiChevronRight,
  FiMail
} from 'react-icons/fi';
import toast from 'react-hot-toast';

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
          bgClass: 'bg-rose-50 text-rose-700 border border-rose-100',
        };
      case 'TASK_ASSIGNMENT':
        return {
          icon: FiFolder,
          bgClass: 'bg-[#0B2D5B]/5 text-[#0B2D5B] border border-[#0B2D5B]/10',
        };
      case 'MESSAGE':
        return {
          icon: FiMail,
          bgClass: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        };
      default:
        return {
          icon: FiBell,
          bgClass: 'bg-gray-50 text-gray-600 border border-gray-100',
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
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Top Deck Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#C99B38]/10 pb-6 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Communications Center</span>
          <h1 className="text-3xl font-serif text-[#0B2D5B] tracking-wide mt-1 flex items-center gap-2">
            <FiBell className="text-[#C99B38]" size={26} /> Notifications
          </h1>
          <p className="text-sm text-gray-500 font-light mt-0.5">
            Monitor real-time task dispatches, cross-border shipping anomalies, and system operations logs.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-300 ${
            unreadCount === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200/50 opacity-60'
              : 'bg-white border border-[#C99B38]/20 text-[#0B2D5B] hover:border-[#C99B38] hover:bg-[#FBF7EF] active:scale-98 shadow-sm'
          }`}
        >
          <FiCheck size={14} /> Clear Active Buffer
        </button>
      </div>

      {/* Structured Category Tabs */}
      <div className="flex items-center border-b border-gray-200 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-3 border-b-2 text-xs uppercase tracking-wider font-semibold transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-[#C99B38] text-[#0B2D5B]'
              : 'border-transparent text-gray-400 hover:text-[#0B2D5B]'
          }`}
        >
          All Stream Records
          <span className="ml-2 px-2 py-0.5 text-[10px] bg-[#0B2D5B]/5 text-[#0B2D5B] rounded-full font-bold">
            {notifications.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-5 py-3 border-b-2 text-xs uppercase tracking-wider font-semibold transition-all whitespace-nowrap ${
            activeTab === 'unread'
              ? 'border-[#C99B38] text-[#0B2D5B]'
              : 'border-transparent text-gray-400 hover:text-[#0B2D5B]'
          }`}
        >
          Unread Payload
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-[10px] bg-rose-100 text-rose-800 rounded-full font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('read')}
          className={`px-5 py-3 border-b-2 text-xs uppercase tracking-wider font-semibold transition-all whitespace-nowrap ${
            activeTab === 'read'
              ? 'border-[#C99B38] text-[#0B2D5B]'
              : 'border-transparent text-gray-400 hover:text-[#0B2D5B]'
          }`}
        >
          Archived Ledger
          <span className="ml-2 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full font-bold">
            {readCount}
          </span>
        </button>
      </div>

      {/* Notifications Ledger Viewport */}
      <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-3 bg-[#FBF7EF]/10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C99B38]"></div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">Polling Live Stream Nodes...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-[#FBF7EF]/10">
            <div className="h-16 w-16 bg-white border border-[#C99B38]/10 rounded-xl flex items-center justify-center text-gray-400 mb-4 shadow-sm">
              <FiBell size={24} className="text-[#C99B38] opacity-70" />
            </div>
            <h3 className="text-base font-serif text-[#0B2D5B]">Stream Queue Cleared</h3>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs font-light leading-relaxed">
              {activeTab === 'unread' 
                ? "Excellent synchronization. All inbound operations vectors have been processed."
                : activeTab === 'read'
                ? "No archived elements discovered within this workspace filter."
                : "Your administrative stream is completely empty at this juncture."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const { icon: Icon, bgClass } = getNotificationIcon(notification.type);
              const isUnread = !notification.isRead;
              const isActionLoading = actionLoadingId === notification._id;

              return (
                <div
                  key={notification._id}
                  onClick={() => !isActionLoading && handleNotificationClick(notification)}
                  className={`group relative p-5 flex items-start gap-5 transition-all duration-200 cursor-pointer border-l-4 ${
                    isUnread
                      ? 'bg-[#FBF7EF]/30 border-[#0B2D5B] hover:bg-[#FBF7EF]/60'
                      : 'border-transparent hover:bg-[#FBF7EF]/20 bg-white'
                  }`}
                >
                  
                  {/* Indicator Icon Context */}
                  <div className={`p-3 rounded-lg shrink-0 ${bgClass} transition-transform duration-300 group-hover:scale-105`}>
                    <Icon size={16} />
                  </div>

                  {/* Body Copy Block */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                        {notification.type ? notification.type.replace(/_/g, ' ') : 'General Broadcast'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono text-gray-400 font-light">
                        <FiClock size={11} className="text-[#C99B38]" />
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${isUnread ? 'font-medium text-[#0B2D5B]' : 'text-gray-600 font-light'}`}>
                      {notification.message}
                    </p>
                  </div>

                  {/* Actions Telemetry Chevron */}
                  <div className="flex items-center gap-3 shrink-0 self-center pl-2">
                    {isUnread && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-4 ring-rose-100 animate-pulse"></span>
                    )}
                    {isActionLoading ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#C99B38]"></div>
                    ) : (
                      <FiChevronRight 
                        size={16} 
                        className="text-gray-300 group-hover:text-[#0B2D5B] transition-colors transform group-hover:translate-x-0.5" 
                      />
                    )}
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}