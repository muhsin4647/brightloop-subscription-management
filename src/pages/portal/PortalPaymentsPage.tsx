import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Payment } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { CreditCard, CheckCircle2 } from 'lucide-react';

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
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payment Receipts &amp; History</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record of all completed tranches, transactions references, and invoice payment receipts.
        </p>
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Method &amp; UTR</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading receipts...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No payment records found.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.payment_number}</td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">{p.invoice_number}</td>
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
