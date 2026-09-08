import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface NetworkBadgeProps {
  className?: string;
  live?: boolean;
}

export function NetworkBadge({ className, live }: NetworkBadgeProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-bdlight bg-bgpanel', className)}>
      <span className={cn('w-2 h-2 rounded-full', live ? 'bg-green blink' : 'bg-cyan')} />
      <span className="text-xs font-medium text-txsec">Solana • Demo Network</span>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap', className)}>
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-txprim mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-txsec">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
