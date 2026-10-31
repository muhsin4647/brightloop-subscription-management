import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Payment, Invoice } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { RecordPaymentModal } from '../../components/invoice/RecordPaymentModal.tsx';
import {
  Search,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
  Wallet,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (methodFilter) query.set('method', methodFilter);

      const [payRes, invRes] = await Promise.all([
        apiRequest<Payment[]>(`/payments?${query.toString()}`),
        apiRequest<Invoice[]>('/invoices'),
      ]);

      setPayments(payRes || []);
      setUnpaidInvoices((invRes || []).filter((i) => i.outstanding_amount > 0 && i.status !== 'cancelled'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, methodFilter]);

  // Statistics
  const stats = useMemo(() => {
    const successful = payments.filter((p) => p.status === 'successful');
    const totalCollected = successful.reduce((sum, p) => sum + p.amount, 0);
    const avgTranche = successful.length > 0 ? totalCollected / successful.length : 0;

    return {
      totalCollected,
      count: successful.length,
      avgTranche,
    };
  }, [payments]);

  // Pagination
  const totalPages = Math.ceil(payments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return payments.slice(start, start + itemsPerPage);
  }, [payments, currentPage]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const getAvatarInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payments &amp; Reconciliation Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-backed settlement ledger, multi-method payment allocations, and transaction UTR references.
          </p>
        </div>

        {unpaidInvoices.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                const inv = unpaidInvoices.find((i) => i.id === e.target.value);
                if (inv) setSelectedInvoice(inv);
              }}
              value=""
              className="px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-white text-slate-700 shadow-2xs font-semibold cursor-pointer outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Record payment for invoice...</option>
              {unpaidInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} ({inv.customer_name}) - Due: {formatCurrency(inv.outstanding_amount)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Reconciled Collections</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatCurrency(stats.totalCollected)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Directly credited to merchant bank
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Settled Transactions</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.count}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            100% matched with invoice entries
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Average Tranche Size</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatCurrency(stats.avgTranche)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Mean transaction value
          </p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Method Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
            {[
              { id: '', label: 'All Methods' },
              { id: 'upi', label: 'UPI' },
              { id: 'card', label: 'Card' },
              { id: 'bank_transfer', label: 'Wire / Transfer' },
              { id: 'payment_gateway', label: 'Online Gateway' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMethodFilter(m.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  methodFilter === m.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search payment #, UTR, customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-4">Method &amp; UTR Reference</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Settled Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading payment ledger...
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payments found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{p.payment_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      #{p.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(p.customer_name || '')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{p.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{p.customer_company || 'Corporate Client'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold uppercase text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                          {p.payment_method}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                          <span>{p.transaction_reference}</span>
                          <button
                            onClick={() => copyToClipboard(p.transaction_reference || '')}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                            title="Copy Reference"
                          >
                            {copiedRef === p.transaction_reference ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] tabular-nums">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      +{formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-sans text-[11px]">
                      {p.recorded_by_name || 'System Auto-Reconciliation'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/50 border-t border-slate-200/80 text-xs">
          <div className="text-slate-500 font-mono">
            Showing <span className="font-bold text-slate-900">{payments.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * itemsPerPage, payments.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{payments.length}</span> settlements
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <RecordPaymentModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          onPaymentSuccess={fetchPayments}
        />
      )}
    </div>
  );
};
