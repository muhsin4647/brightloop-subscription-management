import { db } from '../db/connection.ts';
import { logAudit } from './auditService.ts';
import { createNotification } from './notificationService.ts';
import { getNextBillingDate } from './calculationService.ts';

export function transitionSubscriptionStatus(
  subscriptionId: string,
  targetStatus: 'active' | 'paused' | 'cancelled' | 'closed',
  userId: string,
  reason?: string
) {
  const sub = db.prepare(`
    SELECT s.*, p.pause_permitted, p.early_closure_permitted, p.auto_close_enabled,
           c.name as customer_name, c.email as customer_email, p.billing_frequency
    FROM subscriptions s
    JOIN subscription_plans p ON p.id = s.plan_id
    JOIN customers c ON c.id = s.customer_id
    WHERE s.id = ?
  `).get(subscriptionId) as any;

  if (!sub) throw new Error('Subscription not found.');

  const currentStatus = sub.status;
  const now = new Date().toISOString();

  // Validate allowed state transitions and plan policies
  if (targetStatus === 'paused') {
    if (currentStatus !== 'active') {
      throw new Error(`Only active subscriptions can be paused. Current status is ${currentStatus}.`);
    }
    if (!sub.pause_permitted) {
      throw new Error('Pausing is not permitted by this subscription plan policy.');
    }
  } else if (targetStatus === 'active') {
    if (currentStatus !== 'paused' && currentStatus !== 'confirmed' && currentStatus !== 'draft') {
      throw new Error(`Cannot activate/resume subscription from ${currentStatus} status.`);
    }
  } else if (targetStatus === 'cancelled') {
    if (currentStatus !== 'active' && currentStatus !== 'paused') {
      throw new Error(`Cannot cancel a subscription that is ${currentStatus}.`);
    }
    if (!sub.early_closure_permitted) {
      throw new Error('Early cancellation is not permitted by this subscription plan policy.');
    }
  } else if (targetStatus === 'closed') {
    if (currentStatus === 'closed' || currentStatus === 'cancelled') {
      throw new Error(`Subscription is already ${currentStatus}.`);
    }
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE subscriptions
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(targetStatus, now, sub.id);

    // Record lifecycle history
    db.prepare(`
      INSERT INTO subscription_history (id, subscription_id, previous_status, new_status, reason, changed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `sh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sub.id,
      currentStatus,
      targetStatus,
      reason || `Status updated to ${targetStatus}`,
      userId,
      now
    );

    logAudit(
      userId,
      null,
      `SUBSCRIPTION_${targetStatus.toUpperCase()}`,
      'SUBSCRIPTION',
      sub.id,
      `Transitioned ${sub.subscription_number} from ${currentStatus} to ${targetStatus}. Reason: ${reason || 'N/A'}`
    );

    createNotification(
      sub.customer_id,
      sub.user_id || null,
      `SUBSCRIPTION_${targetStatus.toUpperCase()}`,
      `Subscription ${sub.subscription_number} ${targetStatus.toUpperCase()}`,
      `Your subscription ${sub.subscription_number} is now ${targetStatus}.`,
      'SUBSCRIPTION',
      sub.id
    );

    return { subscriptionId: sub.id, previousStatus: currentStatus, newStatus: targetStatus };
  });

  return tx();
}

export function manualRenewSubscription(subscriptionId: string, userId: string) {
  const sub = db.prepare(`
    SELECT s.*, p.renewal_permitted, p.billing_frequency
    FROM subscriptions s
    JOIN subscription_plans p ON p.id = s.plan_id
    WHERE s.id = ?
  `).get(subscriptionId) as any;

  if (!sub) throw new Error('Subscription not found.');
  if (sub.status !== 'active') throw new Error(`Only active subscriptions can be renewed. Status: ${sub.status}`);
  if (!sub.renewal_permitted) throw new Error('Manual renewal is not permitted under this plan policy.');

  const nextBilling = getNextBillingDate(sub.next_billing_date, sub.billing_frequency);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE subscriptions
    SET next_billing_date = ?, updated_at = ?
    WHERE id = ?
  `).run(nextBilling, now, sub.id);

  logAudit(userId, null, 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION', sub.id, `Advanced renewal date for ${sub.subscription_number} to ${nextBilling}.`);

  return { subscriptionId: sub.id, nextBillingDate: nextBilling };
}
