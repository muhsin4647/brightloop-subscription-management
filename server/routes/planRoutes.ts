import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, requireAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

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

export default router;
