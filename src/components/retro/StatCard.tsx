import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  color?: string;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon, color = '#00d4e6', trend, trendUp, className }: StatCardProps) {
  return (
    <div className={cn('card p-4', className)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-txsec uppercase tracking-wide">{label}</span>
        {icon && <span style={{ color }}>{icon}</span>}
      </div>
      <div className="text-2xl font-heading font-semibold text-txprim mb-1" style={{ color }}>
        {value}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className={cn('text-xs font-mono', trendUp ? 'text-green' : 'text-red')}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        </div>
      )}
    </div>
  );
}
