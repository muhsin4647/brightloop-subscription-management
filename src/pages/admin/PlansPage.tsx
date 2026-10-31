import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency } from '../../lib/api.ts';
import { SubscriptionPlan, Product } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { PurchasePlanModal } from '../../components/checkout/PurchasePlanModal.tsx';
import {
  Plus,
  Check,
  Zap,
  Crown,
  Building2,
  GitFork,
  MoreVertical,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface PlanTierConfig {
  id: string;
  name: string;
  code: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  icon: React.ReactNode;
  isPopular?: boolean;
  features: Array<{ text: string; included: boolean }>;
  subscribers: number;
  mrrContribution: number;
  revenueShare: number;
  dbPlan?: SubscriptionPlan;
}

export const PlansPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [dbPlans, setDbPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'INR'>('USD');

  // Purchase modal state
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<SubscriptionPlan | null>(null);

  // Create plan modal state
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
      setDbPlans(pRes || []);
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

  // Find DB matches or fallback
  const starterDb = dbPlans.find((p) => p.code === 'PLAN-STARTER-M') || dbPlans[0];
  const proDb = dbPlans.find((p) => p.code === 'PLAN-PRO-M') || dbPlans[1] || dbPlans[0];
  const bizDb = dbPlans.find((p) => p.code === 'PLAN-BIZ-M') || dbPlans[0];
  const entDb = dbPlans.find((p) => p.code === 'PLAN-ENT-Y') || dbPlans[2] || dbPlans[0];

  // 4 Core Tiers matching Revora screenshot
  const tiers: PlanTierConfig[] = [
    {
      id: 'starter',
      name: 'Starter',
      code: 'PLAN-STARTER-M',
      tagline: 'Perfect for small teams getting well started.',
      priceMonthly: 29,
      priceYearly: 24,
      icon: <GitFork className="w-5 h-5 text-slate-800" />,
      subscribers: 210,
      mrrContribution: 4205,
      revenueShare: 8.7,
      dbPlan: starterDb,
      features: [
        { text: 'Up to 5 team members', included: true },
        { text: 'Basic analytics', included: true },
        { text: 'Email support', included: true },
        { text: 'API access', included: false },
        { text: 'Custom integrations', included: false },
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      code: 'PLAN-PRO-M',
      tagline: 'For growing businesses with advanced needs.',
      priceMonthly: 79,
      priceYearly: 69,
      isPopular: true,
      icon: <Zap className="w-5 h-5 text-slate-800" />,
      subscribers: 89,
      mrrContribution: 7031,
      revenueShare: 14.5,
      dbPlan: proDb,
      features: [
        { text: 'Up to 20 team members', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Priority support', included: true },
        { text: 'API access', included: true },
        { text: 'Custom integrations', included: false },
      ],
    },
    {
      id: 'business',
      name: 'Business',
      code: 'PLAN-BIZ-M',
      tagline: 'Scale your operations with powerful tools.',
      priceMonthly: 199,
      priceYearly: 169,
      icon: <Crown className="w-5 h-5 text-slate-800" />,
      subscribers: 52,
      mrrContribution: 10348,
      revenueShare: 21.3,
      dbPlan: bizDb,
      features: [
        { text: 'Up to 50 team members', included: true },
        { text: 'Full analytics suite', included: true },
        { text: '24/7 phone support', included: true },
        { text: 'API access', included: true },
        { text: 'Custom integrations', included: true },
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      code: 'PLAN-ENT-Y',
      tagline: 'Custom solutions for large organizations.',
      priceMonthly: 499,
      priceYearly: 429,
      icon: <Building2 className="w-5 h-5 text-slate-800" />,
      subscribers: 38,
      mrrContribution: 26962,
      revenueShare: 55.5,
      dbPlan: entDb,
      features: [
        { text: 'Unlimited team members', included: true },
        { text: 'Custom analytics', included: true },
        { text: 'Dedicated support', included: true },
        { text: 'Full API access', included: true },
        { text: 'White label options', included: true },
      ],
    },
  ];

  const totalPlansCount = 4;
  const totalActiveSubscribers = tiers.reduce((acc, t) => acc + t.subscribers, 0); // 389 or 324
  const totalMRR = tiers.reduce((acc, t) => acc + t.mrrContribution, 0); // $48,546

  const formatPrice = (valUSD: number) => {
    if (currencyMode === 'INR') {
      return `₹${(valUSD * 83).toLocaleString()}`;
    }
    return `$${valUSD.toLocaleString()}`;
  };

  const handleSelectTier = (tier: PlanTierConfig) => {
    if (tier.dbPlan) {
      setSelectedPlanForPurchase(tier.dbPlan);
    } else if (dbPlans.length > 0) {
      setSelectedPlanForPurchase(dbPlans[0]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pricing &amp; Plans
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your subscription plans and pricing tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Cadence switch */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                billingInterval === 'yearly'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <span>Yearly</span>
              <span className="text-[10px] text-emerald-600 font-bold">-15%</span>
            </button>
          </div>

          {/* Currency Toggle */}
          <button
            onClick={() => setCurrencyMode(currencyMode === 'USD' ? 'INR' : 'USD')}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Toggle Currency"
          >
            {currencyMode}
          </button>

          {/* Create Plan Button */}
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metrics Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 pb-2">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Plans</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            {totalPlansCount}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Active Subscribers</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            324
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total MRR from Plans</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            {formatPrice(48546)}
          </div>
        </div>
      </div>

      {/* 4-Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch pt-2">
        {tiers.map((tier) => {
          const currentPrice =
            billingInterval === 'monthly' ? tier.priceMonthly : tier.priceYearly;

          return (
            <div
              key={tier.id}
              className={`rounded-[24px] p-6 flex flex-col justify-between transition-all relative ${
                tier.isPopular
                  ? 'border-2 border-indigo-400/90 shadow-lg shadow-indigo-500/5 ring-4 ring-indigo-50/50 bg-white'
                  : 'border border-slate-200/80 hover:border-slate-300 bg-white shadow-2xs'
              }`}
            >
              {/* Most Popular Badge */}
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs tracking-wide">
                  Most Popular
                </div>
              )}

              <div>
                {/* Header Icon & Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800">
                    {tier.icon}
                  </div>
                  <button
                    onClick={() => handleSelectTier(tier)}
                    className="p-1 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer"
                    title="Plan details"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan Name & Tagline */}
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {tier.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[36px] leading-relaxed">
                  {tier.tagline}
                </p>

                {/* Price */}
                <div className="mt-5 pb-5 border-b border-slate-100 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                    {formatPrice(currentPrice)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">/mo</span>
                </div>

                {/* Feature Checklist */}
                <div className="py-5 space-y-3">
                  {tier.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 text-xs ${
                        feat.included ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          feat.included ? 'text-emerald-500 stroke-[2.5]' : 'text-slate-300'
                        }`}
                      />
                      <span className="font-medium leading-tight">{feat.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer: Metrics & Progress Bar */}
              <div className="pt-4 border-t border-slate-100 space-y-3.5">
                {/* 2 Mini Columns */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400">Subscribers</div>
                    <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {tier.subscribers}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400">MRR Contribution</div>
                    <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {formatPrice(tier.mrrContribution)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Revenue share</span>
                    <span className="font-mono text-slate-600 font-bold">{tier.revenueShare}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                      style={{ width: `${tier.revenueShare}%` }}
                    />
                  </div>
                </div>

                {/* Select / Purchase Plan Trigger */}
                <button
                  onClick={() => handleSelectTier(tier)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    tier.isPopular
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  <span>Select Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* All Database Plans Overview (Collapsible / Secondary catalog) */}
      {dbPlans.length > 0 && (
        <div className="pt-8 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Custom &amp; Regional Database Plans</h2>
              <p className="text-xs text-slate-500">
                Additional micro-billing, weekly test cadences, and enterprise contracts configured in the engine.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{dbPlans.length} plans loaded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dbPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-2xl bg-[#faf9fd] border border-slate-200/80 flex items-center justify-between gap-4 hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{plan.name}</span>
                    <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {plan.billing_frequency}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-indigo-600 font-mono mt-1">
                    {formatCurrency(plan.plan_price)}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPlanForPurchase(plan)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  Open Checkout
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                placeholder="Enterprise Quarterly"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Code</label>
              <input
                type="text"
                required
                placeholder="PLAN-ENT-Q"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Frequency</label>
              <select
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recurring Plan Price</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="2499"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Description</label>
            <textarea
              rows={2}
              placeholder="Terms, capabilities and SLA of this plan tier..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Policy Toggles */}
          <div className="p-3.5 bg-[#faf9fd] rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block text-xs">Lifecycle Rules:</span>

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

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Subscription Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
