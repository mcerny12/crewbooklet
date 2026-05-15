'use client';

import * as React from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileAppHeaderProps = {
  title: string;
  titleNode?: React.ReactNode;
  subtitle?: string;
  mode?: 'menu' | 'back';
  onMenu?: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
} & { [key: `data-cb-${string}`]: string | undefined };

export function MobileAppHeader({
  title,
  titleNode,
  subtitle,
  mode = 'menu',
  onMenu,
  onBack,
  rightAction,
  className,
  ...rest
}: MobileAppHeaderProps) {
  const isBack = mode === 'back';

  return (
    <header
      className={cn(
        'lg:hidden shrink-0 border-b bg-background',
        'px-3 pb-2',
        className
      )}
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
      {...rest}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={isBack ? onBack : onMenu}
          aria-label={isBack ? 'Back' : 'Open navigation'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {isBack ? (
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {titleNode ?? (
            <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
          )}
          {subtitle ? (
            <p className="truncate text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
          ) : null}
        </div>

        {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
      </div>
    </header>
  );
}
