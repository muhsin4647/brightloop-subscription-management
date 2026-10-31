import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = (status || '').toLowerCase();

  let colorClasses = 'bg-slate-50 text-slate-700 border-slate-200/80';
  let dotColor = 'bg-slate-400';

  if (s === 'paid' || s === 'successful' || s === 'success') {
    colorClasses = 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]/60';
    dotColor = 'bg-[#10b981]';
  } else if (s === 'active' || s === 'accepted') {
    colorClasses = 'bg-[#ede9fe] text-[#6342e8] border-[#ddd6fe]/60';
    dotColor = 'bg-[#6342e8]';
  } else if (s === 'pending' || s === 'partially_paid' || s === 'sent' || s === 'confirmed') {
    colorClasses = 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]/60';
    dotColor = 'bg-[#3b82f6]';
  } else if (s === 'overdue') {
    colorClasses = 'bg-[#fff8ea] text-[#b45309] border-[#fed7aa]/70';
    dotColor = 'bg-[#f59e0b]';
  } else if (s === 'paused') {
    colorClasses = 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]/60';
    dotColor = 'bg-[#f59e0b]';
  } else if (s === 'failed' || s === 'cancelled' || s === 'rejected') {
    colorClasses = 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]/60';
    dotColor = 'bg-[#ef4444]';
  } else if (s === 'draft') {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  } else {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px] font-semibold';

  const label = s
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-tight whitespace-nowrap shrink-0 ${colorClasses} ${padding}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{label}</span>
    </span>
  );
};
