import React, { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
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
  iconBg = 'bg-[#f0ebff]',
  iconColor = 'text-[#6342e8]',
  trend,
  trendUp = true,
  highlight,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white border border-slate-100 shadow-xs transition-all ${
        highlight
          ? 'ring-2 ring-[#6342e8]/20 border-[#6342e8]/40'
          : 'hover:shadow-md'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        {icon ? (
          <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
            {icon}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#f0ebff] text-[#6342e8] flex items-center justify-center font-bold text-xs">
            BL
          </div>
        )}
        <button className="text-slate-300 hover:text-slate-600 p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4">
        <div className="text-xs font-medium text-slate-500">{title}</div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          {value}
        </div>

        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{trend}</span>
          </div>
        )}

        {subtitle && !trend && (
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
