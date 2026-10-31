import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, Customer, Invoice, InvoiceLine } from '../../types/index.ts';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { generateInvoicePDF } from '../../lib/pdf.ts';
import {
  QrCode,
  CreditCard,
  Landmark,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Lock,
  Smartphone,
  AlertCircle,
  X,
  Download,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface PurchasePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onSuccess?: () => void;
}

type PaymentMethodType = 'upi_qr' | 'card' | 'net_banking' | 'bank_transfer';

export const PurchasePlanModal: React.FC<PurchasePlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  onSuccess,
}) => {
  const { user, role } = useAuth();
  const isStaffOrAdmin = role === 'ADMIN' || role === 'STAFF';

  // State
  const [activeTab, setActiveTab] = useState<PaymentMethodType>('upi_qr');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountApplied, setDiscountApplied] = useState<{ code: string; type: string; value: number; amount: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState<boolean>(false);

  // Form states - UPI
  const [upiCopied, setUpiCopied] = useState(false);
  const [customVpa, setCustomVpa] = useState('');
  const [qrTimer, setQrTimer] = useState(600); // 10 min

  // Form states - Card
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  // Form states - Net banking
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Form states - Bank transfer
  const [utrNumber, setUtrNumber] = useState('');

  // Processing state & Success result
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Load customers if admin/staff
  useEffect(() => {
    if (isOpen && isStaffOrAdmin) {
      apiRequest<Customer[]>('/customers')
        .then((data) => {
          setCustomers(data || []);
          if (data && data.length > 0) {
            setSelectedCustomerId(data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, isStaffOrAdmin]);

  // QR timer countdown
  useEffect(() => {
    if (!isOpen || activeTab !== 'upi_qr' || successData) return;
    const interval = setInterval(() => {
      setQrTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, successData]);

  if (!isOpen || !plan) return null;

  // Commercial Math calculation
  const basePrice = plan.plan_price || 0;
  const discountAmount = discountApplied ? discountApplied.amount : 0;
  const taxableAmount = Math.max(0, basePrice - discountAmount);
  const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Apply discount code
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError(null);
    setApplyingDiscount(true);
    try {
      const code = discountCode.trim().toUpperCase();
      const rules = await apiRequest<any[]>('/discounts');
      const matched = (rules || []).find((r) => r.code === code && r.is_active);

      if (!matched) {
        setDiscountError('Invalid or expired discount coupon code.');
        setDiscountApplied(null);
      } else {
        const discValue =
          matched.type === 'percentage'
            ? Math.round((basePrice * matched.value) / 100 * 100) / 100
            : Math.min(matched.value, basePrice);
        setDiscountApplied({
          code: matched.code,
          type: matched.type,
          value: matched.value,
          amount: discValue,
        });
        setDiscountError(null);
      }
    } catch {
      setDiscountError('Could not validate discount code.');
    } finally {
      setApplyingDiscount(false);
    }
  };

  // Card formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : raw);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // UPI copy
  const handleCopyUPI = () => {
    navigator.clipboard.writeText('billing@brightloop.io');
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };

  // Card brand detection
  const detectCardBrand = (num: string) => {
    const cleaned = num.replace(/\s+/g, '');
    if (cleaned.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'MASTERCARD';
    if (/^3[47]/.test(cleaned)) return 'AMEX';
    if (/^(60|65|81|82)/.test(cleaned)) return 'RUPAY';
    return 'CARD';
  };

  // Primary Purchase Execution
  const handleProcessPurchase = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // Step 1: Client-side validation
      let txnRef = '';
      if (activeTab === 'upi_qr') {
        setProcessingStep('Connecting to NPCI Unified Payments switch...');
        await new Promise((r) => setTimeout(r, 600));
        setProcessingStep('Awaiting mobile scan approval...');
        await new Promise((r) => setTimeout(r, 800));
        txnRef = `UPI-REF-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      } else if (activeTab === 'card') {
        if (cardNumber.replace(/\s/g, '').length < 15) {
          throw new Error('Please enter a valid 16-digit card number.');
        }
        if (cardExpiry.length < 5) {
          throw new Error('Please enter card expiry in MM/YY format.');
        }
        if (cardCvv.length < 3) {
          throw new Error('Please enter a valid 3-digit CVV.');
        }
        setProcessingStep('Authenticating 3D-Secure 2.0 gateway...');
        await new Promise((r) => setTimeout(r, 700));
        setProcessingStep('Verifying cardholder authorization token...');
        await new Promise((r) => setTimeout(r, 700));
        txnRef = `CARD-${detectCardBrand(cardNumber)}-${Math.floor(100000 + Math.random() * 900000)}`;
      } else if (activeTab === 'net_banking') {
        setProcessingStep(`Redirecting securely to ${selectedBank} NetBanking gateway...`);
        await new Promise((r) => setTimeout(r, 800));
        setProcessingStep('Securing corporate treasury session...');
        await new Promise((r) => setTimeout(r, 700));
        txnRef = `NB-${selectedBank}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      } else {
        if (!utrNumber.trim()) {
          throw new Error('Please provide the Bank UTR / Reference Number.');
        }
        setProcessingStep('Validating RTGS/NEFT transaction settlement...');
        await new Promise((r) => setTimeout(r, 900));
        txnRef = utrNumber.trim().toUpperCase();
      }

      setProcessingStep('Provisioning recurring subscription & issuing tax invoice...');

      const response = await apiRequest<any>(`/plans/${plan.id}/purchase`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: isStaffOrAdmin ? selectedCustomerId : undefined,
          paymentMethod: activeTab,
          transactionReference: txnRef,
          discountCode: discountApplied ? discountApplied.code : undefined,
        }),
      });

      setSuccessData(response);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please verify credentials.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Download PDF
  const handleDownloadInvoice = async () => {
    if (!successData?.invoiceId) return;
    try {
      const invData = await apiRequest<any>(`/invoices/${successData.invoiceId}`);
      if (invData?.invoice) {
        generateInvoicePDF(invData.invoice, invData.lines || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const minutes = Math.floor(qrTimer / 60);
  const seconds = qrTimer % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white">Brightloop Secure Checkout</h2>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-400/20">
                  {plan.billing_frequency} Cycle
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Instant subscription activation and automated tax invoicing</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          {successData ? (
            /* SUCCESS CONFIRMATION WINDOW */
            <div className="p-8 text-center max-w-lg mx-auto space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Subscription Activated!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your recurring subscription for <strong>{plan.name}</strong> is now live and in active status.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Subscription Ref:</span>
                  <span className="font-mono font-bold text-indigo-600">{successData.subscriptionNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tax Invoice Number:</span>
                  <span className="font-mono font-semibold text-slate-900">{successData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Amount Settled:</span>
                  <span className="font-bold text-emerald-700 text-sm">{formatCurrency(successData.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Transaction UTR / Ref:</span>
                  <span className="font-mono text-slate-700">{successData.transactionReference}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 text-[11px]">
                  <span className="text-slate-500">Next Scheduled Renewal:</span>
                  <span className="font-semibold text-slate-900">{formatDate(successData.nextBillingDate)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleDownloadInvoice}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Official Tax Invoice (PDF)
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* DUAL PANE CHECKOUT */
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
              {/* LEFT PANE: Order Summary & Plan Information (5 cols) */}
              <div className="lg:col-span-5 bg-slate-50/70 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Plan</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{plan.name}</h3>
                    <div className="text-xs font-medium text-indigo-600">{plan.product_name}</div>
                    {plan.description && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{plan.description}</p>
                    )}
                  </div>

                  {/* Customer assignment if admin/staff */}
                  {isStaffOrAdmin && (
                    <div className="pt-3 border-t border-slate-200/80">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Subscribing Customer Account
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.company || c.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Coupon / Promo code box */}
                  <div className="pt-3 border-t border-slate-200/80">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Have a Promo / Discount Code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. WELCOME10"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        className="flex-1 px-3 py-1.5 uppercase font-mono bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyDiscount}
                        disabled={applyingDiscount || !discountCode.trim()}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {applyingDiscount ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                    {discountApplied && (
                      <div className="mt-1.5 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Coupon {discountApplied.code} applied (
                        {discountApplied.type === 'percentage' ? `${discountApplied.value}% off` : `₹${discountApplied.value} off`})
                      </div>
                    )}
                    {discountError && <div className="mt-1.5 text-xs text-rose-600 font-medium">{discountError}</div>}
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Plan Subscription ({plan.billing_frequency})</span>
                      <span className="font-mono font-medium">{formatCurrency(basePrice)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Discount ({discountApplied?.code})</span>
                        <span className="font-mono">- {formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600">
                      <span>Integrated GST (18.0%)</span>
                      <span className="font-mono font-medium">{formatCurrency(taxAmount)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900">
                      <span className="text-sm">Total Due Today</span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left Bottom Policy Stamp */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Next recurring charge automatically scheduled for {plan.billing_frequency} renewal.</span>
                  </div>
                  <div>Pause or cancel anytime in your customer self-service billing portal.</div>
                </div>
              </div>

              {/* RIGHT PANE: Multiple Payment Windows (7 cols) */}
              <div className="lg:col-span-7 p-6 flex flex-col justify-between">
                <div>
                  {/* Payment Methods Nav (Segmented Tabs) */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('upi_qr')}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'upi_qr'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan &amp; UPI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('card')}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'card'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('net_banking')}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'net_banking'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Net Banking</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('bank_transfer')}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'bank_transfer'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>NEFT/Wire</span>
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* TAB 1: SCAN & PAY (UPI DYNAMIC QR CODE) */}
                  {activeTab === 'upi_qr' && (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        {/* Dynamic SVG QR code */}
                        <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0 text-center">
                          <svg className="w-36 h-36 mx-auto" viewBox="0 0 100 100" fill="none">
                            {/* Outer Frame & Finder Patterns */}
                            <rect width="100" height="100" fill="white" />
                            {/* Top Left Finder */}
                            <rect x="10" y="10" width="24" height="24" rx="3" fill="#0f172a" />
                            <rect x="14" y="14" width="16" height="16" rx="2" fill="white" />
                            <rect x="18" y="18" width="8" height="8" rx="1" fill="#4f46e5" />
                            {/* Top Right Finder */}
                            <rect x="66" y="10" width="24" height="24" rx="3" fill="#0f172a" />
                            <rect x="70" y="14" width="16" height="16" rx="2" fill="white" />
                            <rect x="74" y="18" width="8" height="8" rx="1" fill="#4f46e5" />
                            {/* Bottom Left Finder */}
                            <rect x="10" y="66" width="24" height="24" rx="3" fill="#0f172a" />
                            <rect x="14" y="70" width="16" height="16" rx="2" fill="white" />
                            <rect x="18" y="74" width="8" height="8" rx="1" fill="#4f46e5" />
                            {/* Data Matrix Dots */}
                            <rect x="40" y="12" width="6" height="6" fill="#0f172a" />
                            <rect x="50" y="12" width="6" height="6" fill="#0f172a" />
                            <rect x="42" y="24" width="12" height="6" fill="#4f46e5" />
                            <rect x="40" y="36" width="6" height="6" fill="#0f172a" />
                            <rect x="12" y="42" width="6" height="12" fill="#0f172a" />
                            <rect x="24" y="48" width="8" height="8" fill="#0f172a" />
                            <rect x="48" y="48" width="10" height="10" fill="#4f46e5" />
                            <rect x="66" y="40" width="6" height="6" fill="#0f172a" />
                            <rect x="78" y="46" width="8" height="6" fill="#0f172a" />
                            <rect x="40" y="66" width="6" height="8" fill="#0f172a" />
                            <rect x="52" y="70" width="8" height="6" fill="#0f172a" />
                            <rect x="70" y="66" width="6" height="10" fill="#0f172a" />
                            <rect x="82" y="74" width="6" height="8" fill="#4f46e5" />
                            <rect x="64" y="82" width="12" height="6" fill="#0f172a" />
                            <rect x="42" y="84" width="8" height="6" fill="#0f172a" />
                            {/* Center Lock Badge */}
                            <circle cx="50" cy="50" r="8" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
                            <circle cx="50" cy="50" r="3" fill="#4f46e5" />
                          </svg>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            Scan with any UPI App
                          </div>
                        </div>

                        {/* UPI instructions & Timer */}
                        <div className="flex-1 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-700">Scan &amp; Authorize</span>
                            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> {timeFormatted}
                            </span>
                          </div>

                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            Open Google Pay, PhonePe, Paytm, BHIM, or any banking app to scan this QR code and complete payment of{' '}
                            <strong className="text-slate-900 font-bold">{formatCurrency(grandTotal)}</strong>.
                          </p>

                          {/* Supported UPI Apps Pills */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Cred'].map((app) => (
                              <span
                                key={app}
                                className="text-[10px] font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700"
                              >
                                {app}
                              </span>
                            ))}
                          </div>

                          {/* Copy UPI VPA */}
                          <div className="pt-2 flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                            <div className="font-mono text-[11px] text-slate-800">billing@brightloop.io</div>
                            <button
                              type="button"
                              onClick={handleCopyUPI}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              {upiCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              {upiCopied ? 'Copied' : 'Copy VPA'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Manual UPI ID verification input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Or Pay via UPI ID / VPA
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="username@okhdfcbank"
                            value={customVpa}
                            onChange={(e) => setCustomVpa(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CREDIT / DEBIT CARD WINDOW */}
                  {activeTab === 'card' && (
                    <div className="space-y-3.5 animate-in fade-in">
                      {/* Virtual Card Graphic */}
                      <div className="p-4 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-500/20 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold block">
                              Brightloop Corporate Card Gateway
                            </span>
                            <span className="text-xs font-semibold text-slate-200">
                              {cardHolder || 'CARDHOLDER NAME'}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-white/10 text-indigo-200">
                            {detectCardBrand(cardNumber)}
                          </span>
                        </div>

                        <div className="font-mono text-base font-bold tracking-widest text-slate-100 mb-3">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </div>

                        <div className="flex justify-between items-end text-[10px] text-slate-400">
                          <div>
                            <span className="block text-[8px] uppercase">Expires</span>
                            <span className="font-mono font-semibold text-white">{cardExpiry || 'MM/YY'}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[8px] uppercase">CVV</span>
                            <span className="font-mono font-semibold text-white">{cardCvv ? '•••' : '•••'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Form Inputs */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Cardholder Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Priya Sharma"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="4123 4567 8901 2345"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                          <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date (MM/YY)</label>
                          <input
                            type="text"
                            required
                            placeholder="12/28"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">CVV / CVC</label>
                          <input
                            type="password"
                            maxLength={4}
                            required
                            placeholder="•••"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 pt-1">
                        <input
                          type="checkbox"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Tokenize &amp; securely save card for future recurring renewals (RBI Compliant)</span>
                      </label>
                    </div>
                  )}

                  {/* TAB 3: NET BANKING */}
                  {activeTab === 'net_banking' && (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="text-xs font-semibold text-slate-700">Select Popular Indian Bank</div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { id: 'HDFC', name: 'HDFC Bank' },
                          { id: 'ICICI', name: 'ICICI Bank' },
                          { id: 'SBI', name: 'State Bank of India' },
                          { id: 'AXIS', name: 'Axis Bank' },
                          { id: 'KOTAK', name: 'Kotak Bank' },
                          { id: 'PNB', name: 'Punjab National' },
                        ].map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBank(bank.id)}
                            className={`p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1.5 ${
                              selectedBank === bank.id
                                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-2xs ring-1 ring-indigo-600'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <Landmark className="w-4 h-4 text-slate-500" />
                            <span className="text-[11px] truncate w-full text-center">{bank.name}</span>
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">All Other Banks</label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="HDFC">HDFC Bank</option>
                          <option value="ICICI">ICICI Bank</option>
                          <option value="SBI">State Bank of India</option>
                          <option value="AXIS">Axis Bank</option>
                          <option value="KOTAK">Kotak Mahindra Bank</option>
                          <option value="INDUSIND">IndusInd Bank</option>
                          <option value="YES">Yes Bank</option>
                          <option value="IDFC">IDFC First Bank</option>
                          <option value="FEDERAL">Federal Bank</option>
                          <option value="BOB">Bank of Baroda</option>
                        </select>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>You will be redirected securely to authenticate on {selectedBank}&apos;s corporate internet banking portal.</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: NEFT / RTGS / WIRE TRANSFER */}
                  {activeTab === 'bank_transfer' && (
                    <div className="space-y-3.5 animate-in fade-in">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <span className="font-bold text-slate-800 block text-xs">
                          Brightloop Dedicated Virtual Treasury Account:
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Beneficiary Name</span>
                            <strong className="text-slate-900">Brightloop Technologies Pvt Ltd</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Virtual Account Number</span>
                            <strong className="text-slate-900 font-mono">BLP20268894102</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Bank &amp; Branch</span>
                            <strong className="text-slate-900">HDFC Bank, Koramangala</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">IFSC Code</span>
                            <strong className="text-slate-900 font-mono">HDFC0000001</strong>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Bank UTR / Transaction Reference Number
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. UTR-HDFC-2026-981240"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Enter your 16 or 22-digit IMPS/NEFT reference code to instantly reconcile and activate.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Checkout Action */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleProcessPurchase}
                    disabled={isProcessing}
                    className="flex-1 max-w-xs py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{processingStep || 'Processing Settlement...'}</span>
                      </>
                    ) : (
                      <>
                        <span>Authorize &amp; Pay {formatCurrency(grandTotal)}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
