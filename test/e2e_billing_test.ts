import { db } from '../server/db/connection.ts';
import { runRecurringBilling, retryFailedBillingEvent } from '../server/services/billingEngine.ts';
import { calculateCommercialDocument, getNextBillingDate } from '../server/services/calculationService.ts';
import { createQuotation, convertQuotationToSubscription } from '../server/services/quotationService.ts';
import { transitionSubscriptionStatus } from '../server/services/subscriptionService.ts';
import { recordPayment } from '../server/services/paymentService.ts';
import { getDashboardKPIs } from '../server/services/reportService.ts';

async function runTests() {
  console.log('--- STARTING BRIGHTLOOP VERIFICATION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // TEST 1: Variant price calculation & Decimal rounding
  console.log('\n[Test 1] Product Variant Calculation & Commercial Totals');
  const calcResult = calculateCommercialDocument(
    [
      {
        productId: 'prod-2',
        variantId: 'var-2',
        description: 'Brightloop Business (Brand: Odoo)',
        quantity: 2,
        unitPrice: 2000,
        variantAdjustment: 560, // 2560 per unit
      },
    ],
    { type: 'percentage', value: 10, minPurchaseAmount: 1000 },
    18.0
  );

  // Subtotal = 2 * 2560 = 5120
  // Discount = 10% of 5120 = 512
  // Taxable = 5120 - 512 = 4608
  // Tax (18%) = 829.44
  // Total = 4608 + 829.44 = 5437.44
  assert(calcResult.subtotal === 5120, `Expected subtotal 5120, got ${calcResult.subtotal}`);
  assert(calcResult.discountAmount === 512, `Expected discount 512, got ${calcResult.discountAmount}`);
  assert(calcResult.taxAmount === 829.44, `Expected tax 829.44, got ${calcResult.taxAmount}`);
  assert(calcResult.grandTotal === 5437.44, `Expected grand total 5437.44, got ${calcResult.grandTotal}`);

  // TEST 2: Billing Dates Calculations
  console.log('\n[Test 2] Billing Dates Calendar Calculations');
  const nextMonthly = getNextBillingDate('2026-01-31', 'monthly');
  assert(nextMonthly === '2026-02-28', `End of month Jan 31 -> Feb 28, got ${nextMonthly}`);
  const nextWeekly = getNextBillingDate('2026-10-01', 'weekly');
  assert(nextWeekly === '2026-10-08', `Weekly +7 days Oct 1 -> Oct 8, got ${nextWeekly}`);

  // TEST 3: Quotation Creation and Conversion to Subscription
  console.log('\n[Test 3] Quotation Creation and Transactional Conversion');
  const quote = createQuotation({
    customerId: 'cust-1',
    planId: 'plan-1',
    items: [
      {
        productId: 'prod-2',
        variantId: 'var-2',
        description: 'Brightloop Business (Brand: Odoo)',
        quantity: 1,
        unitPrice: 2000,
        variantAdjustment: 560,
      },
    ],
    discountCode: 'WELCOME10',
    validityDurationDays: 30,
    userId: 'usr-admin-1',
  });
  assert(!!quote.quotationNumber, `Generated quotation number: ${quote.quotationNumber}`);

  // Accept quotation
  db.prepare(`UPDATE quotations SET status = 'accepted' WHERE id = ?`).run(quote.quotationId);

  // Convert to subscription
  const subConversion = convertQuotationToSubscription(quote.quotationId, 'usr-admin-1');
  assert(!!subConversion.subscriptionNumber, `Converted to subscription: ${subConversion.subscriptionNumber}`);

  // Verify duplicate conversion is rejected
  let duplicatePrevented = false;
  try {
    convertQuotationToSubscription(quote.quotationId, 'usr-admin-1');
  } catch (err: any) {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Duplicate quotation conversion correctly prevented');

  // TEST 4: Subscription Policy Enforcement
  console.log('\n[Test 4] Plan Policy Enforcement (Pause / Early Cancellation)');
  // sub-2 is on plan-4 (Enterprise Annual) where early_closure_permitted = 0
  let earlyClosureRejected = false;
  try {
    transitionSubscriptionStatus('sub-2', 'cancelled', 'usr-admin-1');
  } catch (err: any) {
    earlyClosureRejected = true;
  }
  assert(earlyClosureRejected, 'Early cancellation rejected on non-permitted plan policy');

  // TEST 5: Automated Recurring Billing & Duplicate Prevention
  console.log('\n[Test 5] Automated Recurring Billing & Idempotency Duplicate Prevention');
  const initialRun = runRecurringBilling('test_runner');
  console.log(`  Initial billing run: processed ${initialRun.processed}, succeeded ${initialRun.succeeded}, skipped ${initialRun.skipped}`);

  // Run a second time immediately - MUST NOT create duplicate invoices for the same period!
  const secondRun = runRecurringBilling('test_runner');
  assert(secondRun.succeeded === 0, `Duplicate run created 0 invoices, skipped all duplicates (got ${secondRun.succeeded})`);

  // TEST 6: Payment Recording and Invoice Reconciliation
  console.log('\n[Test 6] Payment Recording & Allocation Transaction');
  // Find an invoice with outstanding balance
  const invToPay = db.prepare(`
    SELECT * FROM invoices WHERE status != 'paid' AND outstanding_amount > 100 LIMIT 1
  `).get() as any;

  if (invToPay) {
    const payAmount = 100;
    const initialOutstanding = invToPay.outstanding_amount;
    const payResult = recordPayment({
      invoiceId: invToPay.id,
      amount: payAmount,
      paymentMethod: 'upi',
      transactionReference: 'TEST-TXN-12345',
      userId: 'usr-admin-1',
    });

    assert(payResult.newOutstanding === initialOutstanding - payAmount, `Outstanding decremented by ${payAmount}`);
    assert(payResult.paymentNumber.startsWith('PAY-2026-'), `Generated payment number ${payResult.paymentNumber}`);
  }

  // TEST 7: Dashboard Aggregation Verification
  console.log('\n[Test 7] Database Dashboard KPIs Real Aggregation');
  const kpis = getDashboardKPIs();
  assert(kpis.activeSubscriptions > 0, `Active subscriptions > 0: ${kpis.activeSubscriptions}`);
  assert(kpis.mrr > 0, `MRR calculated: ₹${kpis.mrr}`);
  assert(kpis.cashCollected > 0, `Cash collected reconciled: ₹${kpis.cashCollected}`);

  console.log('\n=============================================');
  console.log(`TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
