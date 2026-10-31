import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Invoice } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { InvoiceDetailModal } from '../../components/invoice/InvoiceDetailModal.tsx';
import { RecordPaymentModal } from '../../components/invoice/RecordPaymentModal.tsx';
import { generateInvoicePDF } from '../../lib/pdf.ts';
import {
  Search,
  Download,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Wallet,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue' | 'draft'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);

      const data = await apiRequest<Invoice[]>(`/invoices?${query.toString()}`);
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search]);

  // Compute Ecomic-style KPI summaries
  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalReceivables = invoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
    const paidAmount = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    const unpaidAmount = invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'partially_paid' || inv.status === 'confirmed')
      .reduce((sum, inv) => sum + inv.outstanding_amount, 0);
    const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);

    const overduePercent = totalReceivables > 0 ? Math.round((overdueAmount / totalReceivables) * 100) : 0;
    const paidPercent = totalBilled > 0 ? Math.round((paidAmount / totalBilled) * 100) : 75;

    return {
      totalReceivables,
      paidAmount,
      unpaidAmount,
      overdueAmount,
      overdueCount: overdueInvoices.length,
      overduePercent,
      paidPercent,
    };
  }, [invoices]);

  // Filter based on selected tab
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (tabFilter === 'all') return true;
      if (tabFilter === 'paid') return inv.status === 'paid';
      if (tabFilter === 'unpaid') return inv.outstanding_amount > 0 && inv.status !== 'overdue';
      if (tabFilter === 'overdue') return inv.status === 'overdue';
      if (tabFilter === 'draft') return inv.status === 'draft';
      return true;
    });
  }, [invoices, tabFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const handleDownloadPDF = async (inv: Invoice) => {
    try {
      const data = await apiRequest(`/invoices/${inv.id}`);
      generateInvoicePDF(data.invoice, data.lines, data.invoice);
    } catch (err: any) {
      alert(`PDF generation error: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/v1/reports/export/invoices', '_blank');
  };

  const getAvatarInitials = (name: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Ledger &amp; Collections</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated subscription billing entries, settlement statuses, and customer payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Ecomic-style KPI Row (Featured Gradient Card + 3 Sparkline Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Featured Total Receivables Gradient Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-5 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-indigo-100">Total Receivables</span>
            </div>
            <div className="mt-3">
              <span className="text-[11px] text-indigo-200">Current Outstanding Portfolio</span>
              <div className="text-2xl font-bold tracking-tight font-mono tabular-nums">
                {formatCurrency(stats.totalReceivables)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-indigo-200">Overdue: {formatCurrency(stats.overdueAmount)}</span>
              <span className="font-mono font-bold text-white tabular-nums">{stats.overduePercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-indigo-950/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, stats.overduePercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Paid Card with Sparkline */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Paid Invoices</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {stats.paidPercent}%
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
              {formatCurrency(stats.paidAmount)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Reconciled to date</p>
          </div>

          {/* Micro visual bars sparkline */}
          <div className="flex items-end gap-1.5 h-7 mt-3 pt-1">
            {[40, 65, 30, 85, 95, 70, 90, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-emerald-500/70 hover:bg-emerald-600 rounded-xs transition-all"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Unpaid Card with Wave Sparkline */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Unpaid / In Cycle</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Pending
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
              {formatCurrency(stats.unpaidAmount)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Due on upcoming dates</p>
          </div>

          {/* Micro wave sparkline */}
          <div className="flex items-end gap-1.5 h-7 mt-3 pt-1">
            {[20, 45, 60, 40, 75, 50, 65, 55].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500/70 hover:bg-blue-600 rounded-xs transition-all"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Overdue Card with Sparkline */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Overdue Invoices</span>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-mono">
              {stats.overdueCount} bills
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 font-mono tracking-tight tabular-nums">
              {formatCurrency(stats.overdueAmount)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Requires collection</p>
          </div>

          {/* Micro red bars */}
          <div className="flex items-end gap-1.5 h-7 mt-3 pt-1">
            {[80, 50, 90, 40, 100, 70, 85, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-rose-500/70 hover:bg-rose-600 rounded-xs transition-all"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Segmented Filter Bar & Search (Ecomic-style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        {/* Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => {
              setTabFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tabFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Invoices
          </button>
          <button
            onClick={() => {
              setTabFilter('paid');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tabFilter === 'paid'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => {
              setTabFilter('unpaid');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tabFilter === 'unpaid'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Unpaid
          </button>
          <button
            onClick={() => {
              setTabFilter('overdue');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tabFilter === 'overdue'
                ? 'bg-white text-rose-600 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Overdue
          </button>
          <button
            onClick={() => {
              setTabFilter('draft');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tabFilter === 'draft'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Draft
          </button>
        </div>

        {/* Right Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input type="checkbox" className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                </th>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">User Info</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading invoices...
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <input type="checkbox" className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="font-mono font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                      >
                        #{inv.invoice_number}
                      </button>
                      {inv.subscription_number && (
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          {inv.subscription_number}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(inv.customer_name || '')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{inv.customer_company || 'Independent Customer'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] tabular-nums">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] tabular-nums">
                      <span className={inv.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={inv.outstanding_amount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(inv.outstanding_amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {inv.outstanding_amount > 0 && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
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

        {/* Ecomic-style Bottom Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/50 border-t border-slate-200/80 text-xs">
          <div className="text-slate-500 font-mono">
            Showing <span className="font-bold text-slate-900">{filteredInvoices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{filteredInvoices.length}</span> invoices
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

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onUpdated={fetchInvoices}
      />

      {/* Quick Record Payment Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          isOpen={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          invoice={paymentInvoice}
          onPaymentSuccess={fetchInvoices}
        />
      )}
    </div>
  );
};
