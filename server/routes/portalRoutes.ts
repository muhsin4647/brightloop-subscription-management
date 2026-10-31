import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.ts';
import { requireAuth, requireCustomer, AuthenticatedRequest } from '../middleware/auth.ts';
import { transitionSubscriptionStatus } from '../services/subscriptionService.ts';
import { recordPayment } from '../services/paymentService.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/;

// Helper to ensure customer record exists for user
function getCustomerForUser(req: AuthenticatedRequest) {
  let customer = db.prepare(`SELECT * FROM customers WHERE user_id = ?`).get(req.user!.id) as any;
  if (!customer && req.user!.customerId) {
    customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.user!.customerId);
  }
  return customer;
}

// GET /api/v1/portal/dashboard
router.get('/dashboard', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer profile not found for account.' });

    const todayStr = new Date().toISOString().split('T')[0];

    const activeSubs = db.prepare(`
      SELECT s.*, p.name as plan_name, p.billing_frequency, p.pause_permitted, p.early_closure_permitted
      FROM subscriptions s
      JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.customer_id = ? AND s.status = 'active'
      ORDER BY s.next_billing_date ASC
    `).all(customer.id);

    const recentInvoices = db.prepare(`
      SELECT * FROM invoices
      WHERE customer_id = ?
      ORDER BY issue_date DESC
      LIMIT 5
    `).all(customer.id);

    const outstandingRow = db.prepare(`
      SELECT COALESCE(SUM(outstanding_amount), 0) as total_outstanding
      FROM invoices
      WHERE customer_id = ? AND status NOT IN ('cancelled', 'paid', 'draft')
    `).get(customer.id) as { total_outstanding: number };

    const recentPayments = db.prepare(`
      SELECT p.*, i.invoice_number
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.customer_id = ?
      ORDER BY p.payment_date DESC
      LIMIT 5
    `).all(customer.id);

    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE customer_id = ? OR user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(customer.id, req.user!.id);

    res.json({
      customer,
      activeSubscriptions: activeSubs,
      recentInvoices,
      totalOutstanding: outstandingRow.total_outstanding,
      recentPayments,
      notifications,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/portal/subscriptions
router.get('/subscriptions', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const subs = db.prepare(`
      SELECT s.*, p.name as plan_name, p.billing_frequency, p.pause_permitted,
             p.early_closure_permitted, p.renewal_permitted, p.auto_close_enabled
      FROM subscriptions s
      JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
    `).all(customer.id);

    res.json(subs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/portal/subscriptions/:id
router.get('/subscriptions/:id', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    // Strict tenant ownership validation:
    const sub = db.prepare(`
      SELECT s.*, p.name as plan_name, p.code as plan_code, p.billing_frequency,
             p.pause_permitted, p.early_closure_permitted, p.renewal_permitted, p.auto_close_enabled
      FROM subscriptions s
      JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.id = ? AND s.customer_id = ?
    `).get(req.params.id, customer.id);

    if (!sub) return res.status(404).json({ error: 'Subscription not found or unauthorized.' });

    const lines = db.prepare(`
      SELECT sl.*, pr.name as product_name, pv.option_name as variant_name
      FROM subscription_lines sl
      JOIN products pr ON pr.id = sl.product_id
      LEFT JOIN product_variants pv ON pv.id = sl.variant_id
      WHERE sl.subscription_id = ?
    `).all(req.params.id);

    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE subscription_id = ? AND customer_id = ?
      ORDER BY issue_date DESC
    `).all(req.params.id, customer.id);

    res.json({ subscription: sub, lines, invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Permitted customer subscription actions
router.post('/subscriptions/:id/pause', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    const sub = db.prepare('SELECT id FROM subscriptions WHERE id = ? AND customer_id = ?').get(req.params.id, customer.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or unauthorized.' });

    const result = transitionSubscriptionStatus(req.params.id, 'paused', req.user!.id, 'Paused by customer via portal');
    res.json({ message: 'Subscription paused successfully.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/subscriptions/:id/resume', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    const sub = db.prepare('SELECT id FROM subscriptions WHERE id = ? AND customer_id = ?').get(req.params.id, customer.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or unauthorized.' });

    const result = transitionSubscriptionStatus(req.params.id, 'active', req.user!.id, 'Resumed by customer via portal');
    res.json({ message: 'Subscription resumed successfully.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/subscriptions/:id/cancel', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    const sub = db.prepare('SELECT id FROM subscriptions WHERE id = ? AND customer_id = ?').get(req.params.id, customer.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or unauthorized.' });

    const result = transitionSubscriptionStatus(req.params.id, 'cancelled', req.user!.id, 'Cancelled by customer via portal');
    res.json({ message: 'Subscription cancelled.', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/portal/invoices
router.get('/invoices', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const invoices = db.prepare(`
      SELECT i.*, s.subscription_number
      FROM invoices i
      LEFT JOIN subscriptions s ON s.id = i.subscription_id
      WHERE i.customer_id = ? AND i.status != 'draft'
      ORDER BY i.issue_date DESC
    `).all(customer.id);

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/portal/invoices/:id
router.get('/invoices/:id', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const invoice = db.prepare(`
      SELECT i.*, s.subscription_number, p.name as plan_name
      FROM invoices i
      LEFT JOIN subscriptions s ON s.id = i.subscription_id
      LEFT JOIN subscription_plans p ON p.id = s.plan_id
      WHERE i.id = ? AND i.customer_id = ?
    `).get(req.params.id, customer.id) as any;

    if (!invoice) return res.status(404).json({ error: 'Invoice not found or unauthorized.' });

    const lines = db.prepare(`SELECT * FROM invoice_lines WHERE invoice_id = ?`).all(req.params.id);
    const payments = db.prepare(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC`).all(req.params.id);

    res.json({ invoice, lines, payments, customer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/portal/invoices/:id/pay (Customer online payment simulation)
router.post('/invoices/:id/pay', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND customer_id = ?').get(req.params.id, customer.id) as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found or unauthorized.' });

    const { amount, paymentMethod, transactionReference } = req.body;
    const payAmount = amount ? parseFloat(amount) : invoice.outstanding_amount;

    const result = recordPayment({
      invoiceId: invoice.id,
      amount: payAmount,
      paymentMethod: paymentMethod || 'payment_gateway',
      transactionReference: transactionReference || `PG-SIM-${Date.now()}`,
      notes: 'Customer online payment simulation via Brightloop portal checkout.',
      userId: req.user!.id,
    });

    res.json({
      message: 'Payment processed successfully.',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/portal/payments
router.get('/payments', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const payments = db.prepare(`
      SELECT p.*, i.invoice_number, i.total_amount as invoice_total
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.customer_id = ?
      ORDER BY p.payment_date DESC
    `).all(customer.id);

    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/portal/profile
router.get('/profile', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user!.id);
    res.json({ customer, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/portal/profile
router.patch('/profile', requireAuth, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = getCustomerForUser(req);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const { name, company, phone, billing_address, tax_id } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          company = COALESCE(?, company),
          phone = COALESCE(?, phone),
          billing_address = COALESCE(?, billing_address),
          tax_id = COALESCE(?, tax_id),
          updated_at = ?
      WHERE id = ?
    `).run(name?.trim(), company?.trim(), phone?.trim(), billing_address?.trim(), tax_id?.trim(), now, customer.id);

    if (name) {
      db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now, req.user!.id);
    }

    logAudit(req.user!.id, req.user!.email, 'CUSTOMER_PROFILE_UPDATED', 'CUSTOMER', customer.id, 'Updated profile details.');

    res.json({ message: 'Profile updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/portal/change-password
router.post('/change-password', requireAuth, requireCustomer, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        error: 'New password must be at least 9 characters long, contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, req.user!.id);

    logAudit(req.user!.id, req.user!.email, 'PASSWORD_CHANGED', 'USER', req.user!.id, 'Password changed by user.');

    res.json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
