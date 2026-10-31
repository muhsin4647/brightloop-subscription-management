import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/v1/audit-logs (admin only)
router.get('/', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const action = req.query.action ? String(req.query.action) : '';

    let where = '1=1';
    const params: any[] = [];

    if (action) {
      where += ' AND action LIKE ?';
      params.push(`%${action}%`);
    }

    const logs = db.prepare(`
      SELECT a.*, u.name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE ${where}
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(...params, limit);

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/notifications (for current user / customer)
router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifs = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? OR (customer_id IS NOT NULL AND customer_id = ?)
      ORDER BY created_at DESC
      LIMIT 30
    `).all(req.user!.id, req.user!.customerId || '');

    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
