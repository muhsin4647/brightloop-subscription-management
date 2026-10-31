import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Subscription } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import {
  Search,
  Pause,
  Play,
  Ban,
  RefreshCw,
  Eye,
  Calendar,
  Repeat,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected subscription for detail view
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter !== 'all') query.set('status', statusFilter);
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

  // Metric summaries
  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active');
    const paused = subscriptions.filter((s) => s.status === 'paused');
    const totalMRR = active.reduce((sum, s) => {
      if (s.billing_frequency === 'yearly') return sum + s.total_amount / 12;
      if (s.billing_frequency === 'weekly') return sum + s.total_amount * 4.33;
      if (s.billing_frequency === 'daily') return sum + s.total_amount * 30;
      return sum + s.total_amount;
    }, 0);

    return {
      activeCount: active.length,
      pausedCount: paused.length,
      totalCount: subscriptions.length,
      totalMRR,
    };
  }, [subscriptions]);

  // Pagination
  const totalPages = Math.ceil(subscriptions.length / itemsPerPage) || 1;
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return subscriptions.slice(start, start + itemsPerPage);
  }, [subscriptions, currentPage]);

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

  const getAvatarInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Agreements &amp; Cadence</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active recurring agreements, lifecycle state machine, and automated renewal schedules.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-700 font-semibold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Active Agreements</span>
            <Repeat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.activeCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Out of {stats.totalCount} total contracts
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Contracted MRR</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatCurrency(stats.totalMRR)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Normalized monthly volume
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Paused / On Hold</span>
            <Pause className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.pausedCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Temporary customer holds
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Enforced Guardrails</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            Idempotent Engine
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Zero duplicate invoice guarantee
          </p>
        </div>
      </div>

      {/* Filter Bar with Segmented Tabs and Frequency Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setStatusFilter('active');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => {
                setStatusFilter('paused');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'paused'
                  ? 'bg-white text-amber-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Paused
            </button>
            <button
              onClick={() => {
                setStatusFilter('cancelled');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'cancelled'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cancelled
            </button>
          </div>

          <select
            value={frequencyFilter}
            onChange={(e) => {
              setFrequencyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 text-slate-700 outline-hidden font-medium cursor-pointer"
          >
            <option value="">All Frequencies</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search sub #, customer, plan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Subscription #</th>
                <th className="py-3 px-4">Customer &amp; Account</th>
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
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No subscriptions found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => viewSubscriptionDetail(sub.id)}
                        className="font-mono font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                      >
                        #{sub.subscription_number}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(sub.customer_name || '')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{sub.customer_company || 'Corporate Customer'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{sub.plan_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono capitalize">
                        {sub.billing_frequency} cadence
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(sub.next_billing_date)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(sub.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => viewSubscriptionDetail(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {sub.status === 'active' && sub.pause_permitted && (
                          <button
                            onClick={() => handleAction(sub.id, 'pause')}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Pause Subscription"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        {sub.status === 'paused' && (
                          <button
                            onClick={() => handleAction(sub.id, 'resume')}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Resume Subscription"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {sub.status === 'active' && sub.renewal_permitted && (
                          <button
                            onClick={() => handleAction(sub.id, 'renew')}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Renew Immediately"
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Bottom Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/50 border-t border-slate-200/80 text-xs">
          <div className="text-slate-500 font-mono">
            Showing <span className="font-bold text-slate-900">{subscriptions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * itemsPerPage, subscriptions.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{subscriptions.length}</span> subscriptions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Detail Modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Subscription #${selectedSub.subscription.subscription_number}`}
          subtitle={`Plan: ${selectedSub.subscription.plan_name} (${selectedSub.subscription.billing_frequency.toUpperCase()})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            {/* Status & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedSub.subscription.status} />
                <span className="text-xs text-slate-500">
                  Customer: <strong className="text-slate-900">{selectedSub.subscription.customer_name}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedSub.subscription.status === 'active' && selectedSub.subscription.pause_permitted && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'pause')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}

                {selectedSub.subscription.status === 'paused' && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'resume')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                )}

                {selectedSub.subscription.status === 'active' && selectedSub.subscription.early_closure_permitted && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'cancel')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancel Agreement
                  </button>
                )}
              </div>
            </div>

            {/* Subscription Line Items */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-700">
                Commercial Line Items
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
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

            {/* Associated Invoices */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-700">
                Invoice History ({selectedSub.invoices?.length || 0})
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {(selectedSub.invoices || []).length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No invoices issued yet.</div>
                ) : (
                  (selectedSub.invoices || []).map((inv: any) => (
                    <div key={inv.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-bold text-slate-900">#{inv.invoice_number}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatDate(inv.issue_date)} · Due: {formatDate(inv.due_date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(inv.total_amount)}
                        </div>
                        <div className="mt-0.5">
                          <StatusBadge status={inv.status} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lifecycle History */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-700">
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
                    <div className="text-[10px] text-slate-400 font-mono text-right">
                      <div>{formatDate(h.created_at)}</div>
                      <div className="font-sans text-slate-600">{h.changed_by_name || 'System'}</div>
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
