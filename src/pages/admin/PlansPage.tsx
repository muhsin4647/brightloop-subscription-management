import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { SubscriptionPlan, Product } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { PurchasePlanModal } from '../../components/checkout/PurchasePlanModal.tsx';
import {
  Plus,
  Check,
  X,
  CreditCard,
  ShoppingBag,
  Zap,
  Search,
  Sparkles,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const PlansPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [freqFilter, setFreqFilter] = useState<'all' | 'monthly' | 'yearly' | 'weekly' | 'daily'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase modal
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<SubscriptionPlan | null>(null);

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

  // Filtered plans
  const filteredPlans = plans.filter((plan) => {
    const matchesFreq = freqFilter === 'all' || plan.billing_frequency === freqFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.product_name && plan.product_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFreq && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Plans &amp; Pricing</h1>
            <span className="text-xs text-slate-500 font-medium">· {plans.length} configured tiers</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Billing cycles, automated recurring terms, checkout gateways, and policy enforcement rules.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Subscription Plan
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Frequency Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Cadences' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'yearly', label: 'Yearly (Save 10%)' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'daily', label: 'Daily Micro' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFreqFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                freqFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search plans or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading subscription catalog...
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            No plans found matching current filter.
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const isPopular = plan.code === 'PLAN-BIZ-M' || plan.code === 'PLAN-BIZ-Y';
            return (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl bg-white transition-all flex flex-col justify-between relative group ${
                  isPopular
                    ? 'border-2 border-indigo-500 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/20'
                    : 'border border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Popular ribbon */}
                {isPopular && (
                  <div className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <div>
                  {/* Header info */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                      {plan.code}
                    </span>
                    <StatusBadge status={plan.status} size="sm" />
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg tracking-tight">{plan.name}</h3>
                  <div className="text-xs font-semibold text-indigo-600 mt-0.5">{plan.product_name}</div>
                  {plan.description && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[32px]">{plan.description}</p>
                  )}

                  {/* Price Block */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                      {formatCurrency(plan.plan_price)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase">/ {plan.billing_frequency}</span>
                  </div>

                  {/* Included Enterprise Capabilities */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Included Capabilities
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 text-xs">
                      <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Automated recurring invoice generation</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 text-xs">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Multiple pay windows (Scan QR, Card, Net Banking)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Integrated 18% GST tax &amp; commercial ledger</span>
                    </div>
                  </div>

                  {/* Enforced Policies Checklist */}
                  <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5 text-xs">
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

                {/* Card Actions: Purchase Now button + active stats */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Active Subscriptions:</span>
                    <span className="font-bold text-slate-900 font-mono">{plan.active_subscriptions_count || 0}</span>
                  </div>

                  {/* PRIMARY PURCHASE BUTTON */}
                  <button
                    onClick={() => setSelectedPlanForPurchase(plan)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Purchase Now</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MULTIPLE PAYMENT WINDOW CHECKOUT MODAL */}
      <PurchasePlanModal
        isOpen={!!selectedPlanForPurchase}
        onClose={() => setSelectedPlanForPurchase(null)}
        plan={selectedPlanForPurchase}
        onSuccess={() => {
          fetchPlans();
        }}
      />

      {/* Create Plan Modal (Admin) */}
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
