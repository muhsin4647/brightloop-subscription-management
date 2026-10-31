import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';
import { createNotification } from '../services/notificationService.ts';

const router = Router();

// GET /api/v1/invoices
router.get('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : '';
    const search = req.query.search ? String(req.query.search).trim() : '';
    const overdueOnly = req.query.overdue === 'true';
    const todayStr = new Date().toISOString().split('T')[0];

    let whereClause = '1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }
    if (overdueOnly) {
      whereClause += " AND i.status NOT IN ('cancelled', 'paid', 'draft') AND date(i.due_date) < date(?)";
      params.push(todayStr);
    }
    if (search) {
      whereClause += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const invoices = db.prepare(`
      SELECT i.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
             s.subscription_number
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN subscriptions s ON s.id = i.subscription_id
      WHERE ${whereClause}
      ORDER BY i.issue_date DESC, i.created_at DESC
    `).all(...params);

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/invoices/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
             c.phone as customer_phone, c.billing_address, c.tax_id as customer_tax_id,
             s.subscription_number, p.name as plan_name, p.billing_frequency
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN subscriptions s ON s.id = i.subscription_id
      LEFT JOIN subscription_plans p ON p.id = s.plan_id
      WHERE i.id = ?
    `).get(req.params.id) as any;

    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    // Customer security tenant boundary check (Prompt section 15):
    if (req.user!.role === 'CUSTOMER' && req.user!.customerId !== invoice.customer_id) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this invoice.' });
    }

    const lines = db.prepare(`SELECT * FROM invoice_lines WHERE invoice_id = ?`).all(req.params.id);
    const payments = db.prepare(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC`).all(req.params.id);

    res.json({ invoice, lines, payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/invoices/:id/confirm
router.post('/:id/confirm', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: `Cannot confirm invoice with status ${invoice.status}.` });
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE invoices SET status = 'confirmed', updated_at = ? WHERE id = ?`).run(now, req.params.id);
    logAudit(req.user!.id, req.user!.email, 'INVOICE_CONFIRMED', 'INVOICE', req.params.id, `Confirmed invoice ${invoice.invoice_number}.`);

    res.json({ message: 'Invoice confirmed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/invoices/:id/send
router.post('/:id/send', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.user_id as customer_user_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.id = ?
    `).get(req.params.id) as any;

    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const now = new Date().toISOString();
    let newStatus = invoice.status;
    if (invoice.status === 'draft' || invoice.status === 'confirmed') {
      newStatus = 'sent';
      db.prepare(`UPDATE invoices SET status = 'sent', updated_at = ? WHERE id = ?`).run(now, req.params.id);
    }

    createNotification(
      invoice.customer_id,
      invoice.customer_user_id,
      'INVOICE_SENT',
      `Invoice Dispatched: ${invoice.invoice_number}`,
      `Invoice ${invoice.invoice_number} for ₹${invoice.total_amount.toFixed(2)} has been sent. Outstanding balance: ₹${invoice.outstanding_amount.toFixed(2)}. Due: ${invoice.due_date}.`,
      'INVOICE',
      invoice.id
    );

    logAudit(req.user!.id, req.user!.email, 'INVOICE_SENT', 'INVOICE', req.params.id, `Sent invoice notification for ${invoice.invoice_number}.`);

    res.json({ message: 'Invoice notification dispatched to customer.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/invoices/:id/reminder (Dispatches payment reminder)
router.post('/:id/reminder', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.email as customer_email, c.user_id as customer_user_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.id = ?
    `).get(req.params.id) as any;

    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    createNotification(
      invoice.customer_id,
      invoice.customer_user_id,
      'PAYMENT_REMINDER',
      `Payment Reminder: ${invoice.invoice_number}`,
      `Friendly reminder that invoice ${invoice.invoice_number} has an outstanding balance of ₹${invoice.outstanding_amount.toFixed(2)} due on ${invoice.due_date}.`,
      'INVOICE',
      invoice.id
    );

    logAudit(req.user!.id, req.user!.email, 'PAYMENT_REMINDER_SENT', 'INVOICE', req.params.id, `Sent payment reminder for ${invoice.invoice_number}.`);

    res.json({ message: 'Payment reminder successfully dispatched.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/invoices/:id/cancel
router.post('/:id/cancel', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    // Section 13.3 requirement: Prevent cancelling settled or partially paid invoices without adjustment
    if (invoice.amount_paid > 0) {
      return res.status(400).json({
        error: `Cannot cancel invoice with recorded payments (₹${invoice.amount_paid.toFixed(2)}). Follow appropriate refund or credit adjustment workflow.`,
      });
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(now, req.params.id);

    logAudit(req.user!.id, req.user!.email, 'INVOICE_CANCELLED', 'INVOICE', req.params.id, `Cancelled invoice ${invoice.invoice_number}.`);

    res.json({ message: 'Invoice cancelled successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
