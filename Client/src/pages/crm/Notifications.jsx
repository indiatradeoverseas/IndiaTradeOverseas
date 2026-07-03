import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import { 
  FiBell, 
  FiCheck, 
  FiShield, 
  FiFolder, 
  FiInfo, 
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
          bgClass: 'bg-red-50 text-red-600 border border-red-100',
        };
      case 'TASK_ASSIGNMENT':
        return {
          icon: FiFolder,
          bgClass: 'bg-blue-50 text-blue-600 border border-blue-100',
        };
      case 'MESSAGE':
        return {
          icon: FiMail,
          bgClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        };
      default:
        return {
          icon: FiBell,
          bgClass: 'bg-slate-50 text-slate-600 border border-slate-100',
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
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 flex items-center gap-2">
            <FiBell className="text-[#0f4c75]" /> Notifications
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Stay updated with tasks, security alerts, and system notifications.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
            unreadCount === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 shadow-sm'
          }`}
        >
          <FiCheck size={16} /> Mark all as read
        </button>
      </div>

      
      <div className="flex items-center border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-[#0f4c75] text-[#0f4c75]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          All Notifications
          <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-bold">
            {notifications.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'unread'
              ? 'border-[#0f4c75] text-[#0f4c75]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('read')}
          className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'read'
              ? 'border-[#0f4c75] text-[#0f4c75]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Read
          <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-bold">
            {readCount}
          </span>
        </button>
      </div>

      {/* List Container */}
      <div className="card">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0f4c75]"></div>
            <p className="text-sm text-slate-500 font-medium">Fetching notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-inner">
              <FiBell size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No notifications found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              {activeTab === 'unread' 
                ? "You've read all your notifications! Good job."
                : activeTab === 'read'
                ? "No read notifications found."
                : "You don't have any notifications at the moment."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((notification) => {
              const { icon: Icon, bgClass } = getNotificationIcon(notification.type);
              const isUnread = !notification.isRead;
              const isActionLoading = actionLoadingId === notification._id;

              return (
                <div
                  key={notification._id}
                  onClick={() => !isActionLoading && handleNotificationClick(notification)}
                  className={`group relative p-4 sm:p-5 flex items-start gap-4 transition-all duration-200 cursor-pointer -mx-6 first:rounded-t-2xl last:rounded-b-2xl border-l-4 ${
                    isUnread
                      ? 'bg-violet-50/20 border-[#0f4c75]/80 hover:bg-violet-50/40'
                      : 'border-transparent hover:bg-slate-50 bg-white'
                  }`}
                >
                  
                  <div className={`p-2.5 rounded-xl shrink-0 ${bgClass} transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={20} />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {notification.type ? notification.type.replace(/_/g, ' ') : 'General Alert'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <FiClock size={12} />
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${isUnread ? 'font-semibold text-slate-950' : 'text-slate-700'}`}>
                      {notification.message}
                    </p>
                  </div>

                  
                  <div className="flex items-center gap-3 shrink-0 self-center">
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-violet-600 ring-4 ring-violet-100 animate-pulse"></span>
                    )}
                    {isActionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0f4c75]"></div>
                    ) : (
                      <FiChevronRight 
                        size={18} 
                        className="text-slate-400 group-hover:text-slate-700 transition-colors group-hover:translate-x-0.5" 
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
