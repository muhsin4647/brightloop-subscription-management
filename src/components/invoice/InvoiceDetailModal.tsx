import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Invoice, InvoiceLine, Payment } from '../../types/index.ts';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { generateInvoicePDF } from '../../lib/pdf.ts';
import { RecordPaymentModal } from './RecordPaymentModal.tsx';
import { Download, CreditCard, Send, CheckCircle2, Ban, BellRing, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoiceId,
  onClose,
  onUpdated,
}) => {
  const { role } = useAuth();
  const [data, setData] = useState<{ invoice: Invoice; lines: InvoiceLine[]; payments: Payment[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/invoices/${invoiceId}`);
      setData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
      setActionMessage(null);
    }
  }, [invoiceId]);

  if (!invoiceId) return null;

  const invoice = data?.invoice;
  const lines = data?.lines || [];
  const payments = data?.payments || [];

  const handleConfirm = async () => {
    try {
      await apiRequest(`/invoices/${invoiceId}/confirm`, { method: 'POST' });
      setActionMessage('Invoice confirmed.');
      fetchInvoice();
      onUpdated?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSend = async () => {
    try {
      await apiRequest(`/invoices/${invoiceId}/send`, { method: 'POST' });
      setActionMessage('Invoice dispatched electronically to customer inbox.');
      fetchInvoice();
      onUpdated?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendReminder = async () => {
    try {
      await apiRequest(`/invoices/${invoiceId}/reminder`, { method: 'POST' });
      setActionMessage('Overdue payment reminder dispatched to customer.');
      fetchInvoice();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = async () => {
    try {
      await apiRequest(`/invoices/${invoiceId}/cancel`, { method: 'POST' });
      setActionMessage('Invoice has been cancelled.');
      setShowCancelConfirm(false);
      fetchInvoice();
      onUpdated?.();
    } catch (err: any) {
      setActionMessage(`Cancel failed: ${err.message}`);
    }
  };

  const isCustomer = role === 'CUSTOMER';

  return (
    <>
      <Modal
        isOpen={!!invoiceId}
        onClose={onClose}
        title={invoice ? `Invoice #${invoice.invoice_number}` : 'Invoice Details'}
        subtitle={invoice ? `Issued: ${formatDate(invoice.issue_date)} · Due: ${formatDate(invoice.due_date)}` : ''}
        maxWidth="max-w-3xl"
      >
        {loading || !invoice ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
            Loading invoice data...
          </div>
        ) : (
          <div className="space-y-6">
            {actionMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
                <span>{actionMessage}</span>
                <button onClick={() => setActionMessage(null)} className="text-emerald-700 font-semibold hover:underline cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#faf9fd] border border-slate-200/80">
              <div className="flex items-center gap-2">
                <StatusBadge status={invoice.status} />
                {invoice.subscription_number && (
                  <span className="text-xs text-slate-500 font-mono">
                    Agreement: <strong className="text-slate-900">#{invoice.subscription_number}</strong>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => generateInvoicePDF(invoice, lines)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {!isCustomer && invoice.status === 'draft' && (
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Invoice</span>
                  </button>
                )}

                {!isCustomer && (invoice.status === 'confirmed' || invoice.status === 'sent') && (
                  <button
                    onClick={handleSend}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dispatch Notice</span>
                  </button>
                )}

                {!isCustomer && invoice.status === 'overdue' && (
                  <button
                    onClick={handleSendReminder}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Send Reminder</span>
                  </button>
                )}

                {invoice.outstanding_amount > 0 && invoice.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isCustomer ? 'Pay Online (Instant)' : 'Record Payment'}</span>
                  </button>
                )}

                {!isCustomer && invoice.amount_paid === 0 && invoice.status !== 'cancelled' && (
                  showCancelConfirm ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg">
                      <span className="text-[10px] text-rose-700 font-semibold">Cancel this invoice?</span>
                      <button
                        onClick={handleCancel}
                        className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px] font-medium hover:bg-slate-50 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Cancel Invoice"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Customer & Billing Period Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Customer Details</span>
                <div className="font-bold text-slate-900 text-sm">{invoice.customer_name}</div>
                {invoice.customer_company && <div className="text-slate-600 font-medium">{invoice.customer_company}</div>}
                <div className="text-slate-400 font-mono text-[11px] mt-1">{invoice.customer_email}</div>
                {invoice.billing_address && <div className="text-slate-500 mt-1">{invoice.billing_address}</div>}
              </div>

              <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-1.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Commercial Terms</span>
                <div className="flex justify-between text-slate-600">
                  <span>Billing Period:</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {invoice.billing_period_start ? `${invoice.billing_period_start} → ${invoice.billing_period_end}` : 'Immediate'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Terms:</span>
                  <span className="font-semibold text-slate-800">{invoice.payment_terms}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Due Date:</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">{formatDate(invoice.due_date)}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#faf9fd] border-b border-slate-100 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Tax Rate</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l) => (
                    <tr key={l.id} className="hover:bg-[#faf9fd]/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{l.description}</td>
                      <td className="py-3 px-4 text-center text-slate-600 font-mono">{l.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-600 font-mono tabular-nums">{formatCurrency(l.unit_price)}</td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono tabular-nums">{l.tax_rate}%</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold tabular-nums">-{formatCurrency(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(invoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                    <span>Paid to Date:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-700 font-bold pt-1 border-t border-slate-200">
                    <span>Remaining Balance:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(invoice.outstanding_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Allocations Table */}
            {payments.length > 0 && (
              <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-700">
                  Payment Allocations ({payments.length})
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {payments.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-bold text-slate-900">#{p.payment_number}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {formatDate(p.payment_date)} via <span className="uppercase font-bold text-slate-700">{p.payment_method}</span> ({p.transaction_reference})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-700 tabular-nums">+{formatCurrency(p.amount)}</div>
                        <div className="mt-0.5">
                          <StatusBadge status={p.status} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Record Payment Sub-modal */}
      {invoice && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={invoice}
          onPaymentSuccess={() => {
            setActionMessage('Payment recorded and allocated successfully.');
            fetchInvoice();
            onUpdated?.();
          }}
        />
      )}
    </>
  );
};
