import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Payment } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';

export const PortalPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const data = await apiRequest<Payment[]>('/portal/payments');
      setPayments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payment Receipts &amp; Ledger</h1>
            <span className="text-xs text-slate-500 font-medium">· {payments.length} transactions</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade record of settled subscription tranches, transaction UTR references, and bank gateway allocations.
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Allocated Invoice</th>
                <th className="py-3 px-4">Method &amp; Transaction Reference</th>
                <th className="py-3 px-4">Settlement Date</th>
                <th className="py-3 px-4 text-right">Amount Settled</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No payment records found.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.payment_number}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{p.invoice_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {p.payment_method}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{p.transaction_reference}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{formatDate(p.payment_date)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      +{formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={p.status} size="sm" />
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
