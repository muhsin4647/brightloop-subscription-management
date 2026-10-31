import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Bell, LogOut, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
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

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const isCustomer = role === 'CUSTOMER';

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-xs">
          BL
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm tracking-tight">Brightloop</span>
            <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
              {isCustomer ? 'Customer Portal' : role}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Subscription Lifecycle &amp; Recurring Billing
          </p>
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100/80 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[11px] text-slate-400 font-mono">{notifications.length} recent</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No new notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 text-xs hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        {n.type.includes('PAID') ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
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

        {/* User Card & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</div>
              <div className="text-[10px] text-slate-500 font-mono leading-tight">{user?.email}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50/80 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
