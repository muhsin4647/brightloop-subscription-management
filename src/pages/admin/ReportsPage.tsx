import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { DashboardKPIs } from '../../types/index.ts';
import { StatCard } from '../../components/common/StatCard.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { FileSpreadsheet, AlertTriangle, BellRing, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
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
      setReminderMsg(`Reminder dispatched to customer for invoice ${invoiceNumber}.`);
    } catch (err: any) {
      alert(err.message);
    }
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export Subscriptions CSV
          </a>
          <a
            href="/api/v1/reports/export/invoices"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            Export Invoices CSV
          </a>
        </div>
      </div>

      {reminderMsg && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between animate-in fade-in">
          <span>{reminderMsg}</span>
          <button onClick={() => setReminderMsg(null)} className="text-indigo-600 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Revenue Separation Grid (Section 17.2 requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring Revenue (MRR)"
          value={kpis ? formatCurrency(kpis.mrr) : '-'}
          subtitle="Normalized monthly recurring commitments"
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
          title="Actual Cash Collected"
          value={kpis ? formatCurrency(kpis.cashCollected) : '-'}
          subtitle="Successful payment receipts"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
        />

        <StatCard
          title="Total Billed Revenue"
          value={kpis ? formatCurrency(kpis.billedRevenue) : '-'}
          subtitle="Total invoices confirmed and issued"
          icon={<DollarSign className="w-4 h-4 text-blue-600" />}
        />
      </div>

      {/* Overdue Aging Invoices Report (Section 17.3 requirement) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Overdue Invoices Aging Report</h3>
              <p className="text-xs text-slate-500">Invoices past their contractual due dates requiring collection reminders.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
            {overdueList.length} Invoices Overdue
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Days Overdue</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading aging report...</td>
                </tr>
              ) : overdueList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-emerald-600 font-medium">
                    All invoices are up to date! No overdue receivables.
                  </td>
                </tr>
              ) : (
                overdueList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-700">{inv.invoice_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{inv.customer_company}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{inv.customer_phone || inv.customer_email}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{formatDate(inv.due_date)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                        {inv.days_overdue} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">
                      {formatCurrency(inv.outstanding_amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSendReminder(inv.id, inv.invoice_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs transition-colors"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        Send Reminder
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
