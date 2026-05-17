'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type DetailFrameProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  scrollable?: boolean;
} & { [key: `data-cb-${string}`]: string | undefined };

export function DetailFrame({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  scrollable = true,
  ...rest
}: DetailFrameProps) {
  const titleId = React.useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm',
        className
      )}
      {...rest}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <h3 id={titleId} className="truncate text-sm font-semibold leading-tight">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div
        className={cn(
          'min-h-0 min-w-0 flex-1 p-3',
          scrollable && 'overflow-y-auto',
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
