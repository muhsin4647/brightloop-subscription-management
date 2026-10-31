import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, requireAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { runRecurringBilling, retryFailedBillingEvent } from '../services/billingEngine.ts';

const router = Router();

// GET /api/v1/billing/status
router.get('/status', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const dueCountRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active' AND date(next_billing_date) <= date(?)
    `).get(todayStr) as { count: number };

    const totalEventsRow = db.prepare(`SELECT COUNT(*) as count FROM billing_events`).get() as { count: number };
    const failedEventsRow = db.prepare(`SELECT COUNT(*) as count FROM billing_events WHERE outcome = 'failed'`).get() as { count: number };

    res.json({
      status: 'active',
      dueSubscriptionsCount: dueCountRow.count,
      totalBillingEvents: totalEventsRow.count,
      failedBillingEvents: failedEventsRow.count,
      today: todayStr,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/billing/run-due (Trigger billing runner)
router.post('/run-due', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = runRecurringBilling(req.user!.id);
    res.json({
      message: `Billing execution complete. ${result.succeeded} invoice(s) generated, ${result.failed} failed, ${result.skipped} skipped.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/billing/events
router.get('/events', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const outcome = req.query.outcome ? String(req.query.outcome) : '';
    let whereClause = '1=1';
    const params: any[] = [];

    if (outcome) {
      whereClause += ' AND b.outcome = ?';
      params.push(outcome);
    }

    const events = db.prepare(`
      SELECT b.*, s.subscription_number, c.name as customer_name, c.company as customer_company,
             i.invoice_number, i.total_amount as invoice_amount
      FROM billing_events b
      JOIN subscriptions s ON s.id = b.subscription_id
      JOIN customers c ON c.id = s.customer_id
      LEFT JOIN invoices i ON i.id = b.invoice_id
      WHERE ${whereClause}
      ORDER BY b.attempt_timestamp DESC
      LIMIT 100
    `).all(...params);

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/billing/events/:id/retry
router.post('/events/:id/retry', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = retryFailedBillingEvent(req.params.id, req.user!.id);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
