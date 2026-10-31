import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Bell, Search, LogOut, CheckCircle2, AlertCircle, ChevronDown, User, Shield, ExternalLink } from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';
import { AppNotification } from '../../types/index.ts';

interface NavbarProps {
  onSearch?: (query: string) => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, onNavigate }) => {
  const { user, role, logout } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle global Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const inputEl = document.getElementById('navbar-quick-search');
        inputEl?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    onSearch?.(val);

    if (val.trim().length > 1) {
      try {
        const [invs, custs] = await Promise.all([
          apiRequest<any[]>(`/invoices?search=${encodeURIComponent(val)}`).catch(() => []),
          apiRequest<any[]>(`/customers?search=${encodeURIComponent(val)}`).catch(() => []),
        ]);
        const combined = [
          ...invs.slice(0, 3).map((i) => ({ type: 'invoice', id: i.id, title: i.invoice_number, sub: `${i.customer_name} • $${i.total_amount}`, path: '/invoices' })),
          ...custs.slice(0, 3).map((c) => ({ type: 'customer', id: c.id, title: c.name, sub: c.company || c.email, path: '/customers' })),
        ];
        setSearchResults(combined);
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
      }
    } else {
      setShowSearchDropdown(false);
    }
  };

  // Extract initials (e.g. Alex Kim -> AK)
  const getInitials = (name?: string) => {
    if (!name) return 'AK';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.name ? (user.name.includes('Admin') ? 'Alex Kim' : user.name) : 'Alex Kim';
  const displayRole = role === 'ADMIN' ? 'Administrator' : role === 'STAFF' ? 'Staff' : 'Customer';

  return (
    <header className="flex items-center justify-between pb-6 mb-2">
      {/* Search Input matching exact Reference UI */}
      <div ref={searchContainerRef} className="relative w-72 sm:w-96">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            id="navbar-quick-search"
            type="text"
            placeholder="Search customers, invoices..."
            value={searchVal}
            onChange={handleSearchChange}
            onFocus={() => searchVal.trim().length > 1 && setShowSearchDropdown(true)}
            className="w-full pl-10 pr-12 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6342e8]/20 focus:border-[#6342e8] transition-all shadow-xs"
          />
          <div className="absolute right-3 flex items-center gap-0.5 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono select-none">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* Live Search Results Dropdown */}
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Results
            </div>
            {searchResults.map((res) => (
              <button
                key={`${res.type}-${res.id}`}
                onClick={() => {
                  setShowSearchDropdown(false);
                  onNavigate?.(res.path);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-900">{res.title}</div>
                  <div className="text-[11px] text-slate-500">{res.sub}</div>
                </div>
                <span className="text-[10px] text-purple-600 bg-purple-100 font-semibold px-2 py-0.5 rounded-full capitalize">
                  {res.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Notification Bell & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell matching exact Reference UI */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#6342e8] ring-2 ring-white" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[11px] text-[#6342e8] font-semibold">{notifications.length} new</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No new notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        {n.type.includes('PAID') ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-[#6342e8] shrink-0" />
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

        {/* User Profile Lockup matching exact Reference UI */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 sm:pr-2 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#ede9fe] text-[#6342e8] font-bold text-xs flex items-center justify-center shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">
                {displayRole}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'alex@brightloop.io'}</p>
              </div>
              {onNavigate && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate(role === 'CUSTOMER' ? '/portal/profile' : '/staff');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account profile</span>
                </button>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
