'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Tailwind text-* colour class for the icon badge background */
  colorClass?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  colorClass = 'bg-blue-50 text-blue-600',
  onClick,
}: StatCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      )}
    >
      {/* Icon badge */}
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colorClass)}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums leading-none">{value}</p>
      </div>
    </div>
  );
}
