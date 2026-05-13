import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  /** Short subtitle shown next to the title in muted text */
  subtitle?: string;
  /** Slot for search input */
  search?: React.ReactNode;
  /** Slot for filter controls */
  filters?: React.ReactNode;
  /** Slot for primary action button(s) */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  search,
  filters,
  actions,
  className,
}: PageHeaderProps) {
  const hasSecondRow = !!(search || filters);

  return (
    <div className={cn('shrink-0 border-b bg-card px-4', className)}>
      <div className="flex h-12 items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground truncate">{title}</h1>
          {subtitle && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground truncate">{subtitle}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {hasSecondRow && (
        <div className="flex items-center gap-2 pb-2">
          {search && <div className="flex-1 min-w-0">{search}</div>}
          {filters && <div className="flex items-center gap-2 shrink-0">{filters}</div>}
        </div>
      )}
    </div>
  );
}
