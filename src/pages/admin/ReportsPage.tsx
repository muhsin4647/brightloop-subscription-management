import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { DashboardKPIs } from '../../types/index.ts';
import { StatCard } from '../../components/common/StatCard.tsx';
import {
  FileSpreadsheet,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [kpiRes, overdueRes] = await Promise.all([
        apiRequest<DashboardKPIs>('/reports/kpis'),
        apiRequest<any[]>('/reports/overdue'),
      ]);
      setKpis(kpiRes);
      setOverdueList(overdueRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSendReminder = async (invoiceId: string, invoiceNumber: string) => {
    try {
      await apiRequest(`/invoices/${invoiceId}/reminder`, { method: 'POST' });
      setReminderMsg(`Reminder successfully dispatched to customer for invoice #${invoiceNumber}.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getAvatarInitials = (name: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Reporting &amp; Aging Analysis</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized MRR/ARR commitments, aging receivables, cash collections, and CSV data exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/v1/reports/export/subscriptions"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Subscriptions CSV</span>
          </a>
          <a
            href="/api/v1/reports/export/invoices"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Invoices CSV</span>
          </a>
        </div>
      </div>

      {reminderMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>{reminderMsg}</span>
          </div>
          <button onClick={() => setReminderMsg(null)} className="text-indigo-600 font-semibold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Revenue Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring Revenue (MRR)"
          value={kpis ? formatCurrency(kpis.mrr) : '-'}
          subtitle="Normalized monthly commitments"
          icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
          highlight={true}
        />

        <StatCard
          title="Annual Recurring Revenue (ARR)"
          value={kpis ? formatCurrency(kpis.arr) : '-'}
          subtitle="Annualized run rate (MRR × 12)"
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
        />

        <StatCard
          title="Reconciled Cash Collected"
          value={kpis ? formatCurrency(kpis.cashCollected) : '-'}
          subtitle="Total verified receipts"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
        />

        <StatCard
          title="Total Billed Revenue"
          value={kpis ? formatCurrency(kpis.billedRevenue) : '-'}
          subtitle="Issued commercial invoices"
          icon={<DollarSign className="w-4 h-4 text-blue-600" />}
        />
      </div>

      {/* Overdue Aging Invoices Report */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Overdue Invoices Aging Report</h3>
              <p className="text-xs text-slate-500">Invoices past their contractual due dates requiring dunning collection reminders.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60 font-mono">
            {overdueList.length} Invoices Past Due
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-4">Contact Phone / Email</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Aging Days</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Dunning Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading aging report...
                  </td>
                </tr>
              ) : overdueList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-emerald-700 font-medium">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200/60">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    All receivables are current! No overdue invoices at this time.
                  </td>
                </tr>
              ) : (
                overdueList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(inv.customer_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{inv.customer_company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {inv.customer_phone || inv.customer_email}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-rose-600 font-semibold tabular-nums">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                        {inv.days_overdue}d overdue
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 tabular-nums">
                      {formatCurrency(inv.outstanding_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSendReminder(inv.id, inv.invoice_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>Send Notice</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
