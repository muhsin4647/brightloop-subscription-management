import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Percent,
  BarChart3,
  Cog,
  UserCheck,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const { role } = useAuth();

  const isCustomer = role === 'CUSTOMER';
  const isAdmin = role === 'ADMIN';

  const adminNavItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Subscriptions', path: '/subscriptions', icon: <Repeat className="w-4 h-4" /> },
    { label: 'Invoices', path: '/invoices', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Quotations', path: '/quotations', icon: <FileText className="w-4 h-4" /> },
    { label: 'Customers', path: '/customers', icon: <Users className="w-4 h-4" /> },
    { label: 'Products & Variants', path: '/products', icon: <Package className="w-4 h-4" /> },
    { label: 'Subscription Plans', path: '/plans', icon: <Layers className="w-4 h-4" /> },
    { label: 'Payments', path: '/payments', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Billing Operations', path: '/billing', icon: <Cog className="w-4 h-4" /> },
    { label: 'Reports & Analytics', path: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
    ...(isAdmin
      ? [
          { label: 'Taxes & Discounts', path: '/taxes-discounts', icon: <Percent className="w-4 h-4" /> },
          { label: 'Staff Management', path: '/staff', icon: <UserCheck className="w-4 h-4" /> },
          { label: 'Audit Logs', path: '/audit-logs', icon: <ShieldCheck className="w-4 h-4" /> },
        ]
      : []),
  ];

  const customerNavItems = [
    { label: 'Overview', path: '/portal', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'My Subscriptions', path: '/portal/subscriptions', icon: <Repeat className="w-4 h-4" /> },
    { label: 'Invoices & Receipts', path: '/portal/invoices', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Payment Ledger', path: '/portal/payments', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Account Profile', path: '/portal/profile', icon: <UserCircle className="w-4 h-4" /> },
  ];

  const items = isCustomer ? customerNavItems : adminNavItems;

  return (
    <aside className="w-64 border-r border-slate-200/80 bg-slate-50/60 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2.5">
          {isCustomer ? 'Client Workspace' : 'Billing & Operations'}
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                }`}
              >
                <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200/70 bg-white/50">
        <div className="text-[11px] text-slate-500 flex items-center justify-between">
          <span className="font-medium">Brightloop Platform</span>
          <span className="font-mono text-[10px] text-slate-400">v2.4 Production</span>
        </div>
      </div>
    </aside>
  );
};
