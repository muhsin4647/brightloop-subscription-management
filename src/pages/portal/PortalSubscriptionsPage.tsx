import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Subscription, SubscriptionPlan } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { PurchasePlanModal } from '../../components/checkout/PurchasePlanModal.tsx';
import {
  Pause,
  Play,
  Ban,
  Calendar,
  Eye,
  Plus,
  ShoppingBag,
  Sparkles,
  Zap,
  CreditCard,
  Check,
  ShieldCheck,
} from 'lucide-react';

export const PortalSubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Plans catalog modal & purchase modal
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [planToPurchase, setPlanToPurchase] = useState<SubscriptionPlan | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const data = await apiRequest<Subscription[]>('/portal/subscriptions');
      setSubscriptions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      const data = await apiRequest<SubscriptionPlan[]>('/plans');
      setAvailablePlans((data || []).filter((p) => p.status === 'active'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchAvailablePlans();
  }, []);

  const openSubDetail = async (id: string) => {
    try {
      const data = await apiRequest(`/portal/subscriptions/${id}`);
      setSelectedSub(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const res = await apiRequest(`/portal/subscriptions/${id}/${action}`, { method: 'POST' });
      setActionMsg(res.message);
      await fetchSubscriptions();
      if (selectedSub) openSubDetail(id);
    } catch (err: any) {
      alert(`Action could not be completed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Subscriptions</h1>
            <span className="text-xs text-slate-500 font-medium">· {subscriptions.length} contracts</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Active recurring commitments, billing schedules, and self-service lifecycle controls.
          </p>
        </div>

        <button
          onClick={() => setShowCatalogModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Subscribe to New Plan
        </button>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-700 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading subscription contracts...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="col-span-full py-12 px-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
            <p>No active subscriptions found on your customer account.</p>
            <button
              onClick={() => setShowCatalogModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold shadow-xs hover:bg-slate-800 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Browse Subscription Plans &amp; Pricing
            </button>
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-slate-800">{sub.subscription_number}</span>
                  <StatusBadge status={sub.status} size="sm" />
                </div>

                <h3 className="font-bold text-slate-900 text-base tracking-tight">{sub.plan_name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Next Billing: <strong className="text-slate-800 font-mono">{formatDate(sub.next_billing_date)}</strong>{' '}
                    ({sub.billing_frequency})
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      Recurring Commitment
                    </span>
                    <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                      {formatCurrency(sub.total_amount)}
                    </span>
                  </div>
                  <button
                    onClick={() => openSubDetail(sub.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Plan Lines
                  </button>
                </div>
              </div>

              {/* Permitted Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {sub.status === 'active' && sub.pause_permitted && (
                  <button
                    onClick={() => handleAction(sub.id, 'pause')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Pause className="w-3 h-3 text-slate-500" />
                    Pause Plan
                  </button>
                )}

                {sub.status === 'paused' && (
                  <button
                    onClick={() => handleAction(sub.id, 'resume')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Play className="w-3 h-3" />
                    Resume Plan
                  </button>
                )}

                {sub.status === 'active' && sub.early_closure_permitted && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this subscription?')) {
                        handleAction(sub.id, 'cancel');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-200 bg-transparent text-slate-500 hover:text-rose-600 hover:bg-rose-50/60 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Ban className="w-3 h-3" />
                    Cancel Plan
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* BROWSE PLANS CATALOG MODAL */}
      <Modal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        title="Subscription Plans Catalog"
        subtitle="Select a plan tier to launch checkout and activate recurring services"
        maxWidth="max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {availablePlans.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{p.code}</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                    {p.billing_frequency}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">{p.name}</h4>
                <div className="text-xs text-indigo-600 font-semibold">{p.product_name}</div>
                {p.description && (
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed min-h-[30px]">{p.description}</p>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                    {formatCurrency(p.plan_price)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">/ {p.billing_frequency}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCatalogModal(false);
                  setPlanToPurchase(p);
                }}
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Purchase Now</span>
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {/* CHECKOUT MODAL */}
      <PurchasePlanModal
        isOpen={!!planToPurchase}
        onClose={() => setPlanToPurchase(null)}
        plan={planToPurchase}
        onSuccess={() => {
          fetchSubscriptions();
        }}
      />

      {/* Subscription Detail Modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Subscription ${selectedSub.subscription.subscription_number}`}
          subtitle={`Plan: ${selectedSub.subscription.plan_name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <StatusBadge status={selectedSub.subscription.status} />
              <span className="text-xs text-slate-500">
                Renews on: <strong className="font-mono text-slate-800">{formatDate(selectedSub.subscription.next_billing_date)}</strong>
              </span>
            </div>

            {/* Line items */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-700 border-b">
                Included Products &amp; Variants
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedSub.lines || []).map((l: any) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{l.description}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{l.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono tabular-nums">
                        {formatCurrency(l.unit_price + l.variant_adjustment)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono tabular-nums">
                        {formatCurrency(l.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
