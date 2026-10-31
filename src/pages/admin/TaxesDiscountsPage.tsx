import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { TaxRule, DiscountRule } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import {
  Plus,
  Percent,
  Tag,
  Check,
  X,
  ShieldCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';

export const TaxesDiscountsPage: React.FC = () => {
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);

  // New Tax Form
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxName, setTaxName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [taxRate, setTaxRate] = useState('18');

  // New Discount Form
  const [showDiscModal, setShowDiscModal] = useState(false);
  const [discName, setDiscName] = useState('');
  const [discCode, setDiscCode] = useState('');
  const [discType, setDiscType] = useState<'percentage' | 'fixed'>('percentage');
  const [discVal, setDiscVal] = useState('10');
  const [minPurchase, setMinPurchase] = useState('1000');
  const [maxUses, setMaxUses] = useState('100');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, dRes] = await Promise.all([
        apiRequest<TaxRule[]>('/taxes'),
        apiRequest<DiscountRule[]>('/discounts'),
      ]);
      setTaxes(tRes || []);
      setDiscounts(dRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/taxes', {
        method: 'POST',
        body: JSON.stringify({
          name: taxName.trim(),
          code: taxCode.trim().toUpperCase(),
          rate: parseFloat(taxRate),
          calculation_method: 'after_discount',
        }),
      });
      setShowTaxModal(false);
      setTaxName('');
      setTaxCode('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleTax = async (id: string) => {
    try {
      await apiRequest(`/taxes/${id}/toggle`, { method: 'PATCH' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/discounts', {
        method: 'POST',
        body: JSON.stringify({
          name: discName.trim(),
          code: discCode.trim().toUpperCase(),
          discount_type: discType,
          value: parseFloat(discVal),
          min_purchase_amount: parseFloat(minPurchase || '0'),
          max_uses: maxUses ? parseInt(maxUses, 10) : undefined,
        }),
      });
      setShowDiscModal(false);
      setDiscName('');
      setDiscCode('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleDiscount = async (id: string) => {
    try {
      await apiRequest(`/discounts/${id}/toggle`, { method: 'PATCH' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Taxes &amp; Commercial Discount Policies</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administrator-only statutory tax rates, GST compliance rules, and promotional coupons with usage limits.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Statutory Tax Rules</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {taxes.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Applied after commercial discounts</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Active Coupons</span>
            <Tag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {discounts.filter((d) => d.is_active).length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Public &amp; checkout vouchers</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>GST Compliance</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            Standard 18% GST
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Itemized on all official tax invoices</p>
        </div>
      </div>

      {/* Taxes Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Configured Tax Rules</h2>
          </div>
          <button
            onClick={() => setShowTaxModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tax Rule</span>
          </button>
        </div>

        <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Tax Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-center">Tax Rate (%)</th>
                <th className="py-3 px-4">Calculation Method</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{t.name}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[11px]">
                      {t.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700 text-sm tabular-nums">
                    {t.rate}%
                  </td>
                  <td className="py-3 px-4 text-slate-600 capitalize">{t.calculation_method.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        t.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : 'bg-slate-100 text-slate-400 border-slate-200/60'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{t.is_active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleTax(t.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discounts Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Promotional Discounts &amp; Coupons</h2>
          </div>
          <button
            onClick={() => setShowDiscModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Discount Rule</span>
          </button>
        </div>

        <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Discount Value</th>
                <th className="py-3 px-4">Min. Purchase</th>
                <th className="py-3 px-4 text-center">Usage Count</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200/80 text-[11px]">
                      {d.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{d.name}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 tabular-nums">
                    {d.discount_type === 'percentage' ? `${d.value}% Off` : formatCurrency(d.value)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">{formatCurrency(d.min_purchase_amount)}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 tabular-nums">
                    {d.usage_count} {d.max_uses ? `/ ${d.max_uses}` : ''}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        d.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : 'bg-slate-100 text-slate-400 border-slate-200/60'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{d.is_active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleDiscount(d.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {d.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tax Modal */}
      <Modal isOpen={showTaxModal} onClose={() => setShowTaxModal(false)} title="Configure Tax Rule" subtitle="Set statutory tax percentage" maxWidth="max-w-sm">
        <form onSubmit={handleCreateTax} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Standard GST 18%"
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Code *</label>
            <input
              type="text"
              required
              placeholder="GST-18"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono uppercase bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage Rate (%) *</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="18.0"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono font-bold bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setShowTaxModal(false)} className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs shadow-indigo-600/30 transition-all cursor-pointer">
              Save Tax Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Discount Modal */}
      <Modal isOpen={showDiscModal} onClose={() => setShowDiscModal(false)} title="Create Discount Coupon" subtitle="Configure voucher rules and purchase limits" maxWidth="max-w-sm">
        <form onSubmit={handleCreateDiscount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise Welcome Offer"
              value={discName}
              onChange={(e) => setDiscName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code *</label>
            <input
              type="text"
              required
              placeholder="WELCOME20"
              value={discCode}
              onChange={(e) => setDiscCode(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono uppercase bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={discType}
                onChange={(e: any) => setDiscType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden cursor-pointer"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Value *</label>
              <input
                type="number"
                step="0.1"
                required
                value={discVal}
                onChange={(e) => setDiscVal(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono font-bold bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Order (INR)</label>
              <input
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setShowDiscModal(false)} className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs shadow-indigo-600/30 transition-all cursor-pointer">
              Create Coupon
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
