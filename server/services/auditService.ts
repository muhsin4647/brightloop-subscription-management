import { db } from '../db/connection.ts';

export function logAudit(
  userId: string | null,
  userEmail: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: string | Record<string, any>,
  ipAddress: string = '127.0.0.1'
) {
  try {
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, userEmail, action, resourceType, resourceId, detailsStr, ipAddress, now);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
