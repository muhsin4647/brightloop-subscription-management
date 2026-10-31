import bcrypt from 'bcryptjs';
import { db } from './connection.ts';
import { initializeDatabase } from './schema.ts';

export async function seedDatabase() {
  initializeDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('Database already seeded. Skipping seed.');
    return;
  }

  console.log('Seeding Brightloop database with comprehensive demo data...');

  const passwordHash = await bcrypt.hash('Brightloop@2026!', 10);
  const now = new Date().toISOString();
  const past30Days = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const past15Days = new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0];
  const past5Days = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const next15Days = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  const next30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Users
  insertUser.run('usr-admin-1', 'Alexander Vance (Admin)', 'admin@brightloop.io', passwordHash, 'ADMIN', 1, now, now);
  insertUser.run('usr-staff-1', 'Sarah Jenkins (Billing Ops)', 'sarah.staff@brightloop.io', passwordHash, 'STAFF', 1, now, now);
  insertUser.run('usr-cust-1', 'Alex Rivera', 'alex@acmecorp.com', passwordHash, 'CUSTOMER', 1, now, now);
  insertUser.run('usr-cust-2', 'Maria Chen', 'maria@techflow.io', passwordHash, 'CUSTOMER', 1, now, now);
  insertUser.run('usr-cust-3', 'David Vance', 'david@growthscale.com', passwordHash, 'CUSTOMER', 1, now, now);
  insertUser.run('usr-cust-4', 'Priya Sharma', 'priya@innovatetech.in', passwordHash, 'CUSTOMER', 1, now, now);

  // 2. Customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, user_id, name, company, email, phone, billing_address, tax_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCustomer.run(
    'cust-1',
    'usr-cust-1',
    'Alex Rivera',
    'Acme Corporation',
    'alex@acmecorp.com',
    '+91 98765 43210',
    'Plot 45, Cyber City, Phase 2, Gurugram, HR 122002',
    '07AAAAA0000A1Z5',
    'Key enterprise client since Q1 2026',
    now,
    now
  );
  insertCustomer.run(
    'cust-2',
    'usr-cust-2',
    'Maria Chen',
    'TechFlow Solutions',
    'maria@techflow.io',
    '+91 98111 22334',
    'Level 4, Embassy Tech Village, Outer Ring Rd, Bengaluru, KA 560103',
    '29BBBBB1111B2Z6',
    'Annual subscription customer with custom requirements',
    now,
    now
  );
  insertCustomer.run(
    'cust-3',
    'usr-cust-3',
    'David Vance',
    'GrowthScale Media',
    'david@growthscale.com',
    '+91 99222 33445',
    'Suite 801, Mindspace IT Park, Malad West, Mumbai, MH 400064',
    '27CCCCC2222C3Z7',
    'Paused subscription temporarily for restructuring',
    now,
    now
  );
  insertCustomer.run(
    'cust-4',
    'usr-cust-4',
    'Priya Sharma',
    'Innovate Tech Labs',
    'priya@innovatetech.in',
    '+91 97333 44556',
    'Hitech City, Madhapur, Hyderabad, TS 500081',
    '36DDDDD3333D4Z8',
    'High velocity SaaS startup',
    now,
    now
  );
  insertCustomer.run(
    'cust-5',
    null,
    'Rajesh Verma',
    'Horizon Logistics Ltd',
    'rajesh@horizonlogistics.com',
    '+91 96444 55667',
    'Logistics Hub, Sector 18, Noida, UP 201301',
    '09EEEEE4444E5Z9',
    'Quotation in negotiation stage',
    now,
    now
  );

  // 3. Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, code, description, product_type, base_price, cost_price, currency, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run(
    'prod-1',
    'Brightloop Starter',
    'BL-STARTER',
    'Entry-level subscription management for emerging businesses and teams.',
    'software',
    999,
    150,
    'INR',
    'active',
    'usr-admin-1',
    now,
    now
  );
  insertProduct.run(
    'prod-2',
    'Brightloop Business',
    'BL-BIZ',
    'Complete subscription engine with automated billing, quotations, and tax calculations.',
    'software',
    2000,
    400,
    'INR',
    'active',
    'usr-admin-1',
    now,
    now
  );
  insertProduct.run(
    'prod-3',
    'Brightloop Enterprise',
    'BL-ENT',
    'High-volume recurring billing, multi-entity support, dedicated accounting workflows.',
    'software',
    7500,
    1200,
    'INR',
    'active',
    'usr-admin-1',
    now,
    now
  );
  insertProduct.run(
    'prod-4',
    'Odoo Integration Add-on',
    'BL-ADDON-ODOO',
    'Bi-directional synchronization with Odoo ERP invoicing and customer ledgers.',
    'addon',
    499,
    80,
    'INR',
    'active',
    'usr-admin-1',
    now,
    now
  );
  insertProduct.run(
    'prod-5',
    'Premium Analytics Add-on',
    'BL-ADDON-ANALYTICS',
    'Advanced cohort analysis, churn prediction, and LTV modeling dashboards.',
    'addon',
    799,
    100,
    'INR',
    'active',
    'usr-admin-1',
    now,
    now
  );

  // 4. Product Variants
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (id, product_id, attribute_name, option_name, price_adjustment, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertVariant.run('var-1', 'prod-2', 'Brand', 'Standard', 0, 1, now);
  insertVariant.run('var-2', 'prod-2', 'Brand', 'Odoo', 560, 1, now);
  insertVariant.run('var-3', 'prod-2', 'Brand', 'Premium', 1000, 1, now);

  insertVariant.run('var-4', 'prod-3', 'Edition', 'Standard Enterprise', 0, 1, now);
  insertVariant.run('var-5', 'prod-3', 'Edition', 'Global Multi-Currency', 2500, 1, now);

  // 5. Subscription Plans
  const insertPlan = db.prepare(`
    INSERT INTO subscription_plans (
      id, product_id, name, code, description, billing_frequency, plan_price, min_quantity,
      currency, available_from, available_until, auto_close_enabled, early_closure_permitted,
      pause_permitted, renewal_permitted, quantity_change_permitted, addons_permitted, status,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPlan.run(
    'plan-1',
    'prod-2',
    'Business Monthly',
    'PLAN-BIZ-M',
    'Standard monthly billing for growing businesses with variant adjustments.',
    'monthly',
    2000,
    1,
    'INR',
    past30Days,
    null,
    0,
    1,
    1,
    1,
    1,
    1,
    'active',
    'usr-admin-1',
    now,
    now
  );

  insertPlan.run(
    'plan-2',
    'prod-2',
    'Business Yearly',
    'PLAN-BIZ-Y',
    'Discounted yearly commitment for business teams.',
    'yearly',
    21600,
    1,
    'INR',
    past30Days,
    null,
    0,
    1,
    1,
    1,
    1,
    1,
    'active',
    'usr-admin-1',
    now,
    now
  );

  insertPlan.run(
    'plan-3',
    'prod-1',
    'Starter Monthly',
    'PLAN-STARTER-M',
    'Essential billing for early stage ventures.',
    'monthly',
    999,
    1,
    'INR',
    past30Days,
    null,
    0,
    1,
    1,
    1,
    1,
    0,
    'active',
    'usr-admin-1',
    now,
    now
  );

  insertPlan.run(
    'plan-4',
    'prod-3',
    'Enterprise Annual',
    'PLAN-ENT-Y',
    'Complete enterprise license with annual billing cycle.',
    'yearly',
    81000,
    1,
    'INR',
    past30Days,
    null,
    0,
    0, // Early closure not permitted on annual contracts
    1,
    1,
    1,
    1,
    'active',
    'usr-admin-1',
    now,
    now
  );

  insertPlan.run(
    'plan-5',
    'prod-1',
    'Rapid Test Weekly',
    'PLAN-RAPID-W',
    'Weekly recurring cycle for short campaigns or pilots.',
    'weekly',
    299,
    1,
    'INR',
    past30Days,
    null,
    0,
    1,
    1,
    1,
    1,
    1,
    'active',
    'usr-admin-1',
    now,
    now
  );

  insertPlan.run(
    'plan-6',
    'prod-1',
    'Cloud Ops Daily',
    'PLAN-OPS-D',
    'Daily micro-billing plan for high-frequency infrastructure testing.',
    'daily',
    50,
    1,
    'INR',
    past30Days,
    null,
    0,
    1,
    1,
    1,
    0,
    0,
    'active',
    'usr-admin-1',
    now,
    now
  );

  // 6. Tax Rules
  const insertTax = db.prepare(`
    INSERT INTO tax_rules (id, name, code, rate, tax_type, calculation_method, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTax.run('tax-1', 'Standard GST 18%', 'GST-18', 18.0, 'percentage', 'after_discount', 1, now);
  insertTax.run('tax-2', 'Reduced GST 5%', 'GST-5', 5.0, 'percentage', 'after_discount', 1, now);

  // 7. Discount Rules
  const insertDiscount = db.prepare(`
    INSERT INTO discount_rules (
      id, name, code, description, discount_type, value, min_purchase_amount, min_quantity,
      applicable_product_id, applicable_plan_id, start_date, end_date, max_uses, usage_count, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDiscount.run(
    'disc-1',
    'Welcome 10% Off',
    'WELCOME10',
    '10% introductory discount for initial orders.',
    'percentage',
    10.0,
    1000,
    1,
    null,
    null,
    past30Days,
    next30Days,
    100,
    12,
    1,
    now
  );

  insertDiscount.run(
    'disc-2',
    'Flat ₹500 Loyalty Bonus',
    'FLAT500',
    'Flat discount for purchase over ₹3,000.',
    'fixed',
    500.0,
    3000,
    1,
    null,
    null,
    past30Days,
    next30Days,
    50,
    8,
    1,
    now
  );

  insertDiscount.run(
    'disc-3',
    'Enterprise 20% Special',
    'ENTERPRISE20',
    '20% exclusive discount for enterprise commitments.',
    'percentage',
    20.0,
    50000,
    1,
    'prod-3',
    'plan-4',
    past30Days,
    next30Days,
    20,
    2,
    1,
    now
  );

  // 8. Quotation Templates
  const insertTemplate = db.prepare(`
    INSERT INTO quotation_templates (
      id, name, description, default_plan_id, default_quantity, default_payment_terms,
      validity_duration_days, notes_terms, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTemplate.run(
    'tmpl-1',
    'Standard Business Software Proposal',
    'Pre-configured quotation for mid-tier business software packages.',
    'plan-1',
    1,
    'Net 15',
    30,
    'Payment due within 15 days of invoice date. Includes email and telephone technical support.',
    1,
    now
  );

  insertTemplate.run(
    'tmpl-2',
    'Enterprise Annual Software Agreement',
    'High-volume agreement template with annual invoicing terms.',
    'plan-4',
    1,
    'Net 30',
    45,
    'Covers 99.9% SLA, dedicated customer success representative, and quarterly business reviews.',
    1,
    now
  );

  // 9. Quotations
  const insertQuotation = db.prepare(`
    INSERT INTO quotations (
      id, quotation_number, customer_id, plan_id, issue_date, expiry_date, validity_duration_days,
      subtotal, discount_amount, tax_amount, grand_total, payment_terms, notes, terms, status,
      converted_to_subscription_id, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuotationLine = db.prepare(`
    INSERT INTO quotation_lines (
      id, quotation_id, product_id, variant_id, description, quantity, unit_price,
      variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Quotation 1: Horizon Logistics (Sent / Open)
  insertQuotation.run(
    'qt-1',
    'QT-2026-0001',
    'cust-5',
    'plan-1',
    todayStr,
    next30Days,
    30,
    5120.0,
    512.0, // 10% welcome discount
    829.44, // 18% tax on 4608
    5437.44,
    'Net 15',
    'Proposal submitted following demonstration on Oct 28.',
    'Valid for 30 calendar days.',
    'sent',
    null,
    'usr-staff-1',
    now,
    now
  );

  insertQuotationLine.run('qtl-1', 'qt-1', 'prod-2', 'var-2', 'Brightloop Business (Brand: Odoo)', 2, 2000, 560, 512, 18.0, 829.44, 5437.44);

  // Quotation 2: Acme Corp (Accepted & Converted to SUB-2026-0001)
  insertQuotation.run(
    'qt-2',
    'QT-2026-0002',
    'cust-1',
    'plan-1',
    past30Days,
    todayStr,
    30,
    2560.0,
    0,
    460.8,
    3020.8,
    'Net 15',
    'Approved by Procurement.',
    'Standard commercial terms apply.',
    'accepted',
    'sub-1',
    'usr-staff-1',
    now,
    now
  );

  insertQuotationLine.run('qtl-2', 'qt-2', 'prod-2', 'var-2', 'Brightloop Business (Brand: Odoo)', 1, 2000, 560, 0, 18.0, 460.8, 3020.8);

  // Quotation 3: TechFlow (Draft)
  insertQuotation.run(
    'qt-3',
    'QT-2026-0003',
    'cust-2',
    'plan-2',
    todayStr,
    next30Days,
    30,
    21600.0,
    2160.0,
    3499.2,
    22939.2,
    'Net 30',
    'Draft proposal for expansion to secondary division.',
    'Subject to board approval.',
    'draft',
    null,
    'usr-admin-1',
    now,
    now
  );

  insertQuotationLine.run('qtl-3', 'qt-3', 'prod-2', 'var-1', 'Brightloop Business (Brand: Standard) - Yearly', 1, 21600, 0, 2160, 18.0, 3499.2, 22939.2);

  // 10. Subscriptions
  const insertSub = db.prepare(`
    INSERT INTO subscriptions (
      id, subscription_number, customer_id, plan_id, quotation_id, start_date, end_date,
      next_billing_date, billing_frequency, payment_terms, currency, subtotal, discount_amount,
      tax_amount, total_amount, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubLine = db.prepare(`
    INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, description, quantity, unit_price,
      variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubHistory = db.prepare(`
    INSERT INTO subscription_history (id, subscription_id, previous_status, new_status, reason, changed_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Sub 1: Acme Corp - Active Business Monthly
  insertSub.run(
    'sub-1',
    'SUB-2026-0001',
    'cust-1',
    'plan-1',
    'qt-2',
    past30Days,
    null,
    next30Days,
    'monthly',
    'Net 15',
    'INR',
    2560.0,
    0,
    460.8,
    3020.8,
    'active',
    'usr-staff-1',
    now,
    now
  );
  insertSubLine.run('subl-1', 'sub-1', 'prod-2', 'var-2', 'Brightloop Business (Brand: Odoo)', 1, 2000, 560, 0, 18.0, 460.8, 3020.8);
  insertSubHistory.run('sh-1', 'sub-1', 'confirmed', 'active', 'Initial payment received and subscription activated.', 'usr-admin-1', now);

  // Sub 2: TechFlow - Active Enterprise Annual
  insertSub.run(
    'sub-2',
    'SUB-2026-0002',
    'cust-2',
    'plan-4',
    null,
    past15Days,
    null,
    next30Days,
    'yearly',
    'Net 30',
    'INR',
    81000.0,
    0,
    14580.0,
    95580.0,
    'active',
    'usr-admin-1',
    now,
    now
  );
  insertSubLine.run('subl-2', 'sub-2', 'prod-3', 'var-4', 'Brightloop Enterprise License (Annual)', 1, 81000, 0, 0, 18.0, 14580.0, 95580.0);
  insertSubHistory.run('sh-2', 'sub-2', 'confirmed', 'active', 'Enterprise agreement signed and activated.', 'usr-admin-1', now);

  // Sub 3: GrowthScale - Paused
  insertSub.run(
    'sub-3',
    'SUB-2026-0003',
    'cust-3',
    'plan-1',
    null,
    past30Days,
    null,
    todayStr,
    'monthly',
    'Net 15',
    'INR',
    2000.0,
    0,
    360.0,
    2360.0,
    'paused',
    'usr-admin-1',
    now,
    now
  );
  insertSubLine.run('subl-3', 'sub-3', 'prod-2', 'var-1', 'Brightloop Business (Brand: Standard)', 1, 2000, 0, 0, 18.0, 360.0, 2360.0);
  insertSubHistory.run('sh-3', 'sub-3', 'active', 'paused', 'Customer requested temporary pause during ERP upgrade.', 'usr-staff-1', now);

  // Sub 4: Innovate Tech Labs - Active & DUE TODAY! (Allows immediate test of automated billing engine!)
  insertSub.run(
    'sub-4',
    'SUB-2026-0004',
    'cust-4',
    'plan-3',
    null,
    past30Days,
    null,
    todayStr, // Next billing date is TODAY!
    'monthly',
    'Net 15',
    'INR',
    999.0,
    0,
    179.82,
    1178.82,
    'active',
    'usr-staff-1',
    now,
    now
  );
  insertSubLine.run('subl-4', 'sub-4', 'prod-1', null, 'Brightloop Starter Monthly', 1, 999, 0, 0, 18.0, 179.82, 1178.82);
  insertSubHistory.run('sh-4', 'sub-4', 'confirmed', 'active', 'Activated on startup program.', 'usr-staff-1', now);

  // Sub 5: Acme Corp - Cancelled pilot
  insertSub.run(
    'sub-5',
    'SUB-2026-0005',
    'cust-1',
    'plan-5',
    null,
    past30Days,
    past5Days,
    past5Days,
    'weekly',
    'Net 7',
    'INR',
    299.0,
    0,
    53.82,
    352.82,
    'cancelled',
    'usr-admin-1',
    now,
    now
  );
  insertSubLine.run('subl-5', 'sub-5', 'prod-1', null, 'Rapid Test Weekly Pilot', 1, 299, 0, 0, 18.0, 53.82, 352.82);
  insertSubHistory.run('sh-5', 'sub-5', 'active', 'cancelled', 'Pilot duration completed as scheduled.', 'usr-admin-1', now);

  // 11. Invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, subscription_id, customer_id, issue_date, due_date,
      billing_period_start, billing_period_end, currency, subtotal, discount_amount,
      tax_amount, total_amount, amount_paid, outstanding_amount, status, payment_terms,
      notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInvoiceLine = db.prepare(`
    INSERT INTO invoice_lines (
      id, invoice_id, product_id, variant_id, description, quantity, unit_price,
      variant_adjustment, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Invoice 1: Acme Corp - PAID
  insertInvoice.run(
    'inv-1',
    'INV-2026-0001',
    'sub-1',
    'cust-1',
    past30Days,
    past15Days,
    past30Days,
    todayStr,
    'INR',
    2560.0,
    0,
    460.8,
    3020.8,
    3020.8,
    0,
    'paid',
    'Net 15',
    'Recurring billing cycle for Business Monthly subscription.',
    'usr-admin-1',
    now,
    now
  );
  insertInvoiceLine.run('invl-1', 'inv-1', 'prod-2', 'var-2', 'Brightloop Business (Brand: Odoo) - Oct 2026', 1, 2000, 560, 0, 18.0, 460.8, 3020.8);

  // Invoice 2: TechFlow - PARTIALLY PAID
  insertInvoice.run(
    'inv-2',
    'INV-2026-0002',
    'sub-2',
    'cust-2',
    past15Days,
    next15Days,
    past15Days,
    next30Days,
    'INR',
    81000.0,
    0,
    14580.0,
    95580.0,
    50000.0,
    45580.0,
    'partially_paid',
    'Net 30',
    'Annual license invoice. Installment 1 of 2 recorded.',
    'usr-admin-1',
    now,
    now
  );
  insertInvoiceLine.run('invl-2', 'inv-2', 'prod-3', 'var-4', 'Brightloop Enterprise License - Annual 2026-2027', 1, 81000, 0, 0, 18.0, 14580.0, 95580.0);

  // Invoice 3: GrowthScale - OVERDUE!
  insertInvoice.run(
    'inv-3',
    'INV-2026-0003',
    'sub-3',
    'cust-3',
    past30Days,
    past5Days, // Due date in the past!
    past30Days,
    todayStr,
    'INR',
    2000.0,
    0,
    360.0,
    2360.0,
    0,
    2360.0,
    'overdue',
    'Net 15',
    'Outstanding payment reminder dispatched.',
    'usr-staff-1',
    now,
    now
  );
  insertInvoiceLine.run('invl-3', 'inv-3', 'prod-2', 'var-1', 'Brightloop Business (Standard) - October Billing', 1, 2000, 0, 0, 18.0, 360.0, 2360.0);

  // Invoice 4: Innovate Tech Labs - CONFIRMED / SENT
  insertInvoice.run(
    'inv-4',
    'INV-2026-0004',
    'sub-4',
    'cust-4',
    past5Days,
    next15Days,
    past5Days,
    next30Days,
    'INR',
    999.0,
    0,
    179.82,
    1178.82,
    0,
    1178.82,
    'sent',
    'Net 15',
    'Dispatched electronically to customer finance inbox.',
    'usr-staff-1',
    now,
    now
  );
  insertInvoiceLine.run('invl-4', 'inv-4', 'prod-1', null, 'Brightloop Starter Monthly SaaS', 1, 999, 0, 0, 18.0, 179.82, 1178.82);

  // Invoice 5: Acme Corp - DRAFT
  insertInvoice.run(
    'inv-5',
    'INV-2026-0005',
    'sub-1',
    'cust-1',
    todayStr,
    next15Days,
    todayStr,
    next30Days,
    'INR',
    499.0,
    0,
    89.82,
    588.82,
    0,
    588.82,
    'draft',
    'Net 15',
    'Draft one-time setup assistance for add-on.',
    'usr-admin-1',
    now,
    now
  );
  insertInvoiceLine.run('invl-5', 'inv-5', 'prod-4', null, 'Odoo ERP Integration Setup Assistance', 1, 499, 0, 0, 18.0, 89.82, 588.82);

  // 12. Payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (
      id, payment_number, customer_id, invoice_id, payment_method, amount, payment_date,
      transaction_reference, notes, status, recorded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPayment.run(
    'pay-1',
    'PAY-2026-0001',
    'cust-1',
    'inv-1',
    'upi',
    3020.8,
    past15Days,
    'UPI/20261015/9823481234',
    'Settled via UPI QR code checkout.',
    'successful',
    'usr-staff-1',
    now
  );

  insertPayment.run(
    'pay-2',
    'PAY-2026-0002',
    'cust-2',
    'inv-2',
    'bank_transfer',
    50000.0,
    past5Days,
    'NEFT-HDFC-9988112233',
    'First tranche received via wire transfer.',
    'successful',
    'usr-admin-1',
    now
  );

  // 13. Billing Events (Idempotency records)
  const insertBillingEvent = db.prepare(`
    INSERT INTO billing_events (
      id, subscription_id, billing_period_start, billing_period_end, attempt_timestamp,
      outcome, invoice_id, error_details, retry_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBillingEvent.run('be-1', 'sub-1', past30Days, todayStr, now, 'success', 'inv-1', null, 0);

  // 14. Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_email, action, resource_type, resource_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run('aud-1', 'usr-admin-1', 'admin@brightloop.io', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'SYS-001', 'Initialized Brightloop core billing schema and catalog.', '127.0.0.1', now);
  insertAudit.run('aud-2', 'usr-staff-1', 'sarah.staff@brightloop.io', 'QUOTATION_CONVERTED', 'QUOTATION', 'qt-2', 'Converted quotation QT-2026-0002 to subscription SUB-2026-0001.', '127.0.0.1', now);
  insertAudit.run('aud-3', 'usr-staff-1', 'sarah.staff@brightloop.io', 'PAYMENT_RECORDED', 'PAYMENT', 'pay-1', 'Recorded UPI payment of ₹3,020.80 for INV-2026-0001.', '127.0.0.1', now);
  insertAudit.run('aud-4', 'usr-admin-1', 'admin@brightloop.io', 'SUBSCRIPTION_PAUSED', 'SUBSCRIPTION', 'sub-3', 'Paused subscription SUB-2026-0003 per customer request.', '127.0.0.1', now);

  // 15. Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, customer_id, user_id, type, title, message, delivery_status, related_resource_type, related_resource_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run('notif-1', 'cust-1', 'usr-cust-1', 'INVOICE_PAID', 'Payment Received', 'Your payment of ₹3,020.80 for invoice INV-2026-0001 was successfully processed.', 'sent', 'INVOICE', 'inv-1', now);
  insertNotification.run('notif-2', 'cust-3', 'usr-cust-3', 'OVERDUE_REMINDER', 'Invoice Overdue Reminder', 'Invoice INV-2026-0003 for ₹2,360.00 is past due. Please remit payment at your earliest convenience.', 'sent', 'INVOICE', 'inv-3', now);
  insertNotification.run('notif-3', 'cust-4', 'usr-cust-4', 'RENEWAL_DUE', 'Upcoming Renewal Notice', 'Your Brightloop Starter subscription SUB-2026-0004 renews today.', 'sent', 'SUBSCRIPTION', 'sub-4', now);

  console.log('Database seeded successfully with users, customers, products, plans, quotes, subscriptions, invoices, and payments!');
}
