import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { recordPayment } from '../services/paymentService.ts';

const router = Router();

// GET /api/v1/payments
router.get('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const method = req.query.method ? String(req.query.method) : '';

    let whereClause = '1=1';
    const params: any[] = [];

    if (method) {
      whereClause += ' AND p.payment_method = ?';
      params.push(method);
    }
    if (search) {
      whereClause += ' AND (p.payment_number LIKE ? OR p.transaction_reference LIKE ? OR c.name LIKE ? OR i.invoice_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const payments = db.prepare(`
      SELECT p.*, c.name as customer_name, c.company as customer_company,
             i.invoice_number, i.total_amount as invoice_total, u.name as recorded_by_name
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN invoices i ON i.id = p.invoice_id
      LEFT JOIN users u ON u.id = p.recorded_by
      WHERE ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
    `).all(...params);

    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/payments
router.post('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionReference, notes } = req.body;
    if (!invoiceId || amount === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'Invoice ID, payment amount, and payment method are required.' });
    }

    const result = recordPayment({
      invoiceId,
      amount: parseFloat(amount),
      paymentMethod,
      transactionReference,
      notes,
      userId: req.user!.id,
    });

    res.status(201).json({
      message: `Payment ${result.paymentNumber} successfully recorded.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
