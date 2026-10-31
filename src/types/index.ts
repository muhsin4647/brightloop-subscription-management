export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customerId?: string | null;
  isActive?: boolean;
  created_at?: string;
}

export interface Customer {
  id: string;
  user_id?: string | null;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  billing_address?: string | null;
  tax_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  active_subscriptions_count?: number;
  total_outstanding?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attribute_name: string;
  option_name: string;
  price_adjustment: number;
  is_active: number | boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  product_type: 'software' | 'service' | 'addon' | 'other';
  base_price: number;
  cost_price: number;
  currency: string;
  notes?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  variants_count?: number;
  active_plans_count?: number;
}

export interface SubscriptionPlan {
  id: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  name: string;
  code: string;
  description?: string;
  billing_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  plan_price: number;
  min_quantity: number;
  currency: string;
  available_from: string;
  available_until?: string | null;
  auto_close_enabled: number | boolean;
  early_closure_permitted: number | boolean;
  pause_permitted: number | boolean;
  renewal_permitted: number | boolean;
  quantity_change_permitted: number | boolean;
  addons_permitted: number | boolean;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  created_at: string;
  active_subscriptions_count?: number;
}

export interface TaxRule {
  id: string;
  name: string;
  code: string;
  rate: number;
  tax_type: 'percentage' | 'fixed';
  calculation_method: 'after_discount' | 'before_discount';
  is_active: number | boolean;
  created_at: string;
}

export interface DiscountRule {
  id: string;
  name: string;
  code: string;
  description?: string;
  discount_type: 'fixed' | 'percentage';
  value: number;
  min_purchase_amount: number;
  min_quantity: number;
  applicable_product_id?: string | null;
  applicable_plan_id?: string | null;
  product_name?: string;
  plan_name?: string;
  start_date?: string | null;
  end_date?: string | null;
  max_uses?: number | null;
  usage_count: number;
  is_active: number | boolean;
  created_at: string;
}

export interface QuotationLine {
  id: string;
  quotation_id: string;
  product_id: string;
  product_name?: string;
  variant_id?: string | null;
  variant_name?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  variant_adjustment: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  plan_id: string;
  plan_name?: string;
  issue_date: string;
  expiry_date: string;
  validity_duration_days: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  payment_terms: string;
  notes?: string;
  terms?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  converted_to_subscription_id?: string | null;
  created_by_name?: string;
  created_at: string;
}

export interface SubscriptionLine {
  id: string;
  subscription_id: string;
  product_id: string;
  product_name?: string;
  variant_id?: string | null;
  variant_name?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  variant_adjustment: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  plan_id: string;
  plan_name?: string;
  quotation_id?: string | null;
  start_date: string;
  end_date?: string | null;
  next_billing_date: string;
  billing_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  payment_terms: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'cancelled' | 'expired' | 'closed';
  pause_permitted?: number | boolean;
  early_closure_permitted?: number | boolean;
  renewal_permitted?: number | boolean;
  created_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  product_id?: string;
  variant_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  variant_adjustment: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id?: string | null;
  subscription_number?: string | null;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  customer_phone?: string;
  billing_address?: string | null;
  customer_tax_id?: string | null;
  issue_date: string;
  due_date: string;
  billing_period_start?: string | null;
  billing_period_end?: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  outstanding_amount: number;
  status: 'draft' | 'confirmed' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  payment_terms: string;
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  invoice_id: string;
  invoice_number?: string;
  invoice_total?: number;
  payment_method: 'bank_transfer' | 'upi' | 'cash' | 'card' | 'payment_gateway' | 'other';
  amount: number;
  payment_date: string;
  transaction_reference?: string;
  notes?: string;
  status: 'successful' | 'failed' | 'refunded';
  recorded_by_name?: string;
  created_at: string;
}

export interface BillingEvent {
  id: string;
  subscription_id: string;
  subscription_number?: string;
  customer_name?: string;
  customer_company?: string;
  billing_period_start: string;
  billing_period_end: string;
  attempt_timestamp: string;
  outcome: 'success' | 'failed';
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_amount?: number | null;
  error_details?: string | null;
  retry_count: number;
}

export interface DashboardKPIs {
  activeSubscriptions: number;
  totalSubscriptions: number;
  pausedSubscriptions: number;
  cancelledSubscriptions: number;
  mrr: number;
  arr: number;
  cashCollected: number;
  billedRevenue: number;
  outstandingReceivables: number;
  overdueInvoicesCount: number;
  overdueInvoicesAmount: number;
  upcomingRenewalsCount: number;
  failedBillingCount: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  customer_id?: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  delivery_status: 'sent' | 'pending' | 'failed';
  related_resource_type?: string;
  related_resource_id?: string;
  created_at: string;
}
