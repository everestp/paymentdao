import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function PixelCard({ children, className, hover, ...props }: CardProps) {
  return (
    <div className={cn('card p-5', hover && 'card-hover cursor-pointer', className)} {...props}>
      {children}
    </div>
  );
}
