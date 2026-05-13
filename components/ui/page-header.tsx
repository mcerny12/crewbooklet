'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/components/layout/sidebar-context';
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
  const { open, setOpen } = useSidebar();
  const hasSecondRow = !!(search || filters);

  return (
    <div className={cn('shrink-0 border-b bg-card px-4 py-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground truncate">{title}</h1>
          {subtitle && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground truncate">{subtitle}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {hasSecondRow && (
        <div className="mt-1.5 flex items-center gap-2">
          {search && <div className="flex-1 min-w-0 max-w-sm">{search}</div>}
          {filters && <div className="flex items-center gap-2">{filters}</div>}
        </div>
      )}
    </div>
  );
}
