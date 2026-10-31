import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatDate } from '../../lib/api.ts';
import { AuditLog } from '../../types/index.ts';
import {
  ShieldCheck,
  Search,
  Filter,
  FileText,
  Repeat,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('action', search);
      query.set('limit', '200');

      const data = await apiRequest<AuditLog[]>(`/audit-logs?${query.toString()}`);
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  // Filtered by category
  const filteredLogs = useMemo(() => {
    if (!categoryFilter) return logs;
    return logs.filter((l) => l.action.toLowerCase().includes(categoryFilter.toLowerCase()));
  }, [logs, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Trail &amp; Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of commercial transactions, user account actions, price modifications, and state transitions.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Audit Entries</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {logs.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Captured in immutable database store</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Tamper Resistance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            Append-Only
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Zero deletion or modification permitted</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Actor Attribution</span>
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            100% Traceable
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Logged with user ID, IP &amp; timestamps</p>
        </div>
      </div>

      {/* Filter Bar with Segmented Categories */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
          {[
            { id: '', label: 'All Events' },
            { id: 'subscription', label: 'Subscriptions' },
            { id: 'invoice', label: 'Invoices' },
            { id: 'payment', label: 'Payments' },
            { id: 'quotation', label: 'Quotations' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action keyword..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Resource Target</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit events found.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap tabular-nums">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      <span className="bg-indigo-50/80 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200/60 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="font-semibold text-slate-500">{log.resource_type}:</span>{' '}
                      <span className="font-mono text-[11px] text-slate-700">{log.resource_id || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[9px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(log.user_name || log.user_email || 'System')}
                        </div>
                        <span className="font-semibold text-slate-800">{log.user_name || log.user_email || 'System Runner'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 leading-relaxed max-w-md">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/50 border-t border-slate-200/80 text-xs">
          <div className="text-slate-500 font-mono">
            Showing <span className="font-bold text-slate-900">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{filteredLogs.length}</span> events
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
    </div>
  );
};
