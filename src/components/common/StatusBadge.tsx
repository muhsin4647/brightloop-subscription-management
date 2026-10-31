import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = (status || '').toLowerCase();

  let colorClasses = 'bg-slate-50 text-slate-700 border-slate-200/80';
  let dotColor = 'bg-slate-400';

  if (s === 'active' || s === 'paid' || s === 'successful' || s === 'success' || s === 'accepted') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
    dotColor = 'bg-emerald-500';
  } else if (s === 'paused' || s === 'partially_paid' || s === 'pending') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/70';
    dotColor = 'bg-amber-500';
  } else if (s === 'overdue' || s === 'failed' || s === 'cancelled' || s === 'rejected') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/70';
    dotColor = 'bg-rose-500';
  } else if (s === 'sent' || s === 'confirmed') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/70';
    dotColor = 'bg-blue-500';
  } else if (s === 'draft') {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  } else if (s === 'closed' || s === 'archived' || s === 'expired') {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs font-medium';

  const label = s
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-tight whitespace-nowrap shrink-0 ${colorClasses} ${padding}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{label}</span>
    </span>
  );
};
