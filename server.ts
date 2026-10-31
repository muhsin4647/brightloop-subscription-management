import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { seedDatabase } from './server/db/seed.ts';
import authRoutes from './server/routes/authRoutes.ts';
import customerRoutes from './server/routes/customerRoutes.ts';
import productRoutes from './server/routes/productRoutes.ts';
import planRoutes from './server/routes/planRoutes.ts';
import quotationRoutes from './server/routes/quotationRoutes.ts';
import subscriptionRoutes from './server/routes/subscriptionRoutes.ts';
import invoiceRoutes from './server/routes/invoiceRoutes.ts';
import paymentRoutes from './server/routes/paymentRoutes.ts';
import taxDiscountRoutes from './server/routes/taxDiscountRoutes.ts';
import reportRoutes from './server/routes/reportRoutes.ts';
import billingRoutes from './server/routes/billingRoutes.ts';
import userRoutes from './server/routes/userRoutes.ts';
import auditRoutes from './server/routes/auditRoutes.ts';
import portalRoutes from './server/routes/portalRoutes.ts';
import { runRecurringBilling } from './server/services/billingEngine.ts';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/quotations', quotationRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1', taxDiscountRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/portal', portalRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Brightloop Subscription Engine', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    // 1. Seed database with initial schema and realistic demo data
    await seedDatabase();

    // 2. Start automated recurring billing background scheduler
    // Runs periodically in the background to invoice any subscriptions that have reached their next_billing_date
    setInterval(() => {
      try {
        const result = runRecurringBilling('cron_scheduler');
        if (result.succeeded > 0) {
          console.log(`[Scheduler] Processed due billing: ${result.succeeded} invoice(s) generated.`);
        }
      } catch (cronErr) {
        console.error('[Scheduler] Error in recurring billing background run:', cronErr);
      }
    }, 60000); // Check every 60 seconds

    // 3. Mount Vite middlewares in dev or serve built assets in prod
    if (!isProduction) {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true, allowedHosts: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite dev middleware attached.');
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log('Serving production static build from dist.');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Brightloop server listening on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
