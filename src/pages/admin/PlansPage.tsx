import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { SubscriptionPlan, Product } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Plus, Check, X, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const PlansPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Create plan modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [planPrice, setPlanPrice] = useState('');
  const [pausePermitted, setPausePermitted] = useState(true);
  const [earlyClosurePermitted, setEarlyClosurePermitted] = useState(true);
  const [renewalPermitted, setRenewalPermitted] = useState(true);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const [pRes, prRes] = await Promise.all([
        apiRequest<SubscriptionPlan[]>('/plans'),
        apiRequest<Product[]>('/products'),
      ]);
      setPlans(pRes || []);
      setProducts(prRes || []);
      if (prRes?.length > 0 && !productId) {
        setProductId(prRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/plans', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          billing_frequency: frequency,
          plan_price: parseFloat(planPrice),
          pause_permitted: pausePermitted,
          early_closure_permitted: earlyClosurePermitted,
          renewal_permitted: renewalPermitted,
          auto_close_enabled: autoCloseEnabled,
        }),
      });

      setShowCreateModal(false);
      setName('');
      setCode('');
      setDescription('');
      setPlanPrice('');
      fetchPlans();
    } catch (err: any) {
      setError(err.message || 'Failed to create plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Plans &amp; Policies</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Billing frequencies, renewal terms, and operational policy rules enforced by the backend engine.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Subscription Plan
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading subscription plans...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">No plans configured yet.</div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {plan.code}
                  </span>
                  <StatusBadge status={plan.status} size="sm" />
                </div>

                <h3 className="font-bold text-slate-900 text-base">{plan.name}</h3>
                <div className="text-xs font-semibold text-indigo-600 mt-0.5">{plan.product_name}</div>
                {plan.description && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{plan.description}</p>}

                {/* Price Display */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(plan.plan_price)}</span>
                  <span className="text-xs font-bold text-slate-500 uppercase">/ {plan.billing_frequency}</span>
                </div>

                {/* Enforced Policies Checklist */}
                <div className="mt-4 p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Enforced Plan Policies
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Customer Pause Permitted</span>
                    {plan.pause_permitted ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Yes
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                        <X className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Early Cancellation Allowed</span>
                    {plan.early_closure_permitted ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Yes
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                        <X className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Manual Renewal Allowed</span>
                    {plan.renewal_permitted ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Yes
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                        <X className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Auto-Close on Expiry</span>
                    {plan.auto_close_enabled ? (
                      <span className="text-indigo-700 font-bold flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-indigo-600" /> Enabled
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                        <X className="w-3.5 h-3.5" /> Disabled
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Active Subscriptions:</span>
                <span className="font-bold text-slate-900">{plan.active_subscriptions_count || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Subscription Plan"
        subtitle="Configure billing cycle frequency and operational rules"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
              <input
                type="text"
                required
                placeholder="Business Monthly"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Code</label>
              <input
                type="text"
                required
                placeholder="PLAN-BIZ-M"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Frequency</label>
              <select
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recurring Plan Price (INR)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="2000"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Description</label>
            <textarea
              rows={2}
              placeholder="Terms and features of this plan tier..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Policy Toggles */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <span className="font-semibold text-slate-800 block text-xs">Lifecycle Policy Rules:</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pausePermitted}
                onChange={(e) => setPausePermitted(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Allow Customer to Pause Subscription</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={earlyClosurePermitted}
                onChange={(e) => setEarlyClosurePermitted(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Allow Early Cancellation</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={renewalPermitted}
                onChange={(e) => setRenewalPermitted(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Allow Manual Renewal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCloseEnabled}
                onChange={(e) => setAutoCloseEnabled(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Auto-Close on Expiry Date</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Subscription Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
