import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, requireAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';
import { calculateCommercialDocument, getNextBillingDate } from '../services/calculationService.ts';

const router = Router();

// GET /api/v1/plans
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = db.prepare(`
      SELECT p.*, pr.name as product_name, pr.code as product_code, pr.base_price as product_base_price,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id AND s.status = 'active') as active_subscriptions_count
      FROM subscription_plans p
      JOIN products pr ON pr.id = p.product_id
      ORDER BY p.name ASC
    `).all();

    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/plans/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = db.prepare(`
      SELECT p.*, pr.name as product_name, pr.code as product_code
      FROM subscription_plans p
      JOIN products pr ON pr.id = p.product_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!plan) return res.status(404).json({ error: 'Plan not found.' });
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/plans (admin only)
router.post('/', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      product_id,
      name,
      code,
      description,
      billing_frequency,
      plan_price,
      min_quantity,
      currency,
      available_from,
      available_until,
      auto_close_enabled,
      early_closure_permitted,
      pause_permitted,
      renewal_permitted,
      quantity_change_permitted,
      addons_permitted,
      status,
    } = req.body;

    if (!product_id || !name || !code || !billing_frequency || plan_price === undefined) {
      return res.status(400).json({ error: 'Product, name, code, billing frequency, and plan price are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM subscription_plans WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(409).json({ error: 'Plan code already exists.' });
    }

    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO subscription_plans (
        id, product_id, name, code, description, billing_frequency, plan_price, min_quantity,
        currency, available_from, available_until, auto_close_enabled, early_closure_permitted,
        pause_permitted, renewal_permitted, quantity_change_permitted, addons_permitted, status,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      planId,
      product_id,
      name.trim(),
      cleanCode,
      description?.trim() || '',
      billing_frequency,
      parseFloat(plan_price),
      parseInt(min_quantity || '1', 10),
      currency || 'INR',
      available_from || now.split('T')[0],
      available_until || null,
      auto_close_enabled ? 1 : 0,
      early_closure_permitted !== undefined ? (early_closure_permitted ? 1 : 0) : 1,
      pause_permitted !== undefined ? (pause_permitted ? 1 : 0) : 1,
      renewal_permitted !== undefined ? (renewal_permitted ? 1 : 0) : 1,
      quantity_change_permitted !== undefined ? (quantity_change_permitted ? 1 : 0) : 1,
      addons_permitted !== undefined ? (addons_permitted ? 1 : 0) : 1,
      status || 'active',
      req.user!.id,
      now,
      now
    );

    logAudit(req.user!.id, req.user!.email, 'PLAN_CREATED', 'SUBSCRIPTION_PLAN', planId, `Created plan ${name} (${cleanCode}).`);

    res.status(201).json({ id: planId, message: 'Subscription plan created.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/plans/:id (admin only)
router.patch('/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.params.id) as any;
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    const {
      name,
      description,
      plan_price,
      min_quantity,
      status,
      auto_close_enabled,
      early_closure_permitted,
      pause_permitted,
      renewal_permitted,
      quantity_change_permitted,
      addons_permitted,
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE subscription_plans
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          plan_price = COALESCE(?, plan_price),
          min_quantity = COALESCE(?, min_quantity),
          status = COALESCE(?, status),
          auto_close_enabled = COALESCE(?, auto_close_enabled),
          early_closure_permitted = COALESCE(?, early_closure_permitted),
          pause_permitted = COALESCE(?, pause_permitted),
          renewal_permitted = COALESCE(?, renewal_permitted),
          quantity_change_permitted = COALESCE(?, quantity_change_permitted),
          addons_permitted = COALESCE(?, addons_permitted),
          updated_at = ?
      WHERE id = ?
    `).run(
      name?.trim(),
      description?.trim(),
      plan_price !== undefined ? parseFloat(plan_price) : null,
      min_quantity !== undefined ? parseInt(min_quantity, 10) : null,
      status,
      auto_close_enabled !== undefined ? (auto_close_enabled ? 1 : 0) : null,
      early_closure_permitted !== undefined ? (early_closure_permitted ? 1 : 0) : null,
      pause_permitted !== undefined ? (pause_permitted ? 1 : 0) : null,
      renewal_permitted !== undefined ? (renewal_permitted ? 1 : 0) : null,
      quantity_change_permitted !== undefined ? (quantity_change_permitted ? 1 : 0) : null,
      addons_permitted !== undefined ? (addons_permitted ? 1 : 0) : null,
      now,
      req.params.id
    );

    logAudit(req.user!.id, req.user!.email, 'PLAN_UPDATED', 'SUBSCRIPTION_PLAN', req.params.id, `Updated plan settings for ${plan.name}.`);

    res.json({ message: 'Plan updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/plans/:id/purchase (Subscription Purchase Flow with Scan & Multiple Pay Windows)
router.post('/:id/purchase', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const planId = req.params.id;
    const plan = db.prepare(`
      SELECT p.*, pr.name as product_name
      FROM subscription_plans p
      JOIN products pr ON pr.id = p.product_id
      WHERE p.id = ?
    `).get(planId) as any;

    if (!plan) return res.status(404).json({ error: 'Subscription plan not found.' });
    if (plan.status !== 'active') return res.status(400).json({ error: 'This plan is currently not available for purchase.' });

    // Determine customer
    let customerId = req.body.customerId;
    if (req.user!.role === 'CUSTOMER') {
      const cust = db.prepare('SELECT id FROM customers WHERE user_id = ? OR id = ?').get(req.user!.id, req.user!.customerId) as any;
      if (!cust) return res.status(404).json({ error: 'Customer account not found.' });
      customerId = cust.id;
    } else if (!customerId) {
      const firstCust = db.prepare('SELECT id FROM customers LIMIT 1').get() as any;
      customerId = firstCust?.id || 'cust-1';
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!customer) return res.status(404).json({ error: 'Customer record not found.' });

    const variant = db.prepare('SELECT * FROM product_variants WHERE product_id = ? LIMIT 1').get(plan.product_id) as any;
    const items = [
      {
        productId: plan.product_id,
        variantId: variant?.id || null,
        description: `${plan.name} (${plan.product_name})`,
        quantity: 1,
        unitPrice: plan.plan_price,
        variantAdjustment: 0,
      },
    ];

    let discountRule: any = null;
    if (req.body.discountCode) {
      discountRule = db.prepare('SELECT * FROM discount_rules WHERE code = ? AND is_active = 1').get(req.body.discountCode.trim().toUpperCase());
    }

    const calc = calculateCommercialDocument(items, discountRule, 18.0);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nextBilling = getNextBillingDate(todayStr, plan.billing_frequency);

    const subCount = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number };
    const subNumber = `SUB-2026-${String(subCount.count + 1).padStart(4, '0')}`;
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const invCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };
    const invoiceNumber = `INV-2026-${String(invCount.count + 1).padStart(4, '0')}`;
    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const payCount = db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number };
    const paymentNumber = `PAY-2026-${String(payCount.count + 1).padStart(4, '0')}`;
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const paymentMethod = req.body.paymentMethod || 'upi';
    const txnRef = req.body.transactionReference || `TXN-${paymentMethod.toUpperCase()}-${Date.now()}`;

    const purchaseTx = db.transaction(() => {
      // 1. Create active subscription
      db.prepare(`
        INSERT INTO subscriptions (
          id, subscription_number, customer_id, plan_id, start_date, next_billing_date,
          billing_frequency, payment_terms, currency, subtotal, discount_amount, tax_amount,
          total_amount, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Immediate (Online)', 'INR', ?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(
        subId,
        subNumber,
        customer.id,
        plan.id,
        todayStr,
        nextBilling,
        plan.billing_frequency,
        calc.subtotal,
        calc.discountAmount,
        calc.taxAmount,
        calc.grandTotal,
        req.user!.id,
        now.toISOString(),
        now.toISOString()
      );

      // 2. Line items
      const insertSubLine = db.prepare(`
        INSERT INTO subscription_lines (
          id, subscription_id, product_id, variant_id, description, quantity, unit_price,
          variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of calc.lines) {
        insertSubLine.run(
          `subl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          subId,
          l.productId,
          l.variantId,
          l.description,
          l.quantity,
          l.unitPrice,
          l.variantAdjustment,
          l.discountAmount,
          l.taxRate,
          l.taxAmount,
          l.lineTotal
        );
      }

      // 3. Subscription history
      db.prepare(`
        INSERT INTO subscription_history (id, subscription_id, previous_status, new_status, reason, changed_by, created_at)
        VALUES (?, ?, 'draft', 'active', 'Direct online subscription checkout purchase', ?, ?)
      `).run(`sh-${Date.now()}`, subId, req.user!.id, now.toISOString());

      // 4. Initial Invoice (Paid)
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_id, subscription_id, issue_date, due_date,
          billing_period_start, billing_period_end, subtotal, discount_amount, tax_amount,
          total_amount, amount_paid, outstanding_amount, status, payment_terms, currency,
          notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'paid', 'Immediate', 'INR', ?, ?, ?, ?)
      `).run(
        invoiceId,
        invoiceNumber,
        customer.id,
        subId,
        todayStr,
        todayStr,
        todayStr,
        nextBilling,
        calc.subtotal,
        calc.discountAmount,
        calc.taxAmount,
        calc.grandTotal,
        calc.grandTotal,
        `Initial subscription activation invoice for ${plan.name}`,
        req.user!.id,
        now.toISOString(),
        now.toISOString()
      );

      const insertInvLine = db.prepare(`
        INSERT INTO invoice_lines (
          id, invoice_id, product_id, variant_id, description, quantity, unit_price,
          variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of calc.lines) {
        insertInvLine.run(
          `invl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          invoiceId,
          l.productId,
          l.variantId,
          l.description,
          l.quantity,
          l.unitPrice,
          l.variantAdjustment,
          l.discountAmount,
          l.taxRate,
          l.taxAmount,
          l.lineTotal
        );
      }

      // 5. Recorded Payment
      db.prepare(`
        INSERT INTO payments (
          id, payment_number, customer_id, invoice_id, payment_method, amount, payment_date,
          transaction_reference, notes, status, recorded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'successful', ?, ?)
      `).run(
        paymentId,
        paymentNumber,
        customer.id,
        invoiceId,
        paymentMethod === 'upi_qr' ? 'upi' : paymentMethod,
        calc.grandTotal,
        todayStr,
        txnRef,
        `Instant online checkout for subscription ${subNumber}`,
        req.user!.id,
        now.toISOString()
      );

      // 6. Audit
      logAudit(
        req.user!.id,
        req.user!.email,
        'SUBSCRIPTION_PURCHASED',
        'SUBSCRIPTION',
        subId,
        `Purchased ${plan.name} (${subNumber}) via ${paymentMethod.toUpperCase()} (Txn: ${txnRef}, ₹${calc.grandTotal}).`
      );

      return {
        subscriptionId: subId,
        subscriptionNumber: subNumber,
        invoiceId,
        invoiceNumber,
        paymentNumber,
        totalAmount: calc.grandTotal,
        subtotal: calc.subtotal,
        discountAmount: calc.discountAmount,
        taxAmount: calc.taxAmount,
        nextBillingDate: nextBilling,
        paymentMethod,
        transactionReference: txnRef,
      };
    });

    const result = purchaseTx();
    res.status(201).json({
      success: true,
      message: `Subscription ${result.subscriptionNumber} successfully activated!`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

