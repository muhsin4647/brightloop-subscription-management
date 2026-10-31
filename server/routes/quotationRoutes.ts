import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { createQuotation, convertQuotationToSubscription } from '../services/quotationService.ts';
import { logAudit } from '../services/auditService.ts';
import { createNotification } from '../services/notificationService.ts';

const router = Router();

// GET /api/v1/quotations/templates
router.get('/templates', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = db.prepare(`
      SELECT t.*, p.name as plan_name, p.billing_frequency, pr.name as product_name
      FROM quotation_templates t
      LEFT JOIN subscription_plans p ON p.id = t.default_plan_id
      LEFT JOIN products pr ON pr.id = p.product_id
      ORDER BY t.created_at DESC
    `).all();
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/quotations/templates
router.post('/templates', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, default_plan_id, default_quantity, default_payment_terms, validity_duration_days, notes_terms } = req.body;
    if (!name) return res.status(400).json({ error: 'Template name is required.' });

    const id = `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO quotation_templates (
        id, name, description, default_plan_id, default_quantity, default_payment_terms,
        validity_duration_days, notes_terms, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      name.trim(),
      description?.trim() || '',
      default_plan_id || null,
      parseInt(default_quantity || '1', 10),
      default_payment_terms || 'Net 15',
      parseInt(validity_duration_days || '30', 10),
      notes_terms?.trim() || '',
      now
    );

    res.status(201).json({ id, message: 'Template created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/quotations
router.get('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : '';
    const search = req.query.search ? String(req.query.search).trim() : '';

    let whereClause = '1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND q.status = ?';
      params.push(status);
    }
    if (search) {
      whereClause += ' AND (q.quotation_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const quotations = db.prepare(`
      SELECT q.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
             p.name as plan_name, p.billing_frequency, u.name as created_by_name
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      JOIN subscription_plans p ON p.id = q.plan_id
      LEFT JOIN users u ON u.id = q.created_by
      WHERE ${whereClause}
      ORDER BY q.created_at DESC
    `).all(...params);

    res.json(quotations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/quotations/:id
router.get('/:id', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const quotation = db.prepare(`
      SELECT q.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
             c.phone as customer_phone, c.billing_address, c.tax_id as customer_tax_id,
             p.name as plan_name, p.billing_frequency, u.name as created_by_name
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      JOIN subscription_plans p ON p.id = q.plan_id
      LEFT JOIN users u ON u.id = q.created_by
      WHERE q.id = ?
    `).get(req.params.id);

    if (!quotation) return res.status(404).json({ error: 'Quotation not found.' });

    const lines = db.prepare(`
      SELECT ql.*, pr.name as product_name, pv.option_name as variant_name
      FROM quotation_lines ql
      JOIN products pr ON pr.id = ql.product_id
      LEFT JOIN product_variants pv ON pv.id = ql.variant_id
      WHERE ql.quotation_id = ?
    `).all(req.params.id);

    res.json({ quotation, lines });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/quotations
router.post('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, planId, items, discountCode, validityDurationDays, paymentTerms, notes, terms } = req.body;
    if (!customerId || !planId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer, Plan, and at least one item line are required.' });
    }

    const result = createQuotation({
      customerId,
      planId,
      items,
      discountCode,
      validityDurationDays,
      paymentTerms,
      notes,
      terms,
      userId: req.user!.id,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/quotations/:id/send
router.post('/:id/send', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const quote = db.prepare(`
      SELECT q.*, c.name as customer_name, c.email as customer_email, c.user_id as customer_user_id
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      WHERE q.id = ?
    `).get(req.params.id) as any;

    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    const now = new Date().toISOString();
    db.prepare(`UPDATE quotations SET status = 'sent', updated_at = ? WHERE id = ?`).run(now, req.params.id);

    logAudit(req.user!.id, req.user!.email, 'QUOTATION_SENT', 'QUOTATION', req.params.id, `Sent quotation ${quote.quotation_number} to customer.`);

    createNotification(
      quote.customer_id,
      quote.customer_user_id,
      'QUOTATION_RECEIVED',
      `Quotation ${quote.quotation_number}`,
      `Quotation ${quote.quotation_number} for ₹${quote.grand_total.toFixed(2)} is ready for your review. Valid until ${quote.expiry_date}.`,
      'QUOTATION',
      quote.id
    );

    res.json({ message: 'Quotation marked as sent and notification dispatched.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/quotations/:id/accept
router.post('/:id/accept', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id) as any;
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    const now = new Date().toISOString();
    db.prepare(`UPDATE quotations SET status = 'accepted', updated_at = ? WHERE id = ?`).run(now, req.params.id);
    logAudit(req.user!.id, req.user!.email, 'QUOTATION_ACCEPTED', 'QUOTATION', req.params.id, `Quotation ${quote.quotation_number} accepted.`);

    res.json({ message: 'Quotation marked as accepted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/quotations/:id/reject
router.post('/:id/reject', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date().toISOString();
    db.prepare(`UPDATE quotations SET status = 'rejected', updated_at = ? WHERE id = ?`).run(now, req.params.id);
    logAudit(req.user!.id, req.user!.email, 'QUOTATION_REJECTED', 'QUOTATION', req.params.id, `Quotation marked as rejected.`);
    res.json({ message: 'Quotation marked as rejected.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/quotations/:id/convert-to-subscription
router.post('/:id/convert-to-subscription', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = convertQuotationToSubscription(req.params.id, req.user!.id);
    res.status(201).json({
      message: `Quotation converted successfully to subscription ${result.subscriptionNumber}.`,
      subscriptionId: result.subscriptionId,
      subscriptionNumber: result.subscriptionNumber,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
