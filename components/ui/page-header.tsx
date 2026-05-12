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
  return (
    <div className={cn('shrink-0 border-b bg-card px-5 py-4', className)}>
      {/* Top row: title + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
          {subtitle && (
            <span className="hidden sm:inline text-sm text-muted-foreground truncate">{subtitle}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Bottom row: search + filters (only if provided) */}
      {(search || filters) && (
        <div className="mt-3 flex items-center gap-2">
          {search && <div className="flex-1 min-w-0 max-w-sm">{search}</div>}
          {filters && <div className="flex items-center gap-2">{filters}</div>}
        </div>
      )}
    </div>
  );
}
