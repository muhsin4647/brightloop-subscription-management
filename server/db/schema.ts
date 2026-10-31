import { db } from './connection.ts';

export function initializeDatabase() {
  db.exec(`
    -- Users and Authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STAFF', 'CUSTOMER')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Password Reset Tokens
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      billing_address TEXT,
      tax_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      product_type TEXT NOT NULL CHECK(product_type IN ('software', 'service', 'addon', 'other')),
      base_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Product Variants
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      attribute_name TEXT NOT NULL,
      option_name TEXT NOT NULL,
      price_adjustment REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Subscription Plans
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      billing_frequency TEXT NOT NULL CHECK(billing_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      plan_price REAL NOT NULL,
      min_quantity INTEGER NOT NULL DEFAULT 1,
      currency TEXT NOT NULL DEFAULT 'INR',
      available_from TEXT NOT NULL,
      available_until TEXT,
      auto_close_enabled INTEGER NOT NULL DEFAULT 0,
      early_closure_permitted INTEGER NOT NULL DEFAULT 1,
      pause_permitted INTEGER NOT NULL DEFAULT 1,
      renewal_permitted INTEGER NOT NULL DEFAULT 1,
      quantity_change_permitted INTEGER NOT NULL DEFAULT 1,
      addons_permitted INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft', 'active', 'inactive', 'archived')),
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tax Rules
    CREATE TABLE IF NOT EXISTS tax_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      rate REAL NOT NULL,
      tax_type TEXT NOT NULL DEFAULT 'percentage' CHECK(tax_type IN ('percentage', 'fixed')),
      calculation_method TEXT NOT NULL DEFAULT 'after_discount' CHECK(calculation_method IN ('after_discount', 'before_discount')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Discount Rules
    CREATE TABLE IF NOT EXISTS discount_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('fixed', 'percentage')),
      value REAL NOT NULL,
      min_purchase_amount REAL DEFAULT 0,
      min_quantity INTEGER DEFAULT 1,
      applicable_product_id TEXT REFERENCES products(id),
      applicable_plan_id TEXT REFERENCES subscription_plans(id),
      start_date TEXT,
      end_date TEXT,
      max_uses INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Quotation Templates
    CREATE TABLE IF NOT EXISTS quotation_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      default_plan_id TEXT REFERENCES subscription_plans(id),
      default_quantity INTEGER NOT NULL DEFAULT 1,
      default_payment_terms TEXT NOT NULL DEFAULT 'Net 15',
      validity_duration_days INTEGER NOT NULL DEFAULT 30,
      notes_terms TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Quotations
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quotation_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      validity_duration_days INTEGER NOT NULL DEFAULT 30,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL,
      payment_terms TEXT NOT NULL DEFAULT 'Net 15',
      notes TEXT,
      terms TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled')),
      converted_to_subscription_id TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Quotation Line Items
    CREATE TABLE IF NOT EXISTS quotation_lines (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      variant_adjustment REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL
    );

    -- Subscriptions
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      subscription_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
      quotation_id TEXT REFERENCES quotations(id),
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_billing_date TEXT NOT NULL,
      billing_frequency TEXT NOT NULL CHECK(billing_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      payment_terms TEXT NOT NULL DEFAULT 'Net 15',
      currency TEXT NOT NULL DEFAULT 'INR',
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'cancelled', 'expired', 'closed')),
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Subscription Line Items
    CREATE TABLE IF NOT EXISTS subscription_lines (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      variant_adjustment REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL
    );

    -- Subscription Lifecycle History
    CREATE TABLE IF NOT EXISTS subscription_history (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      reason TEXT,
      changed_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    -- Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      subscription_id TEXT REFERENCES subscriptions(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      billing_period_start TEXT,
      billing_period_end TEXT,
      currency TEXT NOT NULL DEFAULT 'INR',
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      outstanding_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')),
      payment_terms TEXT NOT NULL DEFAULT 'Net 15',
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Invoice Line Items
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      variant_adjustment REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('bank_transfer', 'upi', 'cash', 'card', 'payment_gateway', 'other')),
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      transaction_reference TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'successful' CHECK(status IN ('successful', 'failed', 'refunded')),
      recorded_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    -- Billing Events (Ensures Idempotency & Duplicate Prevention)
    CREATE TABLE IF NOT EXISTS billing_events (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
      billing_period_start TEXT NOT NULL,
      billing_period_end TEXT NOT NULL,
      attempt_timestamp TEXT NOT NULL,
      outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failed')),
      invoice_id TEXT REFERENCES invoices(id),
      error_details TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT unique_sub_billing_period UNIQUE (subscription_id, billing_period_start, billing_period_end)
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK(delivery_status IN ('sent', 'pending', 'failed')),
      related_resource_type TEXT,
      related_resource_id TEXT,
      created_at TEXT NOT NULL
    );

    -- Indexes for high performance query execution
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
  `);

  console.log('Database tables and indexes initialized successfully.');
}
