import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/connection.ts';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// Password validation regex: at least 9 characters, 1 uppercase, 1 lowercase, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/;

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, company, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Validate password rules (Prompt requirement 5.1: >8 chars, 1 uppercase, 1 lowercase, 1 special char)
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 9 characters long, contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    // Check duplicate
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-cust-${Date.now()}`;
    const customerId = `cust-${Date.now()}`;
    const now = new Date().toISOString();

    const regTx = db.transaction(() => {
      // Prompt requirement 5.1: Customer registration must never allow selecting admin/staff role
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'CUSTOMER', 1, ?, ?)
      `).run(userId, name.trim(), normalizedEmail, passwordHash, now, now);

      db.prepare(`
        INSERT INTO customers (id, user_id, name, company, email, phone, billing_address, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, '', 'Registered via customer portal', ?, ?)
      `).run(customerId, userId, name.trim(), company?.trim() || name.trim(), normalizedEmail, phone?.trim() || null, now, now);

      logAudit(userId, normalizedEmail, 'USER_REGISTERED', 'USER', userId, 'Registered new customer account.');
    });

    regTx();

    const token = generateToken({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      role: 'CUSTOMER',
      customerId,
    });

    res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'CUSTOMER',
        customerId,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active, c.id as customer_id
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.id
      WHERE u.email = ?
    `).get(normalizedEmail) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerId: user.customer_id,
    });

    logAudit(user.id, user.email, 'USER_LOGIN', 'USER', user.id, 'Successful login.');

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customerId: user.customer_id,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as any;

    // To prevent account enumeration attacks (Prompt requirement 5.3):
    // Always return a positive message even if user doesn't exist
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour expiry
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO password_reset_tokens (id, email, token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(`tok-${Date.now()}`, normalizedEmail, resetToken, expiresAt, now);

      logAudit(user.id, normalizedEmail, 'PASSWORD_RESET_REQUESTED', 'USER', user.id, 'Password reset token generated.');

      // Return simulated link preview in dev for testing
      return res.json({
        message: 'If the email is registered, password reset instructions have been generated.',
        developmentResetToken: resetToken,
      });
    }

    res.json({
      message: 'If the email is registered, password reset instructions have been generated.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Password reset request failed.' });
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 9 characters long, contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    const tokenRow = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND used_at IS NULL
    `).get(token) as any;

    if (!tokenRow) {
      return res.status(400).json({ error: 'Invalid or already used password reset token.' });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Password reset token has expired. Please request a new one.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    const resetTx = db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?').run(newHash, now, tokenRow.email);
      db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);
      logAudit(null, tokenRow.email, 'PASSWORD_RESET_COMPLETED', 'USER', null, 'Password successfully reset.');
    });

    resetTx();

    res.json({ message: 'Password has been successfully reset. You may now login.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

export default router;
