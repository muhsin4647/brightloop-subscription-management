import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { apiRequest, formatCurrency } from '../../lib/api.ts';
import { Customer, Product, SubscriptionPlan, ProductVariant, DiscountRule } from '../../types/index.ts';
import { Plus, Trash2, Tag, Percent } from 'lucide-react';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quotationId: string) => void;
}

export const CreateQuotationModal: React.FC<CreateQuotationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [discountCode, setDiscountCode] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 15');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');

  const [lines, setLines] = useState<
    Array<{
      productId: string;
      variantId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      variantAdjustment: number;
      variants: ProductVariant[];
    }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    try {
      const [cRes, pRes, prRes, dRes] = await Promise.all([
        apiRequest<{ customers: Customer[] }>('/customers?limit=100'),
        apiRequest<SubscriptionPlan[]>('/plans'),
        apiRequest<Product[]>('/products'),
        apiRequest<DiscountRule[]>('/discounts'),
      ]);

      setCustomers(cRes.customers || []);
      setPlans(pRes || []);
      setProducts(prRes || []);
      setDiscounts((dRes || []).filter((d) => d.is_active));

      if (cRes.customers?.length > 0 && !selectedCustomer) {
        setSelectedCustomer(cRes.customers[0].id);
      }
      if (pRes?.length > 0 && !selectedPlan) {
        setSelectedPlan(pRes[0].id);
      }

      // Add default product line
      if (prRes?.length > 0 && lines.length === 0) {
        loadProductLine(prRes[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadProductLine = async (productId: string) => {
    try {
      const pDetail = await apiRequest<{ product: Product; variants: ProductVariant[] }>(`/products/${productId}`);
      const prod = pDetail.product;
      const variants = pDetail.variants || [];
      const defaultVar = variants[0];

      setLines((prev) => [
        ...prev,
        {
          productId: prod.id,
          variantId: defaultVar ? defaultVar.id : undefined,
          description: `${prod.name}${defaultVar ? ` (${defaultVar.attribute_name}: ${defaultVar.option_name})` : ''}`,
          quantity: 1,
          unitPrice: prod.base_price,
          variantAdjustment: defaultVar ? defaultVar.price_adjustment : 0,
          variants,
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const updateLineVariant = (index: number, variantId: string) => {
    setLines((prev) => {
      const copy = [...prev];
      const line = copy[index];
      const v = line.variants.find((v) => v.id === variantId);
      if (v) {
        line.variantId = v.id;
        line.variantAdjustment = v.price_adjustment;
        const prodName = line.description.split(' (')[0];
        line.description = `${prodName} (${v.attribute_name}: ${v.option_name})`;
      }
      return copy;
    });
  };

  // Live calculation
  let subtotal = 0;
  for (const l of lines) {
    subtotal += (l.unitPrice + l.variantAdjustment) * l.quantity;
  }

  let discountAmount = 0;
  if (discountCode) {
    const dRule = discounts.find((d) => d.code === discountCode);
    if (dRule && subtotal >= dRule.min_purchase_amount) {
      discountAmount = dRule.discount_type === 'percentage' ? (subtotal * dRule.value) / 100 : Math.min(dRule.value, subtotal);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * 18) / 100;
  const grandTotal = taxableAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!selectedCustomer) throw new Error('Please select a customer.');
      if (!selectedPlan) throw new Error('Please select a subscription plan.');
      if (lines.length === 0) throw new Error('At least one product line is required.');

      const items = lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId || null,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        variantAdjustment: l.variantAdjustment,
      }));

      const res = await apiRequest('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer,
          planId: selectedPlan,
          items,
          discountCode: discountCode || undefined,
          validityDurationDays: validityDays,
          paymentTerms,
          notes,
        }),
      });

      onSuccess(res.quotationId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quotation creation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Commercial Quotation"
      subtitle="Configure products, brand variants, applicable discounts, and taxes"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Account *</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden cursor-pointer"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan Cadence *</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden cursor-pointer"
            >
              <option value="">Select plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.billing_frequency.toUpperCase()}) - {formatCurrency(p.plan_price)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Itemized Lines */}
        <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product &amp; Variant Lines</span>
            <button
              type="button"
              onClick={() => products.length > 0 && loadProductLine(products[0].id)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product Line</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs">
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Product</label>
                  <select
                    value={line.productId}
                    onChange={(e) => {
                      const copy = [...lines];
                      copy.splice(idx, 1);
                      setLines(copy);
                      loadProductLine(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.base_price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Brand / Variant Option</label>
                  {line.variants && line.variants.length > 0 ? (
                    <select
                      value={line.variantId || ''}
                      onChange={(e) => updateLineVariant(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                    >
                      {line.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.option_name} (+{formatCurrency(v.price_adjustment)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-400 text-xs italic block py-1.5">Standard (No variants)</span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value || '1', 10));
                      setLines((prev) => {
                        const copy = [...prev];
                        copy[idx].quantity = val;
                        return copy;
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden tabular-nums"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between pl-2">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Total</div>
                    <div className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency((line.unitPrice + line.variantAdjustment) * line.quantity)}
                    </div>
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commercial Options & Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Coupon</label>
            <select
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden cursor-pointer"
            >
              <option value="">No Discount</option>
              {discounts.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code} ({d.discount_type === 'percentage' ? `${d.value}% Off` : `Flat ₹${d.value}`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden cursor-pointer"
            >
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 7">Net 7 Days</option>
              <option value="Due on Receipt">Due on Receipt</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Proposal Validity</label>
            <select
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden cursor-pointer"
            >
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
              <option value={45}>45 Days</option>
              <option value={60}>60 Days</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="text-slate-400 font-mono tabular-nums">Subtotal: {formatCurrency(subtotal)}</div>
            {discountAmount > 0 && (
              <div className="text-emerald-400 font-mono tabular-nums">Discount: -{formatCurrency(discountAmount)}</div>
            )}
            <div className="text-slate-400 font-mono tabular-nums">Tax (GST 18%): {formatCurrency(taxAmount)}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Total Quotation Value</span>
            <span className="text-xl font-bold text-white font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Generating Quotation...' : 'Generate Quotation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
