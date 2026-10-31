import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Customer } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import {
  Search,
  Plus,
  Building,
  Mail,
  Phone,
  Receipt,
  Repeat,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      const data = await apiRequest<{ customers: Customer[] }>(`/customers?${query.toString()}`);
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  // Metrics
  const stats = useMemo(() => {
    const totalCount = customers.length;
    const activeSubscribers = customers.filter((c) => (c.active_subscriptions_count || 0) > 0).length;
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.total_outstanding || 0), 0);

    return {
      totalCount,
      activeSubscribers,
      totalOutstanding,
    };
  }, [customers]);

  // Pagination
  const totalPages = Math.ceil(customers.length / itemsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return customers.slice(start, start + itemsPerPage);
  }, [customers, currentPage]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          billing_address: billingAddress.trim() || undefined,
          tax_id: taxId.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      setShowAddModal(false);
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setBillingAddress('');
      setTaxId('');
      setNotes('');
      fetchCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Accounts &amp; Ledgers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered corporate clients, tax identification numbers, subscription counts, and receivables.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer Record</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.totalCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registered customer entities
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Active Subscribers</span>
            <Repeat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {stats.activeSubscribers}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Holding 1 or more live subscriptions
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Outstanding</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono tabular-nums ${stats.totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatCurrency(stats.totalOutstanding)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Unsettled customer invoices
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-2xl border border-slate-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by contact name, company, email, or tax ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <span className="font-bold text-slate-900">{customers.length}</span> customer accounts
        </div>
      </div>

      {/* Customers Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Tax ID / GSTIN</th>
                <th className="py-3 px-4 text-center">Active Subs</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading customer accounts...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(c.name)}
                        </div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">{c.company || 'Individual'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-[10px] text-slate-400 mt-0.5">{c.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {c.tax_id ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-bold text-slate-700">
                          {c.tax_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        <Repeat className="w-3 h-3" />
                        {c.active_subscriptions_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={(c.total_outstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(c.total_outstanding || 0)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {formatDate(c.created_at)}
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
            Showing <span className="font-bold text-slate-900">{customers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * itemsPerPage, customers.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{customers.length}</span> accounts
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Customer Account"
        subtitle="Register a new commercial entity for subscriptions and tax invoicing"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name *</label>
              <input
                type="text"
                required
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="Acme Corporation"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="alex@acmecorp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Street Address</label>
            <textarea
              rows={2}
              placeholder="Plot 45, Cyber City, Phase 2, Gurugram, HR 122002"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax ID Number</label>
            <input
              type="text"
              placeholder="07AAAAA0000A1Z5"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono uppercase bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Save Account Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
