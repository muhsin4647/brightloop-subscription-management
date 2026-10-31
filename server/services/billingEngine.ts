import { db } from '../db/connection.ts';
import { getNextBillingDate, round2 } from './calculationService.ts';
import { logAudit } from './auditService.ts';
import { createNotification } from './notificationService.ts';

export interface BillingRunResult {
  totalEligible: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  invoicesCreated: Array<{
    invoiceId: string;
    invoiceNumber: string;
    subscriptionId: string;
    subscriptionNumber: string;
    customerName: string;
    amount: number;
  }>;
  errors: Array<{
    subscriptionId: string;
    error: string;
  }>;
}

export function runRecurringBilling(triggeredByUserId: string = 'system'): BillingRunResult {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Find all subscriptions that are active and due for billing
  const dueSubscriptions = db.prepare(`
    SELECT s.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
           p.name as plan_name, p.status as plan_status, p.auto_close_enabled
    FROM subscriptions s
    JOIN customers c ON c.id = s.customer_id
    JOIN subscription_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND date(s.next_billing_date) <= date(?)
    ORDER BY s.next_billing_date ASC
  `).all(todayStr) as any[];

  const result: BillingRunResult = {
    totalEligible: dueSubscriptions.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    invoicesCreated: [],
    errors: [],
  };

  for (const sub of dueSubscriptions) {
    result.processed++;

    const periodStart = sub.next_billing_date;
    const periodEnd = getNextBillingDate(periodStart, sub.billing_frequency);

    // 1. DUPLICATE BILLING PREVENTION CHECK:
    // Check if an invoice or billing event already exists for this exact subscription and billing period
    const existingEvent = db.prepare(`
      SELECT * FROM billing_events
      WHERE subscription_id = ?
        AND billing_period_start = ?
        AND billing_period_end = ?
        AND outcome = 'success'
    `).get(sub.id, periodStart, periodEnd) as any;

    if (existingEvent) {
      // Already billed for this period! Advance next_billing_date safely to prevent stuck loop
      db.prepare(`UPDATE subscriptions SET next_billing_date = ?, updated_at = ? WHERE id = ?`).run(periodEnd, now, sub.id);
      result.skipped++;
      continue;
    }

    // Validate user ID exists in users table for foreign key constraint
    let validUserId: string | null = null;
    if (triggeredByUserId && triggeredByUserId !== 'system' && triggeredByUserId !== 'test_runner' && triggeredByUserId !== 'cron_scheduler') {
      const u = db.prepare('SELECT id FROM users WHERE id = ?').get(triggeredByUserId) as any;
      if (u) validUserId = u.id;
    }

    // Process single subscription in an atomic transaction
    const processBillingTx = db.transaction(() => {
      // Fetch subscription lines
      const subLines = db.prepare(`
        SELECT * FROM subscription_lines WHERE subscription_id = ?
      `).all(sub.id) as any[];

      if (subLines.length === 0) {
        throw new Error(`Subscription ${sub.subscription_number} has no line items to bill.`);
      }

      // Generate next invoice number
      const invoiceCountRow = db.prepare(`SELECT COUNT(*) as count FROM invoices`).get() as { count: number };
      const nextSeq = String(invoiceCountRow.count + 1).padStart(4, '0');
      const invoiceNumber = `INV-2026-${nextSeq}`;
      const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Calculate due date (Net 15 default or based on payment terms)
      const dueDateObj = new Date(periodStart);
      const daysToAdd = sub.payment_terms === 'Net 30' ? 30 : sub.payment_terms === 'Net 7' ? 7 : 15;
      dueDateObj.setDate(dueDateObj.getDate() + daysToAdd);
      const dueDateStr = dueDateObj.toISOString().split('T')[0];

      // Insert invoice
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, subscription_id, customer_id, issue_date, due_date,
          billing_period_start, billing_period_end, currency, subtotal, discount_amount,
          tax_amount, total_amount, amount_paid, outstanding_amount, status, payment_terms,
          notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'confirmed', ?, ?, ?, ?, ?)
      `).run(
        invoiceId,
        invoiceNumber,
        sub.id,
        sub.customer_id,
        periodStart,
        dueDateStr,
        periodStart,
        periodEnd,
        sub.currency,
        sub.subtotal,
        sub.discount_amount,
        sub.tax_amount,
        sub.total_amount,
        sub.total_amount, // initially outstanding = total
        sub.payment_terms,
        `Automated recurring billing for period ${periodStart} to ${periodEnd} (${sub.plan_name}).`,
        validUserId,
        now,
        now
      );

      // Insert invoice line items
      const insertLineStmt = db.prepare(`
        INSERT INTO invoice_lines (
          id, invoice_id, product_id, variant_id, description, quantity, unit_price,
          variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of subLines) {
        const lineId = `invl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        insertLineStmt.run(
          lineId,
          invoiceId,
          line.product_id,
          line.variant_id,
          line.description,
          line.quantity,
          line.unit_price,
          line.variant_adjustment,
          line.discount_amount,
          line.tax_rate,
          line.tax_amount,
          line.line_total
        );
      }

      // Record successful billing event for idempotency
      const eventId = `be-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO billing_events (
          id, subscription_id, billing_period_start, billing_period_end, attempt_timestamp,
          outcome, invoice_id, error_details, retry_count
        ) VALUES (?, ?, ?, ?, ?, 'success', ?, null, 0)
        ON CONFLICT(subscription_id, billing_period_start, billing_period_end) DO UPDATE SET
          outcome = 'success',
          invoice_id = excluded.invoice_id,
          attempt_timestamp = excluded.attempt_timestamp,
          error_details = null
      `).run(eventId, sub.id, periodStart, periodEnd, now, invoiceId);

      // Advance subscription next_billing_date
      let newStatus = sub.status;
      if (sub.auto_close_enabled && sub.end_date && dateCompare(periodEnd, sub.end_date) >= 0) {
        newStatus = 'closed';
      }

      db.prepare(`
        UPDATE subscriptions
        SET next_billing_date = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(periodEnd, newStatus, now, sub.id);

      // Create notification for customer
      createNotification(
        sub.customer_id,
        sub.user_id || null,
        'INVOICE_GENERATED',
        `New Invoice ${invoiceNumber}`,
        `Your recurring invoice ${invoiceNumber} for ${sub.currency} ${sub.total_amount.toFixed(2)} has been generated. Due date: ${dueDateStr}.`,
        'INVOICE',
        invoiceId
      );

      return {
        invoiceId,
        invoiceNumber,
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        customerName: sub.customer_name,
        amount: sub.total_amount,
      };
    });

    try {
      const created = processBillingTx();
      result.succeeded++;
      result.invoicesCreated.push(created);

      logAudit(
        validUserId,
        null,
        'RECURRING_INVOICE_GENERATED',
        'INVOICE',
        created.invoiceId,
        `Generated ${created.invoiceNumber} for ${created.subscriptionNumber} (${created.customerName}) amount: ₹${created.amount}.`
      );
    } catch (err: any) {
      result.failed++;
      result.errors.push({
        subscriptionId: sub.id,
        error: err.message || 'Unknown billing error',
      });

      // Record failed billing event safely with upsert
      const eventId = `be-err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO billing_events (
          id, subscription_id, billing_period_start, billing_period_end, attempt_timestamp,
          outcome, invoice_id, error_details, retry_count
        ) VALUES (?, ?, ?, ?, ?, 'failed', null, ?, 1)
        ON CONFLICT(subscription_id, billing_period_start, billing_period_end) DO UPDATE SET
          outcome = 'failed',
          attempt_timestamp = excluded.attempt_timestamp,
          error_details = excluded.error_details,
          retry_count = billing_events.retry_count + 1
      `).run(eventId, sub.id, periodStart, periodEnd, now, err.message);

      console.error(`Billing failed for subscription ${sub.subscription_number}:`, err);
    }
  }

  return result;
}

export function retryFailedBillingEvent(eventId: string, userId: string): { success: boolean; message: string; invoiceId?: string } {
  const event = db.prepare(`SELECT * FROM billing_events WHERE id = ?`).get(eventId) as any;
  if (!event) {
    return { success: false, message: 'Billing event not found.' };
  }

  if (event.outcome === 'success') {
    return { success: false, message: 'This billing event has already succeeded.' };
  }

  const sub = db.prepare(`
    SELECT s.*, c.name as customer_name, c.company as customer_company, p.name as plan_name
    FROM subscriptions s
    JOIN customers c ON c.id = s.customer_id
    JOIN subscription_plans p ON p.id = s.plan_id
    WHERE s.id = ?
  `).get(event.subscription_id) as any;

  if (!sub) {
    return { success: false, message: 'Associated subscription not found.' };
  }

  const now = new Date().toISOString();
  const retryTx = db.transaction(() => {
    const subLines = db.prepare(`SELECT * FROM subscription_lines WHERE subscription_id = ?`).all(sub.id) as any[];
    if (subLines.length === 0) {
      throw new Error('Subscription has no lines.');
    }

    const invoiceCountRow = db.prepare(`SELECT COUNT(*) as count FROM invoices`).get() as { count: number };
    const nextSeq = String(invoiceCountRow.count + 1).padStart(4, '0');
    const invoiceNumber = `INV-2026-${nextSeq}`;
    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const dueDateObj = new Date(event.billing_period_start);
    dueDateObj.setDate(dueDateObj.getDate() + 15);
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, subscription_id, customer_id, issue_date, due_date,
        billing_period_start, billing_period_end, currency, subtotal, discount_amount,
        tax_amount, total_amount, amount_paid, outstanding_amount, status, payment_terms,
        notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'confirmed', ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      invoiceNumber,
      sub.id,
      sub.customer_id,
      event.billing_period_start,
      dueDateStr,
      event.billing_period_start,
      event.billing_period_end,
      sub.currency,
      sub.subtotal,
      sub.discount_amount,
      sub.tax_amount,
      sub.total_amount,
      sub.total_amount,
      sub.payment_terms,
      `Retried billing for period ${event.billing_period_start} to ${event.billing_period_end}.`,
      userId,
      now,
      now
    );

    const insertLineStmt = db.prepare(`
      INSERT INTO invoice_lines (
        id, invoice_id, product_id, variant_id, description, quantity, unit_price,
        variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const line of subLines) {
      insertLineStmt.run(
        `invl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        invoiceId,
        line.product_id,
        line.variant_id,
        line.description,
        line.quantity,
        line.unit_price,
        line.variant_adjustment,
        line.discount_amount,
        line.tax_rate,
        line.tax_amount,
        line.line_total
      );
    }

    // Update billing event to success
    db.prepare(`
      UPDATE billing_events
      SET outcome = 'success', invoice_id = ?, error_details = null, retry_count = retry_count + 1, attempt_timestamp = ?
      WHERE id = ?
    `).run(invoiceId, now, event.id);

    return { invoiceId, invoiceNumber };
  });

  try {
    const res = retryTx();
    logAudit(userId, null, 'BILLING_EVENT_RETRIED', 'BILLING_EVENT', event.id, `Successfully retried billing event. Created invoice ${res.invoiceNumber}.`);
    return { success: true, message: `Successfully generated invoice ${res.invoiceNumber}.`, invoiceId: res.invoiceId };
  } catch (err: any) {
    db.prepare(`UPDATE billing_events SET retry_count = retry_count + 1, error_details = ? WHERE id = ?`).run(err.message, event.id);
    return { success: false, message: err.message || 'Retry failed.' };
  }
}

function dateCompare(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}
