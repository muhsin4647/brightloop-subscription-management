import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Payment, Invoice } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { RecordPaymentModal } from '../../components/invoice/RecordPaymentModal.tsx';
import { Search, Plus, CreditCard, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchPayments = async () => {
    try {
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

  const totalCollected = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payments &amp; Reconciliation</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-backed settlement ledger, multi-method payment allocations, and transaction references.
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
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 shadow-2xs font-medium"
            >
              <option value="" disabled>Select unpaid invoice to settle...</option>
              {unpaidInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} ({inv.customer_name}) - Outstanding: {formatCurrency(inv.outstanding_amount)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Banner */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <span className="text-xs font-medium text-slate-500">Total Reconciled Collections</span>
          <div className="text-2xl font-bold text-emerald-700 mt-0.5">{formatCurrency(totalCollected)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by payment #, UTR, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="">All Methods</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer / Wire</option>
            <option value="card">Card</option>
            <option value="payment_gateway">Online Gateway</option>
            <option value="cash">Cash / Cheque</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-4">Method &amp; UTR Reference</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading payment ledger...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No payments found.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.payment_number}</td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">{p.invoice_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{p.customer_company}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold uppercase text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                        {p.payment_method}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{p.transaction_reference}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(p.payment_date)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      +{formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{p.recorded_by_name || 'System'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
