import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Subscription } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { Pause, Play, Ban, Calendar, Eye, AlertCircle } from 'lucide-react';

export const PortalSubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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

  useEffect(() => {
    fetchSubscriptions();
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
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Subscriptions</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View your active plans, renewal schedules, and manage permitted changes.
        </p>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">No subscriptions found on your account.</div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-indigo-700 text-xs">{sub.subscription_number}</span>
                  <StatusBadge status={sub.status} size="sm" />
                </div>

                <h3 className="font-bold text-slate-900 text-base">{sub.plan_name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Next Billing: <strong className="text-slate-800">{formatDate(sub.next_billing_date)}</strong> ({sub.billing_frequency})</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Recurring Commitment</span>
                    <span className="text-xl font-black text-slate-900">{formatCurrency(sub.total_amount)}</span>
                  </div>
                  <button
                    onClick={() => openSubDetail(sub.id)}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold"
                  >
                    <Pause className="w-3 h-3" />
                    Pause Plan
                  </button>
                )}

                {sub.status === 'paused' && (
                  <button
                    onClick={() => handleAction(sub.id, 'resume')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold"
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
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <StatusBadge status={selectedSub.subscription.status} />
              <span className="text-xs text-slate-500">
                Renews on: <strong>{formatDate(selectedSub.subscription.next_billing_date)}</strong>
              </span>
            </div>

            {/* Line items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-700 border-b">
                Included Products &amp; Variants
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedSub.lines || []).map((l: any) => (
                    <tr key={l.id}>
                      <td className="py-2 px-3 font-medium text-slate-800">{l.description}</td>
                      <td className="py-2 px-3 text-center text-slate-600">{l.quantity}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(l.unit_price + l.variant_adjustment)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(l.line_total)}</td>
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
