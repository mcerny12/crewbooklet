'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type CompactEntityRowProps = {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  onOpen?: () => void;
  className?: string;
  ariaLabel?: string;
  density?: 'compact' | 'comfortable';
};

export function CompactEntityRow({
  primary,
  secondary,
  meta,
  status,
  actions,
  onOpen,
  className,
  ariaLabel,
  density = 'compact',
}: CompactEntityRowProps) {
  const interactive = !!onOpen;
  const Wrapper: 'button' | 'div' = interactive ? 'button' : 'div';
  const wrapperProps = interactive
    ? {
        type: 'button' as const,
        onClick: onOpen,
        'aria-label': ariaLabel,
      }
    : {};

  return (
    <div
      className={cn(
        'flex items-stretch gap-2 rounded-lg border bg-card text-left transition-colors',
        'hover:bg-muted/40 focus-within:ring-2 focus-within:ring-primary/30',
        density === 'compact' ? 'min-h-10 px-2 py-1.5' : 'min-h-12 px-2.5 py-2',
        className
      )}
    >
      <Wrapper
        {...wrapperProps}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 text-left',
          'focus:outline-none',
          interactive ? 'cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">{primary}</span>
            {status ? <span className="shrink-0">{status}</span> : null}
          </div>
          {secondary ? (
            <span className="truncate text-xs text-muted-foreground">{secondary}</span>
          ) : null}
        </div>
        {meta ? (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</span>
        ) : null}
      </Wrapper>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}
