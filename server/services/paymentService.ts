import { db } from '../db/connection.ts';
import { round2 } from './calculationService.ts';
import { logAudit } from './auditService.ts';
import { createNotification } from './notificationService.ts';

export function recordPayment(data: {
  invoiceId: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'upi' | 'cash' | 'card' | 'payment_gateway' | 'other';
  transactionReference?: string;
  notes?: string;
  userId: string;
}) {
  const invoice = db.prepare(`
    SELECT i.*, c.id as cust_id, c.name as customer_name, c.email as customer_email, c.user_id as customer_user_id
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.id = ?
  `).get(data.invoiceId) as any;

  if (!invoice) throw new Error('Invoice not found.');
  if (invoice.status === 'cancelled') throw new Error('Cannot record payment for a cancelled invoice.');
  if (invoice.status === 'paid' || invoice.outstanding_amount <= 0) {
    throw new Error('This invoice is already fully paid. No further payments can be allocated.');
  }

  const paymentAmount = round2(Number(data.amount));
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  if (paymentAmount > round2(invoice.outstanding_amount)) {
    throw new Error(
      `Payment amount (₹${paymentAmount.toFixed(2)}) exceeds outstanding balance (₹${invoice.outstanding_amount.toFixed(2)}). Overpayments not permitted.`
    );
  }

  const now = new Date();
  const paymentDateStr = now.toISOString().split('T')[0];
  const payCountRow = db.prepare(`SELECT COUNT(*) as count FROM payments`).get() as { count: number };
  const paymentNumber = `PAY-2026-${String(payCountRow.count + 1).padStart(4, '0')}`;
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const paymentTx = db.transaction(() => {
    // Insert payment record
    db.prepare(`
      INSERT INTO payments (
        id, payment_number, customer_id, invoice_id, payment_method, amount, payment_date,
        transaction_reference, notes, status, recorded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'successful', ?, ?)
    `).run(
      paymentId,
      paymentNumber,
      invoice.customer_id,
      invoice.id,
      data.paymentMethod,
      paymentAmount,
      paymentDateStr,
      data.transactionReference || `TXN-${Date.now()}`,
      data.notes || 'Payment recorded via Brightloop reconciliation.',
      data.userId,
      now.toISOString()
    );

    // Calculate new amounts
    const newAmountPaid = round2(invoice.amount_paid + paymentAmount);
    const newOutstanding = round2(invoice.total_amount - newAmountPaid);
    const newStatus = newOutstanding <= 0.009 ? 'paid' : 'partially_paid';

    // Update invoice balance and status
    db.prepare(`
      UPDATE invoices
      SET amount_paid = ?, outstanding_amount = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(newAmountPaid, Math.max(0, newOutstanding), newStatus, now.toISOString(), invoice.id);

    logAudit(
      data.userId,
      null,
      'PAYMENT_RECORDED',
      'PAYMENT',
      paymentId,
      `Recorded payment ${paymentNumber} of ₹${paymentAmount.toFixed(2)} for invoice ${invoice.invoice_number}. New status: ${newStatus}.`
    );

    createNotification(
      invoice.customer_id,
      invoice.customer_user_id || null,
      'PAYMENT_RECEIVED',
      'Payment Confirmation',
      `Payment ${paymentNumber} of ₹${paymentAmount.toFixed(2)} for invoice ${invoice.invoice_number} was successfully recorded. Outstanding balance: ₹${Math.max(0, newOutstanding).toFixed(2)}.`,
      'INVOICE',
      invoice.id
    );

    return {
      paymentId,
      paymentNumber,
      amount: paymentAmount,
      newInvoiceStatus: newStatus,
      newOutstanding: Math.max(0, newOutstanding),
      newAmountPaid,
    };
  });

  return paymentTx();
}
