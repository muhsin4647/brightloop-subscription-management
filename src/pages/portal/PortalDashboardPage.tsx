import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { InvoiceDetailModal } from '../../components/invoice/InvoiceDetailModal.tsx';
import { Repeat, Receipt, CreditCard, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

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

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-300">Customer Self-Service Portal</span>
          <h1 className="text-2xl font-black mt-1">Welcome, {user?.name || 'Customer'}</h1>
          <p className="text-xs text-slate-300 mt-1">
            Manage your Brightloop software subscriptions, access itemized invoices, and reconcile payments.
          </p>
        </div>

        {data?.totalOutstanding > 0 && (
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-right shrink-0">
            <span className="text-[11px] text-indigo-200 uppercase font-semibold block">Outstanding Balance</span>
            <div className="text-2xl font-black text-rose-300">{formatCurrency(data.totalOutstanding)}</div>
            <button
              onClick={() => onNavigate('/portal/invoices')}
              className="mt-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors inline-block"
            >
              Pay Now &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Active Subscriptions</span>
            <Repeat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{data?.activeSubscriptions?.length || 0}</div>
          <button
            onClick={() => onNavigate('/portal/subscriptions')}
            className="text-xs text-indigo-600 hover:underline font-semibold mt-2 block"
          >
            View Subscriptions &rarr;
          </button>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Recent Invoices</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{data?.recentInvoices?.length || 0}</div>
          <button
            onClick={() => onNavigate('/portal/invoices')}
            className="text-xs text-indigo-600 hover:underline font-semibold mt-2 block"
          >
            Access Invoices &rarr;
          </button>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Past Payments</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{data?.recentPayments?.length || 0}</div>
          <button
            onClick={() => onNavigate('/portal/payments')}
            className="text-xs text-indigo-600 hover:underline font-semibold mt-2 block"
          >
            Payment Receipts &rarr;
          </button>
        </div>
      </div>

      {/* Active Subscriptions Preview */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Active Subscriptions</h3>
          <button
            onClick={() => onNavigate('/portal/subscriptions')}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Manage All &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(data?.activeSubscriptions || []).length === 0 ? (
            <div className="p-6 text-center text-slate-400">No active subscriptions on your account.</div>
          ) : (
            data.activeSubscriptions.map((sub: any) => (
              <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700">{sub.subscription_number}</span>
                    <StatusBadge status={sub.status} size="sm" />
                  </div>
                  <div className="font-semibold text-slate-900 text-sm mt-0.5">{sub.plan_name}</div>
                  <div className="text-slate-500 mt-0.5">
                    Renews on <strong className="text-slate-700">{formatDate(sub.next_billing_date)}</strong> ({sub.billing_frequency})
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">{formatCurrency(sub.total_amount)}</div>
                  <button
                    onClick={() => onNavigate('/portal/subscriptions')}
                    className="text-xs font-semibold text-indigo-600 hover:underline mt-1"
                  >
                    View Plan Terms &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Invoices Preview */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent Invoices</h3>
          <button
            onClick={() => onNavigate('/portal/invoices')}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            View All Invoices &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(data?.recentInvoices || []).length === 0 ? (
            <div className="p-6 text-center text-slate-400">No invoices generated yet.</div>
          ) : (
            data.recentInvoices.map((inv: any) => (
              <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                <div>
                  <div className="font-bold text-slate-900">{inv.invoice_number}</div>
                  <div className="text-slate-500 text-[11px]">
                    Issued: {formatDate(inv.issue_date)} | Due: {formatDate(inv.due_date)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(inv.total_amount)}</div>
                    {inv.outstanding_amount > 0 ? (
                      <div className="text-[11px] font-bold text-rose-600">Due: {formatCurrency(inv.outstanding_amount)}</div>
                    ) : (
                      <div className="text-[11px] font-bold text-emerald-600">Settled</div>
                    )}
                  </div>

                  <StatusBadge status={inv.status} size="sm" />

                  <button
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs"
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
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
