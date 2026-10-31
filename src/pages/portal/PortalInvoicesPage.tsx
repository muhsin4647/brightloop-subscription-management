import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Invoice } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { InvoiceDetailModal } from '../../components/invoice/InvoiceDetailModal.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { generateInvoicePDF } from '../../lib/pdf.ts';
import { Download, CreditCard, Eye, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export const PortalInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Instant Checkout modal
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [method, setMethod] = useState<'upi' | 'card' | 'bank_transfer'>('upi');
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      const data = await apiRequest<Invoice[]>('/portal/invoices');
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPDF = async (inv: Invoice) => {
    try {
      const data = await apiRequest(`/portal/invoices/${inv.id}`);
      generateInvoicePDF(data.invoice, data.lines, data.customer);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message}`);
    }
  };

  const handleOnlinePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    setProcessing(true);
    try {
      await apiRequest(`/portal/invoices/${payInvoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: payInvoice.outstanding_amount,
          paymentMethod: method === 'card' ? 'card' : method === 'bank_transfer' ? 'bank_transfer' : 'upi',
          transactionReference: `PAY-GATEWAY-${Date.now()}`,
        }),
      });

      setSuccessMsg(`Payment of ${formatCurrency(payInvoice.outstanding_amount)} processed successfully!`);
      setPayInvoice(null);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Payment simulation failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices &amp; Receipts</h1>
            <span className="text-xs text-slate-500 font-medium">· {invoices.length} records</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Official tax invoices, itemized line items, downloadable receipts, and payment reconciliations.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Invoices Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No invoices issued for your account.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="font-mono font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                      >
                        {inv.invoice_number}
                      </button>
                      {inv.subscription_number && (
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{inv.subscription_number}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{formatDate(inv.issue_date)}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">{formatDate(inv.due_date)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={inv.outstanding_amount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(inv.outstanding_amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/70 bg-white"
                          title="View Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/70 bg-white"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {inv.outstanding_amount > 0 && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => setPayInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CreditCard className="w-3 h-3" />
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Online Pay Modal */}
      {payInvoice && (
        <Modal
          isOpen={!!payInvoice}
          onClose={() => setPayInvoice(null)}
          title={`Pay Invoice ${payInvoice.invoice_number}`}
          subtitle={`Amount Due: ${formatCurrency(payInvoice.outstanding_amount)}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleOnlinePay} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Simulated Payment Gateway. 256-bit encrypted checkout.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR' },
                  { id: 'card', label: 'Credit Card' },
                  { id: 'bank_transfer', label: 'Net Banking' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id as any)}
                    className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      method === m.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>Invoice Total:</span>
                <span className="font-mono font-medium">{formatCurrency(payInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Previously Settled:</span>
                <span className="font-mono font-medium">{formatCurrency(payInvoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200/80">
                <span>Total Due Now:</span>
                <span className="text-slate-900 font-mono tabular-nums">{formatCurrency(payInvoice.outstanding_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayInvoice(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {processing ? 'Processing Payment...' : `Authorize & Pay ${formatCurrency(payInvoice.outstanding_amount)}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invoice Detail View */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onUpdated={fetchInvoices}
      />
    </div>
  );
};
