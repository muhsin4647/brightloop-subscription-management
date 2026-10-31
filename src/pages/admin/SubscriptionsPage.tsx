import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Subscription, SubscriptionLine } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { Search, Plus, Pause, Play, Ban, RefreshCw, Eye, Calendar, FileText } from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');

  // Selected subscription for detail view
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter) query.set('status', statusFilter);
      if (frequencyFilter) query.set('frequency', frequencyFilter);

      const data = await apiRequest<Subscription[]>(`/subscriptions?${query.toString()}`);
      setSubscriptions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [search, statusFilter, frequencyFilter]);

  const viewSubscriptionDetail = async (id: string) => {
    setDetailLoading(true);
    setActionMsg(null);
    try {
      const data = await apiRequest(`/subscriptions/${id}`);
      setSelectedSub(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'pause' | 'resume' | 'cancel' | 'renew' | 'close') => {
    try {
      const res = await apiRequest(`/subscriptions/${id}/${action}`, { method: 'POST' });
      setActionMsg(res.message);
      await fetchSubscriptions();
      if (selectedSub && selectedSub.subscription.id === id) {
        await viewSubscriptionDetail(id);
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscriptions Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active recurring agreements, lifecycle state machine, and billing anchors.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by SUB #, customer name, company, or plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="closed">Closed</option>
            <option value="confirmed">Confirmed</option>
          </select>

          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="">All Frequencies</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-900 font-bold">{subscriptions.length}</span> subscriptions
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Subscription #</th>
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-4">Plan &amp; Frequency</th>
                <th className="py-3 px-4">Next Billing Date</th>
                <th className="py-3 px-4 text-right">Commitment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading subscriptions...</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No subscriptions found matching criteria.</td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-700">
                      <button onClick={() => viewSubscriptionDetail(sub.id)} className="hover:underline">
                        {sub.subscription_number}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{sub.customer_company}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{sub.plan_name}</div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {sub.billing_frequency}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(sub.next_billing_date)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(sub.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => viewSubscriptionDetail(sub.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {sub.status === 'active' && sub.pause_permitted && (
                          <button
                            onClick={() => handleAction(sub.id, 'pause')}
                            className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                            title="Pause Subscription"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        {sub.status === 'paused' && (
                          <button
                            onClick={() => handleAction(sub.id, 'resume')}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                            title="Resume Subscription"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {sub.status === 'active' && sub.renewal_permitted && (
                          <button
                            onClick={() => handleAction(sub.id, 'renew')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Advance Renewal"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        {sub.status === 'active' && sub.early_closure_permitted && (
                          <button
                            onClick={() => {
                              if (confirm(`Cancel subscription ${sub.subscription_number}?`)) {
                                handleAction(sub.id, 'cancel');
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Cancel Subscription"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Detail Modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Subscription ${selectedSub.subscription.subscription_number}`}
          subtitle={`Plan: ${selectedSub.subscription.plan_name} (${selectedSub.subscription.billing_frequency.toUpperCase()})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            {/* Status & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedSub.subscription.status} />
                <span className="text-xs text-slate-500">
                  Customer: <strong className="text-slate-800">{selectedSub.subscription.customer_name}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedSub.subscription.status === 'active' && selectedSub.subscription.pause_permitted && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'pause')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}

                {selectedSub.subscription.status === 'paused' && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'resume')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                )}

                {selectedSub.subscription.status === 'active' && selectedSub.subscription.early_closure_permitted && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'cancel')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Subscription Line Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700">
                Commercial Line Items
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Description</th>
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

            {/* Associated Invoices */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700">
                Invoice History ({selectedSub.invoices?.length || 0})
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {(selectedSub.invoices || []).length === 0 ? (
                  <div className="p-3 text-center text-slate-400">No invoices issued yet.</div>
                ) : (
                  (selectedSub.invoices || []).map((inv: any) => (
                    <div key={inv.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{inv.invoice_number}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatDate(inv.issue_date)} | Due: {formatDate(inv.due_date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(inv.total_amount)}</div>
                        <StatusBadge status={inv.status} size="sm" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lifecycle History */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700">
                Audit Status Transitions
              </div>
              <div className="divide-y divide-slate-100 text-xs max-h-40 overflow-y-auto">
                {(selectedSub.history || []).map((h: any) => (
                  <div key={h.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {h.previous_status || 'Start'} &rarr; {h.new_status}
                      </span>
                      <p className="text-[11px] text-slate-500">{h.reason}</p>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      <div>{formatDate(h.created_at)}</div>
                      <div>{h.changed_by_name || 'System'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
