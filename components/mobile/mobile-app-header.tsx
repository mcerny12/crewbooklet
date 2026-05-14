'use client';

import * as React from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileAppHeaderProps = {
  title: string;
  subtitle?: string;
  mode?: 'menu' | 'back';
  onMenu?: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
};

export function MobileAppHeader({
  title,
  subtitle,
  mode = 'menu',
  onMenu,
  onBack,
  rightAction,
  className,
}: MobileAppHeaderProps) {
  const isBack = mode === 'back';

  return (
    <header
      className={cn(
        'lg:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85',
        'px-4 pt-safe-or-3 pb-3',
        className
      )}
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={isBack ? onBack : onMenu}
          aria-label={isBack ? 'Back' : 'Open navigation'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-card text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {isBack ? (
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight leading-tight">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground leading-tight">{subtitle}</p>
          ) : null}
        </div>

        {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
      </div>
    </header>
  );
}
