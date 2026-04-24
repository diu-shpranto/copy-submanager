import { useState, useEffect } from 'react';
import { SingleSubscription, FamilySubscription, TabType } from '../types';
import { calculateExpiry, getTimeRemaining, getStatus } from '../utils/subscriptions';

interface NotificationBellProps {
  singles: SingleSubscription[];
  families: FamilySubscription[];
  now: Date;
  onTabChange?: (tab: TabType) => void;
  onSearchChange?: (search: string) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'critical' | 'info';
  date: Date;
  read: boolean;
  email: string;
  subscriptionId: string;
  daysRemaining: number;
}

export default function NotificationBell({ singles, families, now, onTabChange, onSearchChange }: NotificationBellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('read_notifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save read notifications to localStorage
  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify([...readNotifications]));
  }, [readNotifications]);

  // Generate notifications ONLY from Single Subscriptions
  useEffect(() => {
    const newNotifications: Notification[] = [];

    // Check ONLY Single Subscriptions (no families)
    singles.forEach(sub => {
      const expiry = calculateExpiry(sub.startDate, sub.startTime, sub.duration);
      const remaining = getTimeRemaining(expiry, now);
      const daysRemaining = Math.ceil(remaining.total / (1000 * 60 * 60 * 24));
      const status = getStatus(expiry, now);

      if (daysRemaining <= 7 && daysRemaining > 0 && status !== 'expired') {
        const notificationId = `single-${sub.id}`;
        
        let title = '';
        let type: 'warning' | 'critical' | 'info' = 'warning';
        
        if (daysRemaining <= 3) {
          title = '🔴 Critical Alert!';
          type = 'critical';
        } else if (daysRemaining <= 7) {
          title = '🟡 Warning';
          type = 'warning';
        }
        
        newNotifications.push({
          id: notificationId,
          title,
          message: `"${sub.email}" expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
          type,
          date: now,
          read: readNotifications.has(notificationId),
          email: sub.email,
          subscriptionId: sub.id,
          daysRemaining
        });
      }
    });

    // Sort by days remaining (soonest first)
    newNotifications.sort((a, b) => a.daysRemaining - b.daysRemaining);
    
    setNotifications(newNotifications);
  }, [singles, now, readNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifications(prev => new Set([...prev, ...allIds]));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Handle notification click - navigate to the email
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Switch to Single tab
    if (onTabChange) {
      onTabChange('single');
    }
    
    // Search for the email
    if (onSearchChange) {
      onSearchChange(notification.email);
    }
    
    // Close dropdown
    setShowDropdown(false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      default: return '🔵';
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-white';
    switch(type) {
      case 'critical': return 'bg-red-50';
      case 'warning': return 'bg-amber-50';
      default: return 'bg-blue-50';
    }
  };

  const getBorderColor = (type: string) => {
    switch(type) {
      case 'critical': return 'border-l-red-500';
      case 'warning': return 'border-l-amber-500';
      default: return 'border-l-blue-500';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button - Mobile Responsive */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-sm sm:text-base text-slate-600 bg-white/80 hover:bg-white border border-slate-200 rounded-lg transition-all hover:shadow-md"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] sm:text-[10px] rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu - Mobile Responsive */}
      {showDropdown && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent" onClick={() => setShowDropdown(false)} />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] sm:max-w-none bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-slide-down overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 transition active:scale-95"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            {/* Notifications List */}
            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-medium text-slate-600">All caught up!</p>
                  <p className="text-[10px] text-slate-400 mt-1">No subscriptions expiring soon</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer border-l-4 ${getBorderColor(notif.type)} ${getBgColor(notif.type, notif.read)} active:bg-slate-100`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 text-base sm:text-lg">{getIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-700">{notif.title}</p>
                        <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 break-words line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[8px] sm:text-[9px] text-slate-400">
                            {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full ${
                            notif.daysRemaining <= 3 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {notif.daysRemaining} day{notif.daysRemaining > 1 ? 's' : ''} left
                          </span>
                        </div>
                        {/* Email preview for mobile */}
                        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">
                          {notif.email}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-[8px] sm:text-[9px] text-slate-400">
                  🔔 Click on any notification to view the subscription
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}