import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PixelAvatar({ name, color, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn('flex items-center justify-center font-semibold rounded-full shrink-0', sizes[size], className)}
      style={{ background: `${color}20`, border: `1.5px solid ${color}`, color }}
    >
      {getInitials(name)}
    </div>
  );
}

interface AvatarStackProps {
  members: { name: string; color: string }[];
  size?: 'xs' | 'sm' | 'md';
  max?: number;
  className?: string;
}

export function AvatarStack({ members, size = 'sm', max = 4, className }: AvatarStackProps) {
  const shown = members.slice(0, max);
  const remaining = members.length - max;
  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {shown.map((m, i) => (
        <div key={i} style={{ zIndex: max - i }} className="rounded-full">
          <PixelAvatar name={m.name} color={m.color} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div className={cn('flex items-center justify-center font-semibold bg-bgpanel2 border border-bdlight text-txsec rounded-full', sizes[size])} style={{ zIndex: 0 }}>
          +{remaining}
        </div>
      )}
    </div>
  );
}
