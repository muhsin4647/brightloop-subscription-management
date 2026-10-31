import { db } from '../db/connection.ts';
import { calculateCommercialDocument, getNextBillingDate } from './calculationService.ts';
import { logAudit } from './auditService.ts';
import { createNotification } from './notificationService.ts';

export function createQuotation(data: {
  customerId: string;
  planId: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    variantAdjustment?: number;
  }>;
  discountCode?: string;
  validityDurationDays?: number;
  paymentTerms?: string;
  notes?: string;
  terms?: string;
  userId: string;
}) {
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(data.customerId) as any;
  if (!customer) throw new Error('Customer not found.');

  const plan = db.prepare(`SELECT * FROM subscription_plans WHERE id = ?`).get(data.planId) as any;
  if (!plan) throw new Error('Subscription plan not found.');

  // Validate discount code if provided
  let discountRule: any = null;
  if (data.discountCode) {
    discountRule = db.prepare(`
      SELECT * FROM discount_rules
      WHERE code = ? AND is_active = 1
    `).get(data.discountCode);
  }

  const calculation = calculateCommercialDocument(data.items, discountRule, 18.0);

  const now = new Date();
  const issueDateStr = now.toISOString().split('T')[0];
  const validityDays = data.validityDurationDays || 30;
  const expiryDateObj = new Date(now);
  expiryDateObj.setDate(expiryDateObj.getDate() + validityDays);
  const expiryDateStr = expiryDateObj.toISOString().split('T')[0];

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM quotations`).get() as { count: number };
  const quotationNumber = `QT-2026-${String(countRow.count + 1).padStart(4, '0')}`;
  const quotationId = `qt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const createTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO quotations (
        id, quotation_number, customer_id, plan_id, issue_date, expiry_date,
        validity_duration_days, subtotal, discount_amount, tax_amount, grand_total,
        payment_terms, notes, terms, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).run(
      quotationId,
      quotationNumber,
      customer.id,
      plan.id,
      issueDateStr,
      expiryDateStr,
      validityDays,
      calculation.subtotal,
      calculation.discountAmount,
      calculation.taxAmount,
      calculation.grandTotal,
      data.paymentTerms || 'Net 15',
      data.notes || 'Proposal created via Brightloop quotation engine.',
      data.terms || 'Valid for 30 calendar days.',
      data.userId,
      now.toISOString(),
      now.toISOString()
    );

    const insertLine = db.prepare(`
      INSERT INTO quotation_lines (
        id, quotation_id, product_id, variant_id, description, quantity, unit_price,
        variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const line of calculation.lines) {
      insertLine.run(
        `qtl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        quotationId,
        line.productId,
        line.variantId,
        line.description,
        line.quantity,
        line.unitPrice,
        line.variantAdjustment,
        line.discountAmount,
        line.taxRate,
        line.taxAmount,
        line.lineTotal
      );
    }

    if (discountRule) {
      db.prepare(`UPDATE discount_rules SET usage_count = usage_count + 1 WHERE id = ?`).run(discountRule.id);
    }

    logAudit(data.userId, null, 'QUOTATION_CREATED', 'QUOTATION', quotationId, `Created quotation ${quotationNumber} for ${customer.name}.`);
    return { quotationId, quotationNumber };
  });

  return createTx();
}

export function convertQuotationToSubscription(quotationId: string, userId: string) {
  const quote = db.prepare(`
    SELECT q.*, c.name as customer_name, c.email as customer_email, p.billing_frequency, p.name as plan_name
    FROM quotations q
    JOIN customers c ON c.id = q.customer_id
    JOIN subscription_plans p ON p.id = q.plan_id
    WHERE q.id = ?
  `).get(quotationId) as any;

  if (!quote) throw new Error('Quotation not found.');
  if (quote.converted_to_subscription_id) {
    throw new Error('This quotation has already been converted into a subscription.');
  }
  if (quote.status !== 'accepted') {
    throw new Error(`Quotation must be in 'accepted' status before conversion. Current status: ${quote.status}`);
  }

  const lines = db.prepare(`SELECT * FROM quotation_lines WHERE quotation_id = ?`).all(quotationId) as any[];
  if (lines.length === 0) throw new Error('Quotation has no line items.');

  const now = new Date();
  const startDateStr = now.toISOString().split('T')[0];
  const nextBillingDateStr = getNextBillingDate(startDateStr, quote.billing_frequency);

  const subCountRow = db.prepare(`SELECT COUNT(*) as count FROM subscriptions`).get() as { count: number };
  const subNumber = `SUB-2026-${String(subCountRow.count + 1).padStart(4, '0')}`;
  const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const convertTx = db.transaction(() => {
    // Insert subscription
    db.prepare(`
      INSERT INTO subscriptions (
        id, subscription_number, customer_id, plan_id, quotation_id, start_date, end_date,
        next_billing_date, billing_frequency, payment_terms, currency, subtotal, discount_amount,
        tax_amount, total_amount, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, null, ?, ?, ?, 'INR', ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      subId,
      subNumber,
      quote.customer_id,
      quote.plan_id,
      quote.id,
      startDateStr,
      nextBillingDateStr,
      quote.billing_frequency,
      quote.payment_terms,
      quote.subtotal,
      quote.discount_amount,
      quote.tax_amount,
      quote.grand_total,
      userId,
      now.toISOString(),
      now.toISOString()
    );

    // Insert subscription lines copying quotation terms snapshot
    const insertSubLine = db.prepare(`
      INSERT INTO subscription_lines (
        id, subscription_id, product_id, variant_id, description, quantity, unit_price,
        variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const line of lines) {
      insertSubLine.run(
        `subl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        subId,
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

    // Link back to quotation
    db.prepare(`
      UPDATE quotations
      SET converted_to_subscription_id = ?, updated_at = ?
      WHERE id = ?
    `).run(subId, now.toISOString(), quote.id);

    // Add subscription lifecycle history
    db.prepare(`
      INSERT INTO subscription_history (id, subscription_id, previous_status, new_status, reason, changed_by, created_at)
      VALUES (?, ?, 'quotation', 'active', ?, ?, ?)
    `).run(
      `sh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      subId,
      `Converted from accepted quotation ${quote.quotation_number}`,
      userId,
      now.toISOString()
    );

    logAudit(userId, null, 'QUOTATION_CONVERTED', 'QUOTATION', quote.id, `Converted ${quote.quotation_number} into subscription ${subNumber}.`);

    createNotification(
      quote.customer_id,
      null,
      'SUBSCRIPTION_ACTIVATED',
      'Subscription Activated',
      `Your subscription ${subNumber} is now active based on quotation ${quote.quotation_number}.`,
      'SUBSCRIPTION',
      subId
    );

    return { subscriptionId: subId, subscriptionNumber: subNumber };
  });

  return convertTx();
}
