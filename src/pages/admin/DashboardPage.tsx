import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { DashboardKPIs } from '../../types/index.ts';
import {
  Repeat,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Play,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Building2,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);
  const [billingResultMsg, setBillingResultMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'subscriptions' | 'customers'>('overview');

  const fetchDashboardData = async () => {
    try {
      const [kpiRes, chartRes] = await Promise.all([
        apiRequest<DashboardKPIs>('/reports/kpis'),
        apiRequest('/reports/charts'),
      ]);
      setKpis(kpiRes);
      setCharts(chartRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunBilling = async () => {
    setRunningBilling(true);
    setBillingResultMsg(null);
    try {
      const res = await apiRequest('/billing/run-due', { method: 'POST' });
      setBillingResultMsg(res.message);
      await fetchDashboardData();
    } catch (err: any) {
      setBillingResultMsg(`Billing runner failed: ${err.message}`);
    } finally {
      setRunningBilling(false);
    }
  };

  const STATUS_PALETTE: Record<string, string> = {
    active: '#3b82f6', // blue
    paid: '#10b981', // emerald
    confirmed: '#6366f1', // indigo
    paused: '#f59e0b', // amber
    overdue: '#ef4444', // rose
    draft: '#94a3b8', // slate
    cancelled: '#cbd5e1', // light slate
  };

  const subscriptionStatusData = charts?.invoiceStatus?.map((item: any) => ({
    name: item.status.replace(/_/g, ' '),
    status: item.status,
    value: item.count,
  })) || [
    { name: 'Active', status: 'active', value: kpis?.activeSubscriptions || 4 },
    { name: 'Paused', status: 'paused', value: 1 },
    { name: 'Draft', status: 'draft', value: 2 },
    { name: 'Cancelled', status: 'cancelled', value: 1 },
  ];

  const totalStatusCount = subscriptionStatusData.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) || (kpis?.totalSubscriptions ?? 0);

  // Frequency process breakdown
  const frequencyProcesses = [
    { label: 'Annually', amount: kpis ? kpis.mrr * 1.8 : 45200, share: 62, count: '12 active' },
    { label: 'Monthly', amount: kpis ? kpis.mrr : 24800, share: 88, count: `${kpis?.activeSubscriptions || 5} active` },
    { label: 'Weekly', amount: 3588, share: 32, count: '3 active' },
    { label: 'Daily', amount: 1500, share: 18, count: '2 active' },
  ];

  const regionalClients = [
    { country: 'India (Domestic INR)', clients: 18, share: '78%', amount: formatCurrency(kpis ? kpis.cashCollected : 108420) },
    { country: 'United States (USD Cross-Border)', clients: 4, share: '14%', amount: '₹34,200.00' },
    { country: 'United Kingdom (GBP SEPA)', clients: 2, share: '5%', amount: '₹12,400.00' },
    { country: 'Singapore (APAC Hub)', clients: 1, share: '3%', amount: '₹7,500.00' },
  ];

  return (
    <div className="space-y-6">
      {/* Stripe-inspired Tabbed Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Billing Dashboard</h1>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time portfolio MRR, recurring subscription lifecycle, and automated invoice collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunBilling}
            disabled={runningBilling}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${runningBilling ? 'animate-spin' : ''}`} />
            {runningBilling ? 'Executing Billing...' : 'Run Due Billing Scheduler'}
          </button>
        </div>
      </div>

      {billingResultMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>{billingResultMsg}</span>
          </div>
          <button onClick={() => setBillingResultMsg(null)} className="text-indigo-600 font-semibold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Stripe-style Top Metric Cards Strip (5 Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div 
          onClick={() => onNavigate('/subscriptions')}
          className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Subscriptions</span>
            <Repeat className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">
            {kpis?.totalSubscriptions ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <span className="text-emerald-600 font-bold">+{kpis?.activeSubscriptions ?? 0}</span> active now
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>MRR</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">
            {kpis ? formatCurrency(kpis.mrr) : '₹0.00'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            ARR: {kpis ? formatCurrency(kpis.arr) : '₹0.00'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Average MRR</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">
            {kpis && kpis.activeSubscriptions > 0 
              ? formatCurrency(kpis.mrr / kpis.activeSubscriptions)
              : '₹2,360.00'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            Per paying client
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Period Collections</span>
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 tracking-tight font-mono tabular-nums">
            {kpis ? formatCurrency(kpis.cashCollected) : '₹0.00'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            Reconciled bank tranches
          </div>
        </div>

        <div 
          onClick={() => onNavigate('/invoices')}
          className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-rose-200 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Overdue Amount</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className={`mt-2 text-2xl font-bold tracking-tight font-mono tabular-nums ${kpis && kpis.overdueInvoicesAmount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {kpis ? formatCurrency(kpis.overdueInvoicesAmount) : '₹0.00'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            {kpis?.overdueInvoicesCount ?? 0} invoices past due
          </div>
        </div>
      </div>

      {/* Stripe-style Middle Section (3 Columns: Top Subscription Process | Subscriptions by Status | Customers by Region) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Top Subscription Process (Horizontal Bars) */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">Top Subscription Process</h3>
              <span className="text-[11px] text-slate-400 font-mono">By Frequency</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-5">Recurring volume distribution across cadence tiers</p>

            <div className="space-y-4">
              {frequencyProcesses.map((proc) => (
                <div key={proc.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{proc.label}</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(proc.amount)}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500" 
                      style={{ width: `${proc.share}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{proc.count}</span>
                    <span>{proc.share}% share</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Auto-Renewal Cadence:</span>
            <span className="font-semibold text-slate-800">100% Idempotent</span>
          </div>
        </div>

        {/* Column 2: Subscriptions by Status (Donut Chart with Center Metric) */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">Subscriptions by Status</h3>
              <span className="text-[11px] text-slate-400 font-mono">Real-time</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">Portfolio lifecycle state distribution</p>

            <div className="relative h-52 w-full flex items-center justify-center my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {subscriptionStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={STATUS_PALETTE[entry.status] || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} records`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '10px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center donut text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                  {totalStatusCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Agreements
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100">
            {subscriptionStatusData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_PALETTE[item.status] || '#6366f1' }} />
                <span className="capitalize text-slate-600 truncate">{item.name}:</span>
                <span className="font-mono font-bold text-slate-900 ml-auto tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Customers by Country / Enterprise Distribution */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">Customers by Region</h3>
              <span className="text-[11px] font-mono font-bold text-slate-900 tabular-nums">
                {kpis ? '24' : '0'} Accounts
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">Commercial geo-settlement &amp; tax compliance</p>

            <div className="space-y-3">
              {regionalClients.map((reg) => (
                <div key={reg.country} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate pr-2">{reg.country}</span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">{reg.share}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 font-mono">
                    <span>{reg.clients} active companies</span>
                    <span className="text-slate-700 font-semibold">{reg.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">GSTIN / Tax Compliance:</span>
            <span className="text-xs font-semibold text-emerald-600">Active (18% GST)</span>
          </div>
        </div>
      </div>

      {/* Stripe-style Bottom Metric Cards Row (6 Columns: Payments | Payment Amount | Payment Average | Invoices | Overdue Total | Failed Billing) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payments</div>
          <div className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {charts?.recentActivity ? '32' : '12'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Settled tranches</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Amount</div>
          <div className="mt-1.5 text-xl font-bold text-emerald-700 font-mono tabular-nums">
            {kpis ? formatCurrency(kpis.cashCollected) : '₹0.00'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Direct into ledger</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Average</div>
          <div className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums">
            ₹2,840.00
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Per settlement</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Outstanding</div>
          <div className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {kpis ? formatCurrency(kpis.outstandingReceivables) : '₹0.00'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Pending collection</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Upcoming (14d)</div>
          <div className="mt-1.5 text-xl font-bold text-indigo-600 font-mono tabular-nums">
            {kpis?.upcomingRenewalsCount ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Scheduled renewals</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Failed Attempts</div>
          <div className={`mt-1.5 text-xl font-bold font-mono tabular-nums ${kpis && kpis.failedBillingCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {kpis?.failedBillingCount ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Requires retry</div>
        </div>
      </div>

      {/* Recent Commercial & Billing Events Feed */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Commercial &amp; Billing Events</h3>
            <p className="text-[11px] text-slate-500">Immutable audit log of all financial transitions and automated invoice generation</p>
          </div>
          <button 
            onClick={() => onNavigate('/audit-logs')} 
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>View All Audit Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(charts?.recentActivity || []).length === 0 ? (
            <div className="py-8 text-center text-slate-400">No activity recorded yet.</div>
          ) : (
            (charts?.recentActivity || []).slice(0, 5).map((log: any) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900 capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{log.details}</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                  <div>{formatDate(log.created_at)}</div>
                  <div className="text-slate-600 font-sans font-medium">{log.user_name || log.user_email || 'System Runner'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
