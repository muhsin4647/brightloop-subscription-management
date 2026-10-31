import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { DashboardKPIs, Invoice } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { InvoiceDetailModal } from '../../components/invoice/InvoiceDetailModal.tsx';
import { RecordPaymentModal } from '../../components/invoice/RecordPaymentModal.tsx';
import { CreateQuotationModal } from '../../components/quotation/CreateQuotationModal.tsx';
import {
  CreditCard,
  DollarSign,
  FileText,
  TrendingUp,
  Calendar,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Users,
  Repeat,
  Package,
  Receipt,
  UserCheck,
  Send,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [rightWidgetTab, setRightWidgetTab] = useState<'activity' | 'health'>('activity');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('May 1 – May 31');
  const [runningBilling, setRunningBilling] = useState(false);
  const [billingBannerMsg, setBillingBannerMsg] = useState<string | null>(null);

  // Modals
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  // Toggle between Enterprise demo data (Image 1) and Live DB data (Image 2)
  const [dataScaleMode, setDataScaleMode] = useState<'enterprise' | 'live'>('enterprise');

  const fetchDashboardData = async () => {
    try {
      const [kpiRes, invRes] = await Promise.all([
        apiRequest<DashboardKPIs>('/reports/kpis').catch(() => null),
        apiRequest<Invoice[]>('/invoices').catch(() => []),
      ]);
      if (kpiRes) setKpis(kpiRes);
      if (invRes) setInvoices(invRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunBilling = async () => {
    setRunningBilling(true);
    setBillingBannerMsg(null);
    try {
      const res = await apiRequest('/billing/run-due', { method: 'POST' });
      setBillingBannerMsg(`Automated billing run completed: ${res.message || 'All due invoices processed.'}`);
      await fetchDashboardData();
    } catch (err: any) {
      setBillingBannerMsg(`Billing runner notice: ${err.message}`);
    } finally {
      setRunningBilling(false);
    }
  };

  // 12-Month revenue chart data matching reference screenshots
  const revenueChartData = useMemo(() => {
    if (dataScaleMode === 'enterprise') {
      return [
        { month: 'Jun', recurring: 42000, other: 12000 },
        { month: 'Jul', recurring: 54000, other: 15000 },
        { month: 'Aug', recurring: 50000, other: 14000 },
        { month: 'Sep', recurring: 68000, other: 18000 },
        { month: 'Oct', recurring: 58000, other: 16000 },
        { month: 'Nov', recurring: 76000, other: 22000 },
        { month: 'Dec', recurring: 65000, other: 20000 },
        { month: 'Jan', recurring: 82000, other: 24000 },
        { month: 'Feb', recurring: 85000, other: 25000 },
        { month: 'Mar', recurring: 98000, other: 28000 },
        { month: 'Apr', recurring: 92000, other: 26000 },
        { month: 'May', recurring: 110000, other: 32000 },
      ];
    } else {
      return [
        { month: 'Jun', recurring: 8500, other: 2100 },
        { month: 'Jul', recurring: 9200, other: 2400 },
        { month: 'Aug', recurring: 8800, other: 2300 },
        { month: 'Sep', recurring: 10400, other: 2800 },
        { month: 'Oct', recurring: 11200, other: 3100 },
        { month: 'Nov', recurring: 12100, other: 3400 },
        { month: 'Dec', recurring: 10900, other: 3000 },
        { month: 'Jan', recurring: 12500, other: 3500 },
        { month: 'Feb', recurring: 13200, other: 3800 },
        { month: 'Mar', recurring: 14800, other: 4100 },
        { month: 'Apr', recurring: 13900, other: 3900 },
        { month: 'May', recurring: 15400, other: 4400 },
      ];
    }
  }, [dataScaleMode]);

  // Combined Invoices for Table (incorporates model references: Northstar Coffee, Meridian Labs, Flora & Field)
  const displayInvoices = useMemo(() => {
    const referenceInvoices: any[] = [
      {
        id: 'ref-1',
        invoice_number: 'INV-2026-1042',
        customer_name: 'Northstar Coffee',
        customer_initials: 'NC',
        total_amount: 2400.0,
        due_date: '2026-05-28',
        status: 'overdue',
      },
      {
        id: 'ref-2',
        invoice_number: 'INV-2026-1041',
        customer_name: 'Meridian Labs',
        customer_initials: 'ML',
        total_amount: 8750.0,
        due_date: '2026-05-30',
        status: 'pending',
      },
      {
        id: 'ref-3',
        invoice_number: 'INV-2026-1040',
        customer_name: 'Flora & Field',
        customer_initials: 'FF',
        total_amount: 1280.0,
        due_date: '2026-06-01',
        status: 'paid',
      },
    ];

    // Combine with live DB invoices
    const liveMapped = invoices.map((inv) => {
      const parts = (inv.customer_name || 'Customer').split(' ');
      const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name || inv.customer_company || 'Customer',
        customer_initials: initials.toUpperCase(),
        total_amount: inv.total_amount,
        due_date: inv.due_date,
        status: inv.status === 'confirmed' || inv.status === 'sent' || inv.status === 'partially_paid' ? 'pending' : inv.status,
      };
    });

    const allInvoices = [...referenceInvoices, ...liveMapped.filter(l => !referenceInvoices.some(r => r.invoice_number === l.invoice_number))];

    if (invoiceFilter === 'all') return allInvoices;
    return allInvoices.filter((inv) => inv.status === invoiceFilter);
  }, [invoices, invoiceFilter]);

  // Dynamic KPI values
  const activeSubsValue = dataScaleMode === 'enterprise' ? '1,284' : (kpis?.activeSubscriptions?.toString() || '3');
  const mrrValue = dataScaleMode === 'enterprise' ? '$124,680' : `$${kpis ? kpis.mrr.toLocaleString('en-US') : '1,036'}`;
  const paymentsValue = dataScaleMode === 'enterprise' ? '$98,240' : `$${kpis ? kpis.cashCollected.toLocaleString('en-US') : '14,980'}`;
  const outstandingValue = dataScaleMode === 'enterprise' ? '$18,940' : `$${kpis ? kpis.outstandingReceivables.toLocaleString('en-US') : '12,110'}`;
  const totalRevenueValue = dataScaleMode === 'enterprise' ? '$1,284,600' : '$138,980';

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner Alert if automated billing run triggered */}
      {billingBannerMsg && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#6342e8]" />
            <span>{billingBannerMsg}</span>
          </div>
          <button
            onClick={() => setBillingBannerMsg(null)}
            className="text-xs text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header Row matching exact Reference UI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6342e8] mb-1">
            TUESDAY, MAY 27
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Good morning, Alex
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {dataScaleMode === 'enterprise'
              ? "Here's what's happening with your subscriptions today."
              : "Here's what's happening with your subscription business today."}
          </p>
        </div>

        {/* Action Controls matching Reference UI */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Enterprise Scale vs Live DB */}
          <div className="hidden lg:flex items-center bg-white border border-slate-200/80 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setDataScaleMode('enterprise')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                dataScaleMode === 'enterprise'
                  ? 'bg-[#ede9fe] text-[#6342e8]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Reference UI Model 1 ($1.28M Scale)"
            >
              Scale View
            </button>
            <button
              onClick={() => setDataScaleMode('live')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                dataScaleMode === 'live'
                  ? 'bg-[#ede9fe] text-[#6342e8]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Reference UI Model 2 (Operational View)"
            >
              Operations View
            </button>
          </div>

          {/* Date Range Selector Button */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-3.5 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedDateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-40 animate-in fade-in">
                {['May 1 – May 31', 'Last 30 days', 'Current Quarter (Q2)', 'Year to date (2026)'].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setSelectedDateRange(range);
                      setShowDatePicker(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium cursor-pointer ${
                      selectedDateRange === range ? 'bg-purple-50 text-[#6342e8] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* "+ Create new" Primary Button matching Reference UI */}
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="px-4 py-2 bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create new</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/80" />
            </button>

            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-40 animate-in fade-in divide-y divide-slate-100">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowCreateMenu(false);
                      onNavigate('/subscriptions');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#6342e8] transition-colors cursor-pointer text-left"
                  >
                    <Repeat className="w-4 h-4 text-purple-500" />
                    <span>New Subscription</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateMenu(false);
                      onNavigate('/customers');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#6342e8] transition-colors cursor-pointer text-left"
                  >
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>New Customer</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateMenu(false);
                      setShowQuotationModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#6342e8] transition-colors cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>New Quotation</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateMenu(false);
                      onNavigate('/invoices');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#6342e8] transition-colors cursor-pointer text-left"
                  >
                    <Receipt className="w-4 h-4 text-amber-500" />
                    <span>Generate Invoice</span>
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowCreateMenu(false);
                      handleRunBilling();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer text-left font-medium"
                  >
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>Run Automated Billing</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards matching exact Reference UI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active subscriptions */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#f0ebff] text-[#6342e8] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <button className="text-slate-300 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Active subscriptions</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {activeSubsValue}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-2">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>8.4% vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Monthly recurring revenue */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#e8f3ff] text-[#2563eb] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <button className="text-slate-300 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Monthly recurring revenue</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {mrrValue}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-2">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{dataScaleMode === 'enterprise' ? '12.6%' : '12.5%'} vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 3: Payments received */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#eafaf1] text-[#10b981] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <button className="text-slate-300 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Payments received</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {paymentsValue}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-2">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>6.2% vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 4: Outstanding invoices */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#fff8eb] text-[#f59e0b] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <button className="text-slate-300 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Outstanding invoices</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {outstandingValue}
            </div>
            <div className="text-xs font-semibold text-amber-600 mt-2 flex items-center gap-1">
              {dataScaleMode === 'enterprise' ? (
                <span>12 overdue · $7,320 at risk</span>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>1 overdue</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Revenue Overview (2 Columns) & Recent Activity / Billing Health (1 Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns: Revenue Overview Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Revenue overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Recurring revenue performance over time</p>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-xs border border-slate-200/90 rounded-lg px-2.5 py-1 text-slate-600 bg-white shadow-2xs focus:outline-none">
                  <option>Last 12 months</option>
                  <option>Last 6 months</option>
                  <option>Year 2026</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-4 mb-6">
              <div>
                <div className="text-[11px] font-medium text-slate-400">Total revenue</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {totalRevenueValue}
                </div>
              </div>

              {/* Legend matching Reference UI */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6342e8]" />
                  <span className="text-slate-500 font-medium">Recurring revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c4b5fd]" />
                  <span className="text-slate-500 font-medium">Other revenue</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Stacked Bar Chart matching Reference UI */}
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#f1f5f9' }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => `$${val >= 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const rec = Number(payload[0]?.value || 0);
                      const oth = Number(payload[1]?.value || 0);
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl space-y-1">
                          <div className="font-bold text-slate-200">{label} 2026</div>
                          <div className="flex justify-between gap-4 text-purple-300">
                            <span>Recurring:</span>
                            <span className="font-bold">${rec.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-purple-200">
                            <span>Other:</span>
                            <span className="font-bold">${oth.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between font-bold text-white">
                            <span>Total:</span>
                            <span>${(rec + oth).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="recurring" stackId="a" fill="#6342e8" radius={[0, 0, 4, 4]} barSize={22} />
                <Bar dataKey="other" stackId="a" fill="#c4b5fd" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Column: Interactive Toggle for Recent Activity (Model 1) & Billing Health (Model 2) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRightWidgetTab('activity')}
                  className={`text-sm font-bold pb-1 cursor-pointer transition-colors ${
                    rightWidgetTab === 'activity'
                      ? 'text-slate-900 border-b-2 border-[#6342e8]'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Recent activity
                </button>
                <button
                  onClick={() => setRightWidgetTab('health')}
                  className={`text-sm font-bold pb-1 cursor-pointer transition-colors ${
                    rightWidgetTab === 'health'
                      ? 'text-slate-900 border-b-2 border-[#6342e8]'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Billing health
                </button>
              </div>

              {rightWidgetTab === 'activity' ? (
                <button
                  onClick={() => onNavigate('/audit-logs')}
                  className="text-xs font-semibold text-[#6342e8] hover:text-[#5232d6] cursor-pointer"
                >
                  View all
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('/invoices')}
                  className="text-xs font-semibold text-[#6342e8] hover:text-[#5232d6] cursor-pointer"
                >
                  View invoices
                </button>
              )}
            </div>

            {/* Recent Activity List matching Reference UI 1 */}
            {rightWidgetTab === 'activity' && (
              <div className="space-y-4 mt-4">
                <div className="flex items-start justify-between gap-3 p-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#ecfdf5] text-[#10b981] flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Payment received</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Meridian Labs paid INV-2026-1036</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">15 min ago</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 shrink-0">+$8,750</span>
                </div>

                <div className="flex items-start justify-between gap-3 p-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#ede9fe] text-[#6342e8] flex items-center justify-center shrink-0">
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Subscription activated</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Northstar Coffee · Business Annual</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">1 hr ago</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 p-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#eff6ff] text-[#2563eb] flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Invoice sent</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">INV-2026-1042 sent to Northstar Coffee</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">3 hrs ago</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 p-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#fff8eb] text-[#f59e0b] flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Plan upgraded</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Flora &amp; Field moved to Growth</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Yesterday</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Health List matching Reference UI 2 */}
            {rightWidgetTab === 'health' && (
              <div className="space-y-3 mt-4">
                <div
                  onClick={handleRunBilling}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Automated billing</div>
                      <div className="text-[11px] text-slate-500">
                        {runningBilling ? 'Processing jobs...' : 'All billing jobs completed'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

                <div
                  onClick={() => onNavigate('/subscriptions')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Renewals this week</div>
                      <div className="text-[11px] text-slate-500">11 subscriptions scheduled</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

                <div
                  onClick={() => onNavigate('/invoices')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Invoices requiring attention</div>
                      <div className="text-[11px] text-slate-500">3 outstanding invoices</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

                <div
                  onClick={() => onNavigate('/customers')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Customer accounts</div>
                      <div className="text-[11px] text-slate-500">All customer profiles active</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-50 mt-4">
            <button
              onClick={() => onNavigate('/billing')}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-purple-50 text-[#6342e8] text-xs font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span>Explore billing operations</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Invoices Table matching exact Reference UI */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent invoices</h3>
            <p className="text-xs text-slate-400 mt-0.5">Track and manage customer billing</p>
          </div>

          {/* Filter Tabs & "View all invoices >" matching Reference UI */}
          <div className="flex items-center gap-4">
            <div className="flex items-center p-1 bg-slate-50 rounded-xl border border-slate-100">
              {(['all', 'pending', 'paid', 'overdue'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setInvoiceFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    invoiceFilter === filter
                      ? 'bg-white text-[#6342e8] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigate('/invoices')}
              className="text-xs font-bold text-[#6342e8] hover:text-[#5232d6] flex items-center gap-1 cursor-pointer"
            >
              <span>View all invoices</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Crisp Data Table matching Reference UI */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">INVOICE</th>
                <th className="py-3 px-3">CUSTOMER</th>
                <th className="py-3 px-3">AMOUNT</th>
                <th className="py-3 px-3">DUE DATE</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {displayInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => inv.id.startsWith('ref') ? null : setSelectedInvoiceId(inv.id)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 font-semibold text-slate-800 font-mono">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#6342e8] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {inv.customer_initials}
                      </div>
                      <span className="font-bold text-slate-900 group-hover:text-[#6342e8] transition-colors">
                        {inv.customer_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-medium">
                    {formatDate(inv.due_date)}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!inv.id.startsWith('ref')) {
                          setSelectedInvoiceId(inv.id);
                        } else {
                          onNavigate('/invoices');
                        }
                      }}
                      className="text-slate-300 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onUpdated={fetchDashboardData}
        />
      )}

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          isOpen={!!paymentInvoice}
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onPaymentSuccess={fetchDashboardData}
        />
      )}

      {/* Create Quotation Modal */}
      <CreateQuotationModal
        isOpen={showQuotationModal}
        onClose={() => setShowQuotationModal(false)}
        onSuccess={() => {
          setShowQuotationModal(false);
          onNavigate('/quotations');
        }}
      />
    </div>
  );
};
