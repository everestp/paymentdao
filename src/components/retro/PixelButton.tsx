import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'green' | 'red' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function PixelButton({ variant = 'default', size = 'md', className, children, ...props }: BtnProps) {
  const variants: Record<string, string> = {
    default: 'btn',
    primary: 'btn btn-primary',
    green: 'btn btn-green',
    red: 'btn btn-red',
    ghost: 'btn btn-ghost',
  };
  const sizes: Record<string, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' };
  return (
    <button className={cn(variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
