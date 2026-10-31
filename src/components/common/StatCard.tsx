import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  highlight,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border bg-white transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        highlight
          ? 'border-indigo-300 ring-1 ring-indigo-500/10'
          : 'border-slate-200/90 hover:border-slate-300'
      } ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">{value}</div>
        {trend && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{subtitle}</p>}
    </div>
  );
};
