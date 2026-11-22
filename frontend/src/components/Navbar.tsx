import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, User as UserIcon, Shield, GraduationCap, School } from 'lucide-react';
import api from '../services/api';
import { NotificationsModal } from './NotificationsModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const fetchUnread = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3" />
            Administrator
          </span>
        );
      case 'PROFESSOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <School className="w-3 h-3" />
            Professor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <GraduationCap className="w-3 h-3" />
            Student
          </span>
        );
    }
  };

  return (
    <>
      <header className="border-b border-border bg-surface px-6 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              C
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-text-primary">Cohortly</span>
              {user && getRoleBadge(user.role)}
            </div>
          </div>

          {/* User profile & Actions */}
          {user && (
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 rounded-md hover:bg-gray-100 text-text-secondary transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="h-4 w-px bg-border"></div>

              {/* User details */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 border border-border flex items-center justify-center text-text-secondary">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  <div className="font-semibold text-text-primary">{user.full_name}</div>
                  <div className="text-text-muted">{user.email}</div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-danger hover:bg-red-50 rounded-md transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadChange={fetchUnread}
      />
    </>
  );
};
