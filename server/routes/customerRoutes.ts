import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// GET /api/v1/customers (with search, filter, pagination)
router.get('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10)));
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE ${whereClause}`).get(...params) as { count: number };

    const customers = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.customer_id = c.id AND s.status = 'active') as active_subscriptions_count,
        (SELECT COALESCE(SUM(outstanding_amount), 0) FROM invoices i WHERE i.customer_id = c.id AND i.status NOT IN ('cancelled', 'paid', 'draft')) as total_outstanding
      FROM customers c
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      customers,
      pagination: {
        total: totalRow.count,
        page,
        limit,
        pages: Math.ceil(totalRow.count / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch customers.' });
  }
});

// GET /api/v1/customers/:id
router.get('/:id', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = db.prepare(`
      SELECT c.*, u.role as user_role, u.is_active as user_active
      FROM customers c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const subscriptions = db.prepare(`
      SELECT s.*, p.name as plan_name
      FROM subscriptions s
      JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
    `).all(req.params.id);

    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE customer_id = ?
      ORDER BY issue_date DESC
    `).all(req.params.id);

    res.json({ customer, subscriptions, invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customers
router.post('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, company, email, phone, billing_address, tax_id, notes } = req.body;
    if (!name || !company || !email) {
      return res.status(400).json({ error: 'Name, company, and email are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Customer with this email address already exists.' });
    }

    const id = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, user_id, name, company, email, phone, billing_address, tax_id, notes, created_at, updated_at)
      VALUES (?, null, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      company.trim(),
      normalizedEmail,
      phone?.trim() || null,
      billing_address?.trim() || '',
      tax_id?.trim() || null,
      notes?.trim() || null,
      now,
      now
    );

    logAudit(req.user!.id, req.user!.email, 'CUSTOMER_CREATED', 'CUSTOMER', id, `Created customer record for ${name} (${company}).`);

    res.status(201).json({ id, message: 'Customer created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/customers/:id
router.patch('/:id', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const { name, company, phone, billing_address, tax_id, notes } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          company = COALESCE(?, company),
          phone = COALESCE(?, phone),
          billing_address = COALESCE(?, billing_address),
          tax_id = COALESCE(?, tax_id),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `).run(
      name?.trim(),
      company?.trim(),
      phone?.trim(),
      billing_address?.trim(),
      tax_id?.trim(),
      notes?.trim(),
      now,
      req.params.id
    );

    logAudit(req.user!.id, req.user!.email, 'CUSTOMER_UPDATED', 'CUSTOMER', req.params.id, `Updated customer record.`);

    res.json({ message: 'Customer updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
