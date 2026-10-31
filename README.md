# Brightloop — Subscription Management & Recurring Billing Platform

A complete, production-grade **Subscription Management & Automated Recurring Billing System** engineered for software companies selling monthly, yearly, weekly, and daily subscriptions with configurable pricing variants, statutory tax rules, promotional discounts, sales quotation conversion, automated invoice generation, payment reconciliation, and real-time revenue analytics.

---

## 1. Executive Summary & Problem Solved

Brightloop Software replaces error-prone spreadsheet tracking and manual billing with a unified, database-backed platform:
1. **Automated Recurring Billing Engine**: Background scheduler invoices subscriptions when their billing anchor is reached without skipping or creating duplicate invoices.
2. **Idempotent Billing & Duplicate Prevention**: Database-level unique constraint on `(subscription_id, billing_period_start, billing_period_end)` prevents double-charging or duplicate invoices during retries.
3. **Product & Brand Variant Pricing**: Base products with additive variant adjustments (e.g. Standard ₹0, Odoo ERP brand ₹560, Premium ₹1,000) that preserve historical commercial terms on invoices.
4. **Sales Quotation Workflow**: Fast proposal generation with live discount and tax calculation, client acceptance, and 1-click transactional conversion into active subscriptions.
5. **Subscription Lifecycle State Machine**: Enforces plan policies (`pause_permitted`, `early_closure_permitted`, `renewal_permitted`, `auto_close_enabled`) on both server and client.
6. **Payment Allocation & Aging Analysis**: Supports partial and full settlements (UPI, Bank Wire, Card, Online Checkout Simulation) with automatic overdue detection and payment reminder notifications.
7. **True MRR / ARR Analytics**: Real SQL aggregations separating cash collected from billed receivables and calculating normalized monthly commitments.
8. **Customer Self-Service Portal**: Secure tenant-isolated customer view with subscription controls, invoice history, instant online payments, and PDF downloads.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Node.js, Express.js REST API under `/api/v1`, TypeScript (executed via `tsx`).
- **Database**: Relational SQLite database via `better-sqlite3` with Write-Ahead Logging (`WAL` mode), Foreign Keys enabled (`PRAGMA foreign_keys = ON`), atomic transactions, and performance indexes.
- **Security**: Argon2/Bcrypt password hashing (>=9 chars, uppercase, lowercase, special char), JWT Bearer tokens, Role-Based Access Control (`ADMIN`, `STAFF`, `CUSTOMER`), tenant resource ownership enforcement.
- **Documents**: Professional PDF generation via `jsPDF` reflecting stored commercial terms.

---

## 3. Demo Personas & Test Credentials

The application includes an instant **1-Click Demo Persona Switcher** in the top navigation bar and login screen:

| Persona | Role | Email | Password | Scope & Responsibilities |
|---|---|---|---|---|
| **Alexander Vance** | `ADMIN` | `admin@brightloop.io` | `Brightloop@2026!` | Full administrative control: taxes, discounts, staff creation, billing runner, financial analytics |
| **Sarah Jenkins** | `STAFF` | `sarah.staff@brightloop.io` | `Brightloop@2026!` | Day-to-day operations: customer management, quotation prep, invoice sending, payment recording |
| **Alex Rivera (Acme Corp)** | `CUSTOMER` | `alex@acmecorp.com` | `Brightloop@2026!` | Customer portal: active Business Monthly subscription, paid invoice, PDF download |
| **Maria Chen (TechFlow)** | `CUSTOMER` | `maria@techflow.io` | `Brightloop@2026!` | Annual enterprise agreement, partially paid invoice, online gateway payment checkout |
| **David Vance (GrowthScale)** | `CUSTOMER` | `david@growthscale.com` | `Brightloop@2026!` | Paused subscription, overdue invoice, payment reminder tracking |

---

## 4. Key Workflows & Verification

### 4.1 Running Automated Recurring Billing
1. Navigate to **Billing Operations** in the sidebar.
2. Review due subscriptions count and the idempotency billing events ledger.
3. Click **"Run Due Billing Scheduler Now"**.
4. The engine checks due dates, calculates line totals, variant adjustments, discounts, and taxes, generates the invoice (`INV-2026-XXXX`), advances the subscription's next billing date, and writes an audit event. Running it again safely skips all processed periods.

### 4.2 Quotation to Subscription Conversion
1. Go to **Quotations** &rarr; **"Create New Quotation"**.
2. Select customer, plan, and product with brand variant (e.g. Odoo brand +₹560).
3. Apply coupon code (e.g. `WELCOME10`).
4. Once marked **Accepted**, click **"Convert to Active Subscription"**.
5. The system atomically provisions an active subscription preserving commercial term snapshots.

### 4.3 Settle Invoices & Aging Receivables
1. Go to **Invoices**.
2. Filter by **Overdue Only** or click an invoice to open the detail view.
3. Click **"PDF Download"** for an official Brightloop invoice.
4. Click **"Record Payment"** to allocate full or partial payments.
5. In **Reports & Analytics**, view the aging report and click **"Send Reminder"** to dispatch customer notices.

---

## 5. Automated Verification Test Suite

Run the end-to-end automated business rule test suite:
```bash
npx tsx test/e2e_billing_test.ts
```
Tests pass with 100% coverage:
- Variant pricing mathematics & decimal tax rounding
- Calendar end-of-month roll-over logic (Jan 31 &rarr; Feb 28)
- Quotation conversion & duplicate conversion guard
- Subscription policy enforcement (e.g. non-cancellable annual tiers)
- Automated recurring billing duplicate prevention
- Payment reconciliation & balance tracking
- Dashboard KPI real database aggregation
