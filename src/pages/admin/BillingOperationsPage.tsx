import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { BillingEvent } from '../../types/index.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Play, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, Cog, Calendar } from 'lucide-react';

export const BillingOperationsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const fetchBillingOpsData = async () => {
    try {
      const [statusRes, eventsRes] = await Promise.all([
        apiRequest('/billing/status'),
        apiRequest<BillingEvent[]>('/billing/events'),
      ]);
      setStatus(statusRes);
      setEvents(eventsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingOpsData();
  }, []);

  const handleRunBilling = async () => {
    setRunning(true);
    setResultMessage(null);
    try {
      const res = await apiRequest('/billing/run-due', { method: 'POST' });
      setResultMessage(res.message);
      await fetchBillingOpsData();
    } catch (err: any) {
      setResultMessage(`Billing execution failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleRetry = async (eventId: string) => {
    setRetryingId(eventId);
    try {
      const res = await apiRequest(`/billing/events/${eventId}/retry`, { method: 'POST' });
      setResultMessage(res.message);
      await fetchBillingOpsData();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Automated Billing Operations &amp; Scheduler</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Idempotent recurring billing engine, duplicate invoice prevention, and failure retry reconciliation.
          </p>
        </div>

        <button
          onClick={handleRunBilling}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Executing Billing Run...' : 'Run Due Billing Scheduler Now'}
        </button>
      </div>

      {resultMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>{resultMessage}</span>
          </div>
          <button onClick={() => setResultMessage(null)} className="text-indigo-600 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Scheduler Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Scheduler State</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active (60s cron)
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">Automatic Background Runner</div>
          <p className="text-xs text-slate-500 mt-1">Evaluates next_billing_date against current date.</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Due for Invoicing Today</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-600 mt-1">{status?.dueSubscriptionsCount ?? 0}</div>
          <p className="text-xs text-slate-500 mt-1">Active subscriptions with billing date &le; today</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Duplicate Prevention</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">Idempotency Enforced</div>
          <p className="text-xs text-slate-500 mt-1">
            Unique index on (subscription_id, period_start, period_end) prevents double-billing.
          </p>
        </div>
      </div>

      {/* Billing Events Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Billing Execution Events &amp; Idempotency Ledger</h3>
            <p className="text-xs text-slate-500">Every billing attempt is recorded to ensure exact one-time invoicing per period.</p>
          </div>
          <button
            onClick={fetchBillingOpsData}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Attempt Timestamp</th>
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Generated Invoice</th>
                <th className="py-3 px-4 text-center">Outcome</th>
                <th className="py-3 px-4 text-right">Retry / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading billing events...</td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No billing events logged yet.</td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{formatDate(evt.attempt_timestamp)}</td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{evt.subscription_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{evt.customer_name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-mono text-[11px]">{evt.billing_period_start} &rarr; {evt.billing_period_end}</span>
                    </td>
                    <td className="py-3 px-4">
                      {evt.invoice_number ? (
                        <span className="font-bold text-slate-900">{evt.invoice_number}</span>
                      ) : (
                        <span className="text-slate-400 italic">None (Failed)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={evt.outcome} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {evt.outcome === 'failed' ? (
                        <button
                          onClick={() => handleRetry(evt.id)}
                          disabled={retryingId === evt.id}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] disabled:opacity-50"
                        >
                          {retryingId === evt.id ? 'Retrying...' : `Retry Attempt (${evt.retry_count})`}
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
