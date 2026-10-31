import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Invoice, InvoiceLine, Payment } from '../../types/index.ts';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { generateInvoicePDF } from '../../lib/pdf.ts';
import { RecordPaymentModal } from './RecordPaymentModal.tsx';
import { Download, CreditCard, Send, CheckCircle2, Ban, BellRing } from 'lucide-react';
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

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invoice? This cannot be undone.')) return;
    try {
      await apiRequest(`/invoices/${invoiceId}/cancel`, { method: 'POST' });
      setActionMessage('Invoice has been cancelled.');
      fetchInvoice();
      onUpdated?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isCustomer = role === 'CUSTOMER';

  return (
    <>
      <Modal
        isOpen={!!invoiceId}
        onClose={onClose}
        title={invoice ? `Invoice ${invoice.invoice_number}` : 'Invoice Details'}
        subtitle={invoice ? `Issued: ${formatDate(invoice.issue_date)} | Due: ${formatDate(invoice.due_date)}` : ''}
        maxWidth="max-w-3xl"
      >
        {loading || !invoice ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading invoice data...</div>
        ) : (
          <div className="space-y-6">
            {actionMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
                <span>{actionMessage}</span>
                <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:underline">
                  Dismiss
                </button>
              </div>
            )}

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={invoice.status} />
                {invoice.subscription_number && (
                  <span className="text-xs text-slate-500 font-medium">
                    Subscription: <strong className="text-slate-800">{invoice.subscription_number}</strong>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => generateInvoicePDF(invoice, lines)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF Download
                </button>

                {!isCustomer && invoice.status === 'draft' && (
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Invoice
                  </button>
                )}

                {!isCustomer && (invoice.status === 'confirmed' || invoice.status === 'sent') && (
                  <button
                    onClick={handleSend}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    Send Notification
                  </button>
                )}

                {!isCustomer && invoice.status === 'overdue' && (
                  <button
                    onClick={handleSendReminder}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    Send Payment Reminder
                  </button>
                )}

                {invoice.outstanding_amount > 0 && invoice.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {isCustomer ? 'Pay Online (Instant)' : 'Record Payment'}
                  </button>
                )}

                {!isCustomer && invoice.amount_paid === 0 && invoice.status !== 'cancelled' && (
                  <button
                    onClick={handleCancel}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Cancel Invoice"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Customer & Billing Period Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">Customer Details</span>
                <div className="font-bold text-slate-900 text-sm">{invoice.customer_name}</div>
                {invoice.customer_company && <div className="text-slate-600">{invoice.customer_company}</div>}
                <div className="text-slate-500 mt-1">{invoice.customer_email}</div>
                {invoice.billing_address && <div className="text-slate-500 mt-1">{invoice.billing_address}</div>}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">Billing & Terms</span>
                <div className="flex justify-between text-slate-600">
                  <span>Billing Period:</span>
                  <span className="font-semibold text-slate-800">
                    {invoice.billing_period_start ? `${invoice.billing_period_start} to ${invoice.billing_period_end}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Terms:</span>
                  <span className="font-semibold text-slate-800">{invoice.payment_terms}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Due Date:</span>
                  <span className="font-semibold text-slate-800">{invoice.due_date}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Tax</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{l.description}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{l.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(l.unit_price)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{l.tax_rate}%</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatCurrency(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-{formatCurrency(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (GST 18%):</span>
                    <span className="font-semibold">{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(invoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                    <span>Paid to Date:</span>
                    <span>{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-700 font-bold pt-1 border-t border-slate-200">
                    <span>Remaining Balance:</span>
                    <span>{formatCurrency(invoice.outstanding_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History Table */}
            {payments.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700">
                  Payment Allocations ({payments.length})
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {payments.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{p.payment_number}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatDate(p.payment_date)} via <span className="uppercase">{p.payment_method}</span> ({p.transaction_reference})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 text-sm">+{formatCurrency(p.amount)}</div>
                        <StatusBadge status={p.status} size="sm" />
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
