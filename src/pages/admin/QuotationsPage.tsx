import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Quotation, QuotationLine } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { CreateQuotationModal } from '../../components/quotation/CreateQuotationModal.tsx';
import {
  Search,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  ArrowRightCircle,
  Eye,
  Calendar,
  FileText,
  TrendingUp,
  Percent,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteDetail, setQuoteDetail] = useState<{ quotation: Quotation; lines: QuotationLine[] } | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter !== 'all') query.set('status', statusFilter);

      const data = await apiRequest<Quotation[]>(`/quotations?${query.toString()}`);
      setQuotations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [search, statusFilter]);

  // Metric stats
  const stats = useMemo(() => {
    const total = quotations.length;
    const accepted = quotations.filter((q) => q.status === 'accepted').length;
    const pipelineValue = quotations
      .filter((q) => q.status === 'sent' || q.status === 'draft')
      .reduce((sum, q) => sum + q.grand_total, 0);
    const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return {
      total,
      accepted,
      pipelineValue,
      conversionRate,
    };
  }, [quotations]);

  // Pagination
  const totalPages = Math.ceil(quotations.length / itemsPerPage) || 1;
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return quotations.slice(start, start + itemsPerPage);
  }, [quotations, currentPage]);

  const viewQuoteDetail = async (id: string) => {
    setSelectedQuoteId(id);
    setActionMsg(null);
    try {
      const data = await apiRequest(`/quotations/${id}`);
      setQuoteDetail(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await apiRequest(`/quotations/${id}/send`, { method: 'POST' });
      setActionMsg('Quotation successfully dispatched to customer.');
      await fetchQuotations();
      if (selectedQuoteId === id) viewQuoteDetail(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await apiRequest(`/quotations/${id}/accept`, { method: 'POST' });
      setActionMsg('Quotation marked as accepted by customer.');
      await fetchQuotations();
      if (selectedQuoteId === id) viewQuoteDetail(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiRequest(`/quotations/${id}/reject`, { method: 'POST' });
      setActionMsg('Quotation marked as declined.');
      await fetchQuotations();
      if (selectedQuoteId === id) viewQuoteDetail(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConvert = async (id: string) => {
    try {
      const res = await apiRequest(`/quotations/${id}/convert-to-subscription`, { method: 'POST' });
      setActionMsg(`Success: ${res.message}`);
      await fetchQuotations();
      if (selectedQuoteId === id) viewQuoteDetail(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getAvatarInitials = (name: string) => {
    if (!name) return 'Q';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Quotations &amp; Proposals</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Commercial proposals, pricing variant calculations, customer approvals, and conversion to active subscriptions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Quotation</span>
        </button>
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
            <span>Total Proposals</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.total}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Issued quotes</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatCurrency(stats.pipelineValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Draft &amp; sent offers</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Accepted Offers</span>
            <CheckCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {stats.accepted}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Approved terms</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Conversion Rate</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.conversionRate}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Proposal close rate</p>
        </div>
      </div>

      {/* Filter Bar with Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Quotations' },
            { id: 'draft', label: 'Draft' },
            { id: 'sent', label: 'Sent' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'rejected', label: 'Rejected' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setStatusFilter(t.id as any);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === t.id
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search quotation #, customer, plan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-4">Plan &amp; Scope</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading quotations...
                  </td>
                </tr>
              ) : paginatedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No quotations found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <button onClick={() => viewQuoteDetail(q.id)} className="hover:text-indigo-600 transition-colors text-left">
                        #{q.quotation_number}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(q.customer_name || '')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{q.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{q.customer_company || 'Corporate Entity'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{q.plan_name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] tabular-nums">
                      {formatDate(q.issue_date)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                      {formatDate(q.expiry_date)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(q.grand_total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => viewQuoteDetail(q.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {q.status === 'draft' && (
                          <button
                            onClick={() => handleSend(q.id)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Dispatch to Customer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {q.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleAccept(q.id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Mark Accepted"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(q.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Mark Rejected"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {q.status === 'accepted' && !q.converted_to_subscription_id && (
                          <button
                            onClick={() => handleConvert(q.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                            title="Convert to Active Subscription"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            <span>Convert</span>
                          </button>
                        )}

                        {q.converted_to_subscription_id && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            Converted
                          </span>
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
            Showing <span className="font-bold text-slate-900">{quotations.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * itemsPerPage, quotations.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{quotations.length}</span> proposals
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

      {/* Create Quotation Modal */}
      <CreateQuotationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchQuotations();
          setActionMsg('Quotation generated successfully.');
        }}
      />

      {/* Quote Detail Modal */}
      {quoteDetail && (
        <Modal
          isOpen={!!quoteDetail}
          onClose={() => {
            setSelectedQuoteId(null);
            setQuoteDetail(null);
          }}
          title={`Quotation #${quoteDetail.quotation.quotation_number}`}
          subtitle={`Customer: ${quoteDetail.quotation.customer_name} · Valid until: ${formatDate(quoteDetail.quotation.expiry_date)}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90">
              <div className="flex items-center gap-2">
                <StatusBadge status={quoteDetail.quotation.status} />
                <span className="text-xs text-slate-500">
                  Plan: <strong className="text-slate-900">{quoteDetail.quotation.plan_name}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {quoteDetail.quotation.status === 'draft' && (
                  <button
                    onClick={() => handleSend(quoteDetail.quotation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Customer</span>
                  </button>
                )}

                {quoteDetail.quotation.status === 'sent' && (
                  <button
                    onClick={() => handleAccept(quoteDetail.quotation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Customer Accepted</span>
                  </button>
                )}

                {quoteDetail.quotation.status === 'accepted' && !quoteDetail.quotation.converted_to_subscription_id && (
                  <button
                    onClick={() => handleConvert(quoteDetail.quotation.id)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    <span>Convert to Active Subscription</span>
                  </button>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Adjustment</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quoteDetail.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{l.description}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{l.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono tabular-nums">{formatCurrency(l.unit_price)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-mono tabular-nums">+{formatCurrency(l.variant_adjustment)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-mono tabular-nums">-{formatCurrency(l.discount_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono tabular-nums">{formatCurrency(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(quoteDetail.quotation.subtotal)}</span>
                  </div>
                  {quoteDetail.quotation.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold tabular-nums">-{formatCurrency(quoteDetail.quotation.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(quoteDetail.quotation.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(quoteDetail.quotation.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
