import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Invoice } from '../../types/index.ts';
import { apiRequest, formatCurrency } from '../../lib/api.ts';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<string>(String(invoice.outstanding_amount));
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'upi' | 'cash' | 'card' | 'payment_gateway'>('upi');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid positive payment amount.');
      }
      if (parsedAmount > invoice.outstanding_amount) {
        throw new Error(`Amount cannot exceed remaining balance of ${formatCurrency(invoice.outstanding_amount)}.`);
      }

      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: parsedAmount,
          paymentMethod,
          transactionReference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment recording failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment for ${invoice.invoice_number}`}
      subtitle={`Customer: ${invoice.customer_name} | Outstanding: ${formatCurrency(invoice.outstanding_amount)}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (INR)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.outstanding_amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Max allocatable: {formatCurrency(invoice.outstanding_amount)}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e: any) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="upi">UPI / Instant QR</option>
            <option value="bank_transfer">Bank Wire / NEFT / RTGS</option>
            <option value="card">Corporate Debit / Credit Card</option>
            <option value="payment_gateway">Online Payment Gateway</option>
            <option value="cash">Cash / Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference / UTR Number</label>
          <input
            type="text"
            placeholder="e.g. UPI-20261031-10293 or NEFT-HDFC-991122"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Reconciliation Remarks</label>
          <textarea
            rows={2}
            placeholder="Optional internal remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Recording...' : 'Confirm & Allocate Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
