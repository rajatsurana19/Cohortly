import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Clock } from 'lucide-react';
import api from '../services/api';
import { Notification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onUnreadChange,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      if (onUnreadChange) onUnreadChange();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-xl border border-border shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-text-secondary hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-text-secondary">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">No notifications found</div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 text-left transition-colors ${
                  !item.read_at ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-text-primary">{item.title}</h4>
                  <span className="text-[11px] text-text-muted flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
