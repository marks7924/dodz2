'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, X, Check, CheckCheck, ShoppingBag, MessageCircle, Truck, CreditCard, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Notification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from '@/lib/notifications';

// ── Icon per notification type ─────────────────────────────
function NotificationIcon({ type }: { type: Notification['type'] }) {
  const cls = 'h-4 w-4 flex-shrink-0';
  switch (type) {
    case 'new_order':      return <ShoppingBag className={`${cls} text-accent-amber`} />;
    case 'order_status':   return <Truck className={`${cls} text-blue-400`} />;
    case 'new_chat':       return <MessageCircle className={`${cls} text-green-400`} />;
    case 'payment':        return <CreditCard className={`${cls} text-purple-400`} />;
    case 'role_change':    return <Shield className={`${cls} text-primary-red`} />;
    case 'delivery_update':return <Truck className={`${cls} text-cyan-400`} />;
    default:               return <AlertCircle className={`${cls} text-text-muted`} />;
  }
}

// ── Relative timestamp ─────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  // Load notifications on mount
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    getNotifications(user.id).then(setNotifications).catch(console.error);

    // Realtime subscription
    const channel = subscribeToNotifications(user.id, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setHasNew(true);

      // Browser notification (if granted)
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(newNotif.title, { body: newNotif.body, icon: '/favicon.ico' });
      }
    });

    return () => { channel.unsubscribe(); };
  }, [user, isAuthenticated]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
    setHasNew(false);
  };

  const handleMarkOne = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
        aria-label="Notifications"
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          open
            ? 'bg-primary-red/10 border-primary-red/30 text-primary-red'
            : 'bg-card border-card-border text-text-muted hover:text-white hover:border-white/20'
        }`}
      >
        {hasNew || unread > 0
          ? <BellRing className="h-4.5 w-4.5 animate-pulse" />
          : <Bell className="h-4.5 w-4.5" />
        }

        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-primary-red text-white text-[9px] font-black flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div
          id="notification-panel"
          className="fixed sm:absolute right-2 sm:right-0 rtl:left-2 rtl:right-auto sm:rtl:left-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-sm bg-card border border-card-border rounded-2xl shadow-2xl z-[100] overflow-hidden"
          style={{ animation: 'slideDown 0.15s ease-out', backgroundColor: 'rgb(18,18,20)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">
              Notifications {unread > 0 && <span className="text-primary-red">({unread})</span>}
            </span>
            <div className="flex items-center gap-1.5">
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-card-border transition-all cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-card-border transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
                <Bell className="h-7 w-7 text-text-muted opacity-40" />
                <p className="text-xs text-text-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-card-border/40 hover:bg-card-border/20 transition-all ${
                    !notif.is_read ? 'bg-primary-red/[0.03]' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 p-1.5 rounded-lg ${!notif.is_read ? 'bg-primary-red/10' : 'bg-card-border/40'}`}>
                    <NotificationIcon type={notif.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <p className={`text-[11px] font-bold leading-tight ${!notif.is_read ? 'text-white' : 'text-text-muted'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[10px] text-text-muted leading-snug mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                    <span className="text-[9px] text-text-muted/60 mt-1 block">
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>

                  {/* Mark as read */}
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkOne(notif.id)}
                      title="Mark as read"
                      className="flex-shrink-0 p-1 rounded-lg text-text-muted hover:text-white transition-all mt-0.5 cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-card-border text-center">
              <span className="text-[10px] text-text-muted">
                Showing last {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
