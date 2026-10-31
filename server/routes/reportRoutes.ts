import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { getDashboardKPIs, getDashboardCharts, getOverdueInvoicesReport } from '../services/reportService.ts';

const router = Router();

// GET /api/v1/reports/kpis
router.get('/kpis', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const kpis = getDashboardKPIs();
    res.json(kpis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/charts
router.get('/charts', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const charts = getDashboardCharts();
    res.json(charts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/overdue
router.get('/overdue', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = getOverdueInvoicesReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/export/subscriptions (CSV Export)
router.get('/export/subscriptions', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const subs = db.prepare(`
      SELECT s.subscription_number, c.name as customer_name, c.company, p.name as plan_name,
             s.billing_frequency, s.status, s.start_date, s.next_billing_date, s.subtotal,
             s.tax_amount, s.total_amount
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN subscription_plans p ON p.id = s.plan_id
      ORDER BY s.created_at DESC
    `).all() as any[];

    let csv = 'Subscription Number,Customer,Company,Plan,Frequency,Status,Start Date,Next Billing Date,Subtotal,Tax,Total\n';
    for (const s of subs) {
      csv += `"${s.subscription_number}","${s.customer_name}","${s.company}","${s.plan_name}","${s.billing_frequency}","${s.status}","${s.start_date}","${s.next_billing_date}","${s.subtotal}","${s.tax_amount}","${s.total_amount}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="brightloop_subscriptions.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/export/invoices (CSV Export)
router.get('/export/invoices', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoices = db.prepare(`
      SELECT i.invoice_number, c.name as customer_name, c.company, i.issue_date, i.due_date,
             i.status, i.subtotal, i.discount_amount, i.tax_amount, i.total_amount, i.amount_paid, i.outstanding_amount
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      ORDER BY i.issue_date DESC
    `).all() as any[];

    let csv = 'Invoice Number,Customer,Company,Issue Date,Due Date,Status,Subtotal,Discount,Tax,Total Amount,Amount Paid,Outstanding\n';
    for (const inv of invoices) {
      csv += `"${inv.invoice_number}","${inv.customer_name}","${inv.company}","${inv.issue_date}","${inv.due_date}","${inv.status}","${inv.subtotal}","${inv.discount_amount}","${inv.tax_amount}","${inv.total_amount}","${inv.amount_paid}","${inv.outstanding_amount}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="brightloop_invoices.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
