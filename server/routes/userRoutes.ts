import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.ts';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/;

// GET /api/v1/users (admin only)
router.get('/', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
             c.company as customer_company
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.id
      ORDER BY u.created_at DESC
    `).all();

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/users/staff (admin only - Prompt requirement 4.1 & 5.4: Only administrator can create staff)
router.post('/staff', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and temporary password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 9 characters long, contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-staff-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'STAFF', 1, ?, ?)
    `).run(userId, name.trim(), normalizedEmail, passwordHash, now, now);

    logAudit(req.user!.id, req.user!.email, 'STAFF_CREATED', 'USER', userId, `Admin created internal staff account for ${name} (${normalizedEmail}).`);

    res.status(201).json({
      message: 'Staff account successfully created.',
      user: { id: userId, name: name.trim(), email: normalizedEmail, role: 'STAFF' },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/users/:id/status (admin only)
router.patch('/:id/status', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own administrator account.' });
    }

    const newActive = user.is_active ? 0 : 1;
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(newActive, now, req.params.id);

    logAudit(req.user!.id, req.user!.email, 'USER_STATUS_TOGGLED', 'USER', req.params.id, `User ${user.email} status changed to ${newActive ? 'active' : 'inactive'}.`);

    res.json({ message: `Account status updated to ${newActive ? 'active' : 'inactive'}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
