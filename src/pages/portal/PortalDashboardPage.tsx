import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { InvoiceDetailModal } from '../../components/invoice/InvoiceDetailModal.tsx';
import {
  Repeat,
  Receipt,
  CreditCard,
  ArrowRight,
  Calendar,
  Eye,
  Download,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { generateInvoicePDF } from '../../lib/pdf.ts';

interface PortalDashboardPageProps {
  onNavigate: (path: string) => void;
}

export const PortalDashboardPage: React.FC<PortalDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await apiRequest('/portal/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleDownloadPDF = async (inv: any) => {
    try {
      const res = await apiRequest(`/portal/invoices/${inv.id}`);
      generateInvoicePDF(res.invoice, res.lines, res.customer);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Welcome Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle decorative radial overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.2),transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
            <span>Customer Portal</span>
            <span aria-hidden="true">·</span>
            <span>{data?.customer?.company || 'Verified Account'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Welcome back, {user?.name || 'Customer'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Monitor active recurring subscriptions, retrieve tax invoices, and reconcile payment transactions in real time.
          </p>
        </div>

        {data?.totalOutstanding > 0 && (
          <div className="relative z-10 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-right shrink-0">
            <span className="text-[11px] text-slate-300 uppercase font-semibold block">Outstanding Balance</span>
            <div className="text-2xl font-bold font-mono text-rose-300 tabular-nums">
              {formatCurrency(data.totalOutstanding)}
            </div>
            <button
              onClick={() => onNavigate('/portal/invoices')}
              className="mt-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Settle Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Primary Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigate('/portal/subscriptions')}
          className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Subscriptions
            </span>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 group-hover:text-indigo-600 transition-colors">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {data?.activeSubscriptions?.length || 0}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
            <span>Manage subscriptions</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('/portal/invoices')}
          className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Issued Invoices
            </span>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 group-hover:text-indigo-600 transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {data?.recentInvoices?.length || 0}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
            <span>Access tax invoices</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('/portal/payments')}
          className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Settled Payments
            </span>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 group-hover:text-indigo-600 transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {data?.recentPayments?.length || 0}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
            <span>Payment receipts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Active Subscriptions Overview */}
      <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Subscriptions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Recurring plans actively provisioning services</p>
          </div>
          <button
            onClick={() => onNavigate('/portal/subscriptions')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {(data?.activeSubscriptions || []).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No active subscriptions. Browse the catalog to activate a subscription.
            </div>
          ) : (
            (data?.activeSubscriptions || []).map((sub: any) => (
              <div
                key={sub.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700">{sub.subscription_number}</span>
                    <StatusBadge status={sub.status} size="sm" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{sub.plan_name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Renews on <strong className="text-slate-700 font-mono">{formatDate(sub.next_billing_date)}</strong>{' '}
                      ({sub.billing_frequency})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Commitment</span>
                    <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(sub.total_amount)}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('/portal/subscriptions')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Invoices Preview */}
      <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Invoices</h2>
            <p className="text-xs text-slate-500 mt-0.5">Commercial invoices and payment allocation</p>
          </div>
          <button
            onClick={() => onNavigate('/portal/invoices')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>All Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentInvoices || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">No invoices yet.</td>
                </tr>
              ) : (
                (data?.recentInvoices || []).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-3 text-slate-600">{formatDate(inv.issue_date)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          title="PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onUpdated={fetchDashboard}
      />
    </div>
  );
};
