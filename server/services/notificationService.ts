import { db } from '../db/connection.ts';

export function createNotification(
  customerId: string | null,
  userId: string | null,
  type: string,
  title: string,
  message: string,
  relatedResourceType?: string,
  relatedResourceId?: string
) {
  try {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO notifications (id, customer_id, user_id, type, title, message, delivery_status, related_resource_type, related_resource_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?)
    `).run(id, customerId, userId, type, title, message, relatedResourceType || null, relatedResourceId || null, now);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
