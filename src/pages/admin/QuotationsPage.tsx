import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Quotation, QuotationLine } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { CreateQuotationModal } from '../../components/quotation/CreateQuotationModal.tsx';
import { Search, Plus, Send, CheckCircle2, XCircle, ArrowRightCircle, Eye, Calendar, FileText } from 'lucide-react';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteDetail, setQuoteDetail] = useState<{ quotation: Quotation; lines: QuotationLine[] } | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchQuotations = async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter) query.set('status', statusFilter);

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
      setActionMsg('Quotation dispatched to customer.');
      await fetchQuotations();
      if (selectedQuoteId === id) viewQuoteDetail(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await apiRequest(`/quotations/${id}/accept`, { method: 'POST' });
      setActionMsg('Quotation terms accepted by customer.');
      await fetchQuotations();
      if (selectedQuoteId === id) viewQuoteDetail(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiRequest(`/quotations/${id}/reject`, { method: 'POST' });
      setActionMsg('Quotation marked as rejected.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Quotations &amp; Proposals</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Commercial proposals, pricing variant calculations, customer approval, and conversion to active subscriptions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Quotation
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by QT #, customer, company..."
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
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-900 font-bold">{quotations.length}</span> quotations
        </div>
      </div>

      {/* Quotations Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading quotations...</td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No quotations found.</td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-700">
                      <button onClick={() => viewQuoteDetail(q.id)} className="hover:underline">
                        {q.quotation_number}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{q.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{q.customer_company}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{q.plan_name}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(q.issue_date)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{formatDate(q.expiry_date)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(q.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => viewQuoteDetail(q.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {q.status === 'draft' && (
                          <button
                            onClick={() => handleSend(q.id)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Send to Customer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {q.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleAccept(q.id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="Accept Quotation"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(q.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Reject Quotation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {q.status === 'accepted' && !q.converted_to_subscription_id && (
                          <button
                            onClick={() => handleConvert(q.id)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-2xs flex items-center gap-1"
                            title="Convert to Active Subscription"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            Convert
                          </button>
                        )}

                        {q.converted_to_subscription_id && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
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
          title={`Quotation ${quoteDetail.quotation.quotation_number}`}
          subtitle={`Customer: ${quoteDetail.quotation.customer_name} | Valid until: ${formatDate(quoteDetail.quotation.expiry_date)}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={quoteDetail.quotation.status} />
                <span className="text-xs text-slate-500">
                  Plan: <strong className="text-slate-800">{quoteDetail.quotation.plan_name}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {quoteDetail.quotation.status === 'draft' && (
                  <button
                    onClick={() => handleSend(quoteDetail.quotation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send to Customer
                  </button>
                )}

                {quoteDetail.quotation.status === 'sent' && (
                  <button
                    onClick={() => handleAccept(quoteDetail.quotation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Customer Accepted
                  </button>
                )}

                {quoteDetail.quotation.status === 'accepted' && !quoteDetail.quotation.converted_to_subscription_id && (
                  <button
                    onClick={() => handleConvert(quoteDetail.quotation.id)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    Convert to Active Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
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
                      <td className="py-2.5 px-3 text-center text-slate-600">{l.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(l.unit_price)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">+{formatCurrency(l.variant_adjustment)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600">-{formatCurrency(l.discount_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(quoteDetail.quotation.subtotal)}</span>
                  </div>
                  {quoteDetail.quotation.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-{formatCurrency(quoteDetail.quotation.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span className="font-semibold">{formatCurrency(quoteDetail.quotation.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(quoteDetail.quotation.grand_total)}</span>
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
