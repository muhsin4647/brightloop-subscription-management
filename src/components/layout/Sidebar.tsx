import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Repeat,
  Layers,
  Receipt,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal.tsx';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const { role } = useAuth();
  const isCustomer = role === 'CUSTOMER';
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const adminNavItems = [
    { label: 'Overview', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Subscriptions', path: '/subscriptions', icon: <Repeat className="w-4 h-4" /> },
    { label: 'Pricing & Plans', path: '/plans', icon: <Layers className="w-4 h-4" /> },
    { label: 'Invoices', path: '/invoices', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Revenue (MRR)', path: '/billing', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Customers', path: '/customers', icon: <Users className="w-4 h-4" /> },
    { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const customerNavItems = [
    { label: 'Overview', path: '/portal', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Subscriptions', path: '/portal/subscriptions', icon: <Repeat className="w-4 h-4" /> },
    { label: 'Pricing & Plans', path: '/plans', icon: <Layers className="w-4 h-4" /> },
    { label: 'Invoices', path: '/portal/invoices', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Payments', path: '/portal/payments', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Profile', path: '/portal/profile', icon: <Users className="w-4 h-4" /> },
  ];

  const items = isCustomer ? customerNavItems : adminNavItems;

  return (
    <>
      <aside className="w-64 bg-[#f4f3fb] p-5 flex flex-col justify-between shrink-0 min-h-[calc(100vh-1rem)] select-none">
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onNavigate(isCustomer ? '/portal' : '/')}
            className="flex items-center gap-3 px-2 py-1 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 rotate-12"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                Brightloop
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {items.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path === '/plans' && currentPath === '/plans') ||
                (item.path === '/subscriptions' && currentPath === '/subscriptions');

              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#ede9fe] text-[#5b50f6] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span className={isActive ? 'text-[#5b50f6]' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Settings & Pro Features Promo Card */}
        <div className="space-y-4 pt-4 border-t border-slate-200/50">
          {/* Settings Link */}
          <button
            onClick={() => onNavigate(isCustomer ? '/portal/profile' : '/taxes-discounts')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all cursor-pointer text-left"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>

          {/* Pro Features Promo Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex flex-col items-center text-center space-y-2.5">
            <div className="w-14 h-14 relative flex items-center justify-center">
              <img
                src="/src/assets/images/pro_crystal_gem_1793431452847.jpg"
                alt="Pro Features Crystal"
                className="w-12 h-12 object-contain drop-shadow-md rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Pro Features</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Unlock advanced analytics, AI insights &amp; priority support.
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-2 px-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* Upgrade Pro Modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Brightloop Pro Features"
        subtitle="Scale your subscription operations with enterprise automation"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 mx-auto">
            <img
              src="/src/assets/images/pro_crystal_gem_1793431452847.jpg"
              alt="Pro Features"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Enterprise Intelligence Suite</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Automate multi-entity billing, AI-driven churn predictions, dunning retries, and high-frequency real-time webhooks.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#faf9fd] border border-slate-100 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Real-time recurring automated billing</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Instant multi-channel payment windows</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Dedicated commercial ledger &amp; tax rules</span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowUpgradeModal(false);
              onNavigate('/plans');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Explore All Plans
          </button>
        </div>
      </Modal>
    </>
  );
};
