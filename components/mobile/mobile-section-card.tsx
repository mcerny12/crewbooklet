'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type MobileSectionCardProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
};

export function MobileSectionCard({ title, children, className, action }: MobileSectionCardProps) {
  return (
    <div className={cn('rounded-2xl border bg-card shadow-sm overflow-hidden', className)}>
      {title || action ? (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
