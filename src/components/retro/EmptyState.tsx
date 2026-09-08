import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && <div className="mb-4 text-txdim opacity-40">{icon}</div>}
      <h3 className="text-lg font-heading font-semibold text-txsec mb-2">{title}</h3>
      {description && <p className="text-sm text-txdim max-w-md mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-3 border-bdlight border-t-cyan rounded-full spin mb-3" style={{ borderWidth: '3px' }} />
        <p className="text-sm text-txdim">Loading...</p>
      </div>
    </div>
  );
}
