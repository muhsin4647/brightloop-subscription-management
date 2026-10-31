import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { DashboardKPIs } from '../../types/index.ts';
import { StatCard } from '../../components/common/StatCard.tsx';
import {
  Repeat,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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

  const STATUS_COLORS: Record<string, string> = {
    active: '#10b981',
    paused: '#f59e0b',
    cancelled: '#ef4444',
    closed: '#8b5cf6',
    draft: '#94a3b8',
    confirmed: '#3b82f6',
    sent: '#60a5fa',
    paid: '#10b981',
    partially_paid: '#f59e0b',
    overdue: '#ef4444',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Billing Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time subscription metrics, recurring revenue commitments, and cash reconciliation.
          </p>
        </div>

        {/* Action: Trigger Automated Billing Scheduler */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBilling}
            disabled={runningBilling}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${runningBilling ? 'animate-spin' : ''}`} />
            {runningBilling ? 'Executing Billing...' : 'Run Due Billing Scheduler'}
          </button>
        </div>
      </div>

      {billingResultMsg && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between animate-in fade-in">
          <span>{billingResultMsg}</span>
          <button onClick={() => setBillingResultMsg(null)} className="text-indigo-600 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={kpis?.activeSubscriptions ?? '-'}
          subtitle={`Out of ${kpis?.totalSubscriptions ?? 0} total subscriptions`}
          icon={<Repeat className="w-4 h-4 text-emerald-600" />}
          highlight={true}
          onClick={() => onNavigate('/subscriptions')}
        />

        <StatCard
          title="Monthly Recurring Revenue (MRR)"
          value={kpis ? formatCurrency(kpis.mrr) : '-'}
          subtitle={`Annual Run Rate (ARR): ${kpis ? formatCurrency(kpis.arr) : '-'}`}
          icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
          highlight={true}
        />

        <StatCard
          title="Cash Collected (Period)"
          value={kpis ? formatCurrency(kpis.cashCollected) : '-'}
          subtitle={`Billed Total: ${kpis ? formatCurrency(kpis.billedRevenue) : '-'}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          onClick={() => onNavigate('/payments')}
        />

        <StatCard
          title="Overdue Invoices"
          value={kpis ? formatCurrency(kpis.overdueInvoicesAmount) : '-'}
          subtitle={`${kpis?.overdueInvoicesCount ?? 0} invoices past due date`}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          trend={kpis && kpis.overdueInvoicesCount > 0 ? 'Requires Action' : 'All Clear'}
          trendUp={false}
          onClick={() => onNavigate('/reports')}
        />
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Outstanding Receivables</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {kpis ? formatCurrency(kpis.outstandingReceivables) : '-'}
            </div>
          </div>
          <Receipt className="w-6 h-6 text-slate-400" />
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Upcoming Renewals (14d)</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{kpis?.upcomingRenewalsCount ?? '-'}</div>
          </div>
          <Calendar className="w-6 h-6 text-indigo-500" />
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Failed Billing Attempts</span>
            <div className={`text-lg font-bold mt-0.5 ${kpis && kpis.failedBillingCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis?.failedBillingCount ?? '-'}
            </div>
          </div>
          <ShieldAlert className="w-6 h-6 text-amber-500" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Collected Trend */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue Collections by Month</h3>
              <p className="text-[11px] text-slate-500">Actual reconciled payments received (INR)</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.monthlyRevenue || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Collected']}
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="collected" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Status Distribution */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Invoices by Status</h3>
            <p className="text-[11px] text-slate-500">Current portfolio breakdown</p>
          </div>

          <div className="h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.invoiceStatus || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {(charts?.invoiceStatus || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} invoices`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100">
            {(charts?.invoiceStatus || []).map((item: any) => (
              <div key={item.status} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }} />
                <span className="capitalize text-slate-600">{item.status}:</span>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Feed */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Recent Commercial &amp; Billing Events</h3>
          <button onClick={() => onNavigate('/audit-logs')} className="text-xs font-semibold text-indigo-600 hover:underline">
            View All Audit Logs &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(charts?.recentActivity || []).length === 0 ? (
            <div className="py-6 text-center text-slate-400">No activity recorded yet.</div>
          ) : (
            (charts?.recentActivity || []).map((log: any) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{log.details}</p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 shrink-0">
                  <div>{formatDate(log.created_at)}</div>
                  <div>{log.user_name || log.user_email || 'System'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
