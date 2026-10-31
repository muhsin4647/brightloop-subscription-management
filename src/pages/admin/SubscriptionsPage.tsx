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
  CheckCircle2,
  Receipt,
  FileText,
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Subscriptions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active recurring customer agreements, lifecycle statuses, and automated renewal schedules.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
          <span>{actionMsg}</span>
          <button
            onClick={() => setActionMsg(null)}
            className="text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2 pb-2">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Active Subscriptions</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            {stats.activeCount}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Out of {stats.totalCount} total contracts</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Contracted MRR</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            {formatCurrency(stats.totalMRR)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Normalized recurring volume</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Paused / On Hold</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            {stats.pausedCount}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Temporary customer holds</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">Billing Engine</div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Automated &amp; Synced</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Zero duplicate invoice guarantee</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-[#faf9fd] rounded-2xl border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl shadow-2xs border border-slate-100">
            {(['all', 'active', 'paused', 'cancelled'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Cadence Dropdown */}
          <select
            value={frequencyFilter}
            onChange={(e) => {
              setFrequencyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200/90 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Cadences</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subscriptions or client..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Subscriptions Data Table */}
      <div className="rounded-[24px] border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#faf9fd] text-slate-500 border-b border-slate-100 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">Contract Number</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Plan &amp; Cadence</th>
                <th className="py-3.5 px-4">Next Billing Date</th>
                <th className="py-3.5 px-4 text-right">Recurring Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
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
                  <tr key={sub.id} className="hover:bg-[#faf9fd]/70 transition-colors">
                    <td className="py-4 px-5">
                      <button
                        onClick={() => viewSubscriptionDetail(sub.id)}
                        className="font-mono font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                      >
                        #{sub.subscription_number}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {getAvatarInitials(sub.customer_name || '')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{sub.customer_company || 'Corporate Customer'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">{sub.plan_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono capitalize">
                        {sub.billing_frequency} cadence
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(sub.next_billing_date)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(sub.total_amount)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-4 px-5 text-right">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-[#faf9fd] border-t border-slate-100 text-xs">
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white font-bold'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
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
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#faf9fd] border border-slate-200/80">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedSub.subscription.status} />
                <span className="text-xs text-slate-600">
                  Customer: <strong className="text-slate-900">{selectedSub.subscription.customer_name}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedSub.subscription.status === 'active' && selectedSub.subscription.pause_permitted && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'pause')}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}

                {selectedSub.subscription.status === 'paused' && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'resume')}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                )}

                {selectedSub.subscription.status === 'active' && selectedSub.subscription.early_closure_permitted && (
                  <button
                    onClick={() => handleAction(selectedSub.subscription.id, 'cancel')}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancel Agreement
                  </button>
                )}
              </div>
            </div>

            {/* Subscription Line Items */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="px-5 py-3 bg-[#faf9fd] border-b border-slate-100 text-xs font-bold text-slate-800">
                Commercial Line Items
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-[#faf9fd]/50 text-slate-500 border-b border-slate-100 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedSub.lines || []).map((l: any) => (
                    <tr key={l.id}>
                      <td className="py-3 px-4 font-semibold text-slate-800">{l.description}</td>
                      <td className="py-3 px-4 text-center text-slate-600 font-mono">{l.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-600 font-mono tabular-nums">
                        {formatCurrency(l.unit_price + l.variant_adjustment)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono tabular-nums">
                        {formatCurrency(l.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Associated Invoices */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="px-5 py-3 bg-[#faf9fd] border-b border-slate-100 text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Invoice History</span>
                <span className="text-slate-400 font-mono text-[11px]">{selectedSub.invoices?.length || 0} invoices</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {(selectedSub.invoices || []).length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No invoices issued yet.</div>
                ) : (
                  (selectedSub.invoices || []).map((inv: any) => (
                    <div key={inv.id} className="p-3.5 px-5 flex items-center justify-between hover:bg-[#faf9fd]/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-slate-900">#{inv.invoice_number}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {formatDate(inv.issue_date)} · Due: {formatDate(inv.due_date)}
                          </div>
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
          </div>
        </Modal>
      )}
    </div>
  );
};
