import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Bell, LogOut, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';
import { AppNotification } from '../../types/index.ts';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const fetchNotifs = async () => {
    try {
      const data = await apiRequest<AppNotification[]>('/audit-logs/notifications');
      setNotifications(data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
    }
  }, [user]);

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-xs sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shadow-indigo-200">
          BL
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm tracking-tight">Brightloop</span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {role}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">Subscription Billing &amp; Invoicing Platform</p>
        </div>
      </div>

      {/* Right Controls: User Profile & Actions */}
      <div className="flex items-center gap-3">

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">Notifications</span>
                <span className="text-[11px] text-slate-400">{notifications.length} recent</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No new notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 text-xs hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        {n.type.includes('PAID') ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{n.title}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current User Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900">{user?.name}</div>
            <div className="text-[10px] text-slate-500">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
