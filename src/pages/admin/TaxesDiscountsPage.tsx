import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { TaxRule, DiscountRule } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { Plus, Percent, Tag, Check, X, ShieldAlert } from 'lucide-react';

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
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Taxes &amp; Commercial Discounts</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Administrator-only statutory tax rates and promotional discount rules with usage limits.
        </p>
      </div>

      {/* Taxes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Configured Tax Rules</h2>
          </div>
          <button
            onClick={() => setShowTaxModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tax Rule
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Tax Name</th>
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4 text-center">Tax Rate (%)</th>
                <th className="py-2.5 px-4">Calculation Method</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{t.name}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-600">{t.code}</td>
                  <td className="py-2.5 px-4 text-center font-black text-indigo-700 text-sm">{t.rate}%</td>
                  <td className="py-2.5 px-4 text-slate-600 capitalize">{t.calculation_method.replace('_', ' ')}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleTax(t.id)}
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 underline"
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Promotional Discounts &amp; Coupons</h2>
          </div>
          <button
            onClick={() => setShowDiscModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Discount Rule
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Coupon Code</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-center">Discount Value</th>
                <th className="py-2.5 px-4">Min. Purchase</th>
                <th className="py-2.5 px-4 text-center">Usage Count</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">{d.code}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">{d.name}</td>
                  <td className="py-2.5 px-4 text-center font-black text-slate-900">
                    {d.discount_type === 'percentage' ? `${d.value}% Off` : formatCurrency(d.value)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{formatCurrency(d.min_purchase_amount)}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-slate-700">
                    {d.usage_count} {d.max_uses ? `/ ${d.max_uses}` : ''}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleDiscount(d.id)}
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 underline"
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
      <Modal isOpen={showTaxModal} onClose={() => setShowTaxModal(false)} title="Configure Tax Rule" maxWidth="max-w-sm">
        <form onSubmit={handleCreateTax} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Standard GST 18%"
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Code</label>
            <input
              type="text"
              required
              placeholder="GST-18"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage Rate (%)</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="18.0"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={() => setShowTaxModal(false)} className="px-3 py-1.5 text-xs rounded-lg text-slate-600">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg">
              Save Tax Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Discount Modal */}
      <Modal isOpen={showDiscModal} onClose={() => setShowDiscModal(false)} title="Create Discount Coupon" maxWidth="max-w-sm">
        <form onSubmit={handleCreateDiscount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Festive Discount"
              value={discName}
              onChange={(e) => setDiscName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code</label>
            <input
              type="text"
              required
              placeholder="FESTIVE25"
              value={discCode}
              onChange={(e) => setDiscCode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={discType}
                onChange={(e: any) => setDiscType(e.target.value)}
                className="w-full px-2 py-2 border rounded-lg text-xs bg-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
              <input
                type="number"
                step="0.1"
                required
                value={discVal}
                onChange={(e) => setDiscVal(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Order (₹)</label>
              <input
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={() => setShowDiscModal(false)} className="px-3 py-1.5 text-xs rounded-lg text-slate-600">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg">
              Create Coupon
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
