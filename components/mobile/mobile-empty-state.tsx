'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type MobileEmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function MobileEmptyState({ icon, title, description, action, className }: MobileEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
