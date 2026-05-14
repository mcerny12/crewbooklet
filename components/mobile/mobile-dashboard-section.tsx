'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type MobileDashboardSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
};

export function MobileDashboardSection({ title, children, className, action }: MobileDashboardSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
