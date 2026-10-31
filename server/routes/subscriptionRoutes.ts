import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { transitionSubscriptionStatus, manualRenewSubscription } from '../services/subscriptionService.ts';
import { calculateCommercialDocument, getNextBillingDate } from '../services/calculationService.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// GET /api/v1/subscriptions
router.get('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : '';
    const frequency = req.query.frequency ? String(req.query.frequency) : '';
    const search = req.query.search ? String(req.query.search).trim() : '';

    let whereClause = '1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }
    if (frequency) {
      whereClause += ' AND s.billing_frequency = ?';
      params.push(frequency);
    }
    if (search) {
      whereClause += ' AND (s.subscription_number LIKE ? OR c.name LIKE ? OR c.company LIKE ? OR p.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const subscriptions = db.prepare(`
      SELECT s.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
             p.name as plan_name, p.billing_frequency as plan_frequency, p.pause_permitted,
             p.early_closure_permitted, p.renewal_permitted
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN subscription_plans p ON p.id = s.plan_id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
    `).all(...params);

    res.json(subscriptions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/subscriptions/:id
router.get('/:id', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = db.prepare(`
      SELECT s.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
             c.phone as customer_phone, c.billing_address, c.tax_id as customer_tax_id,
             p.name as plan_name, p.code as plan_code, p.billing_frequency as plan_frequency,
             p.pause_permitted, p.early_closure_permitted, p.renewal_permitted, p.auto_close_enabled
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!subscription) return res.status(404).json({ error: 'Subscription not found.' });

    const lines = db.prepare(`
      SELECT sl.*, pr.name as product_name, pv.option_name as variant_name
      FROM subscription_lines sl
      JOIN products pr ON pr.id = sl.product_id
      LEFT JOIN product_variants pv ON pv.id = sl.variant_id
      WHERE sl.subscription_id = ?
    `).all(req.params.id);

    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE subscription_id = ?
      ORDER BY issue_date DESC
    `).all(req.params.id);

    const history = db.prepare(`
      SELECT sh.*, u.name as changed_by_name
      FROM subscription_history sh
      LEFT JOIN users u ON u.id = sh.changed_by
      WHERE sh.subscription_id = ?
      ORDER BY sh.created_at DESC
    `).all(req.params.id);

    res.json({ subscription, lines, invoices, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/subscriptions (Direct staff creation)
router.post('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, planId, startDate, items, discountCode, paymentTerms } = req.body;
    if (!customerId || !planId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer, Plan, and at least one item line are required.' });
    }

    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(planId) as any;
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    let discountRule: any = null;
    if (discountCode) {
      discountRule = db.prepare('SELECT * FROM discount_rules WHERE code = ? AND is_active = 1').get(discountCode);
    }

    const calculation = calculateCommercialDocument(items, discountRule, 18.0);
    const start = startDate || new Date().toISOString().split('T')[0];
    const nextBilling = getNextBillingDate(start, plan.billing_frequency);
    const now = new Date().toISOString();

    const countRow = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number };
    const subNumber = `SUB-2026-${String(countRow.count + 1).padStart(4, '0')}`;
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO subscriptions (
          id, subscription_number, customer_id, plan_id, start_date, next_billing_date,
          billing_frequency, payment_terms, currency, subtotal, discount_amount, tax_amount,
          total_amount, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(
        subId,
        subNumber,
        customerId,
        plan.id,
        start,
        nextBilling,
        plan.billing_frequency,
        paymentTerms || 'Net 15',
        calculation.subtotal,
        calculation.discountAmount,
        calculation.taxAmount,
        calculation.grandTotal,
        req.user!.id,
        now,
        now
      );

      const insertLine = db.prepare(`
        INSERT INTO subscription_lines (
          id, subscription_id, product_id, variant_id, description, quantity, unit_price,
          variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of calculation.lines) {
        insertLine.run(
          `subl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          subId,
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

      db.prepare(`
        INSERT INTO subscription_history (id, subscription_id, previous_status, new_status, reason, changed_by, created_at)
        VALUES (?, ?, 'draft', 'active', 'Created directly by staff', ?, ?)
      `).run(`sh-${Date.now()}`, subId, req.user!.id, now);

      logAudit(req.user!.id, req.user!.email, 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION', subId, `Created subscription ${subNumber}.`);

      return { subscriptionId: subId, subscriptionNumber: subNumber };
    });

    const result = createTx();
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Action transitions
router.post('/:id/activate', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = transitionSubscriptionStatus(req.params.id, 'active', req.user!.id, req.body.reason);
    res.json({ message: 'Subscription activated.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/pause', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = transitionSubscriptionStatus(req.params.id, 'paused', req.user!.id, req.body.reason);
    res.json({ message: 'Subscription paused successfully.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/resume', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = transitionSubscriptionStatus(req.params.id, 'active', req.user!.id, req.body.reason);
    res.json({ message: 'Subscription resumed successfully.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/cancel', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = transitionSubscriptionStatus(req.params.id, 'cancelled', req.user!.id, req.body.reason);
    res.json({ message: 'Subscription cancelled.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/close', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = transitionSubscriptionStatus(req.params.id, 'closed', req.user!.id, req.body.reason);
    res.json({ message: 'Subscription closed.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/renew', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = manualRenewSubscription(req.params.id, req.user!.id);
    res.json({ message: 'Subscription renewed successfully.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
