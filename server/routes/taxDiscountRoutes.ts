import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, requireAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// 1. TAXES
// GET /api/v1/tax-rules
router.get('/taxes', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const taxes = db.prepare(`SELECT * FROM tax_rules ORDER BY rate ASC`).all();
    res.json(taxes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/tax-rules (admin only)
router.post('/taxes', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, rate, calculation_method } = req.body;
    if (!name || !code || rate === undefined) {
      return res.status(400).json({ error: 'Tax name, code, and rate are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM tax_rules WHERE code = ?').get(cleanCode);
    if (existing) return res.status(409).json({ error: 'Tax rule code already exists.' });

    const id = `tax-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tax_rules (id, name, code, rate, tax_type, calculation_method, is_active, created_at)
      VALUES (?, ?, ?, ?, 'percentage', ?, 1, ?)
    `).run(id, name.trim(), cleanCode, parseFloat(rate), calculation_method || 'after_discount', now);

    logAudit(req.user!.id, req.user!.email, 'TAX_RULE_CREATED', 'TAX_RULE', id, `Created tax rule ${name} (${cleanCode}) at ${rate}%.`);

    res.status(201).json({ id, message: 'Tax rule created.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/taxes/:id/toggle (admin only)
router.patch('/taxes/:id/toggle', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tax = db.prepare('SELECT * FROM tax_rules WHERE id = ?').get(req.params.id) as any;
    if (!tax) return res.status(404).json({ error: 'Tax rule not found.' });

    const newActive = tax.is_active ? 0 : 1;
    db.prepare('UPDATE tax_rules SET is_active = ? WHERE id = ?').run(newActive, req.params.id);

    logAudit(req.user!.id, req.user!.email, 'TAX_RULE_TOGGLED', 'TAX_RULE', req.params.id, `Tax rule ${tax.code} active state set to ${newActive}.`);

    res.json({ message: `Tax rule is now ${newActive ? 'active' : 'inactive'}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. DISCOUNTS
// GET /api/v1/discounts
router.get('/discounts', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const discounts = db.prepare(`
      SELECT d.*, p.name as product_name, sp.name as plan_name
      FROM discount_rules d
      LEFT JOIN products p ON p.id = d.applicable_product_id
      LEFT JOIN subscription_plans sp ON sp.id = d.applicable_plan_id
      ORDER BY d.created_at DESC
    `).all();
    res.json(discounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/discounts (admin only)
router.post('/discounts', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, description, discount_type, value, min_purchase_amount, min_quantity, start_date, end_date, max_uses } = req.body;
    if (!name || !code || !discount_type || value === undefined) {
      return res.status(400).json({ error: 'Name, unique code, discount type, and value are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM discount_rules WHERE code = ?').get(cleanCode);
    if (existing) return res.status(409).json({ error: 'Discount code already exists.' });

    const id = `disc-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO discount_rules (
        id, name, code, description, discount_type, value, min_purchase_amount,
        min_quantity, start_date, end_date, max_uses, usage_count, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)
    `).run(
      id,
      name.trim(),
      cleanCode,
      description?.trim() || '',
      discount_type,
      parseFloat(value),
      parseFloat(min_purchase_amount || 0),
      parseInt(min_quantity || 1, 10),
      start_date || null,
      end_date || null,
      max_uses ? parseInt(max_uses, 10) : null,
      now
    );

    logAudit(req.user!.id, req.user!.email, 'DISCOUNT_CREATED', 'DISCOUNT_RULE', id, `Created discount ${name} (${cleanCode}).`);

    res.status(201).json({ id, message: 'Discount rule created.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/discounts/:id/toggle (admin only)
router.patch('/discounts/:id/toggle', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const disc = db.prepare('SELECT * FROM discount_rules WHERE id = ?').get(req.params.id) as any;
    if (!disc) return res.status(404).json({ error: 'Discount rule not found.' });

    const newActive = disc.is_active ? 0 : 1;
    db.prepare('UPDATE discount_rules SET is_active = ? WHERE id = ?').run(newActive, req.params.id);

    logAudit(req.user!.id, req.user!.email, 'DISCOUNT_TOGGLED', 'DISCOUNT_RULE', req.params.id, `Discount ${disc.code} state set to ${newActive}.`);

    res.json({ message: `Discount rule is now ${newActive ? 'active' : 'inactive'}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
