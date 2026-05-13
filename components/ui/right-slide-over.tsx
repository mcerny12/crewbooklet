'use client';

import { ReactNode, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface RightSlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  children: ReactNode;
}

export function RightSlideOver({
  open,
  onOpenChange,
  title,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  children,
}: RightSlideOverProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-background shadow-2xl border-l border-border animate-in slide-in-from-right duration-200 md:w-[520px]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b bg-card px-3 py-2">
          <button
            type="button"
            onClick={hasPrev ? onPrev : undefined}
            disabled={!hasPrev}
            aria-label="Previous item"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={hasNext ? onNext : undefined}
            disabled={!hasNext}
            aria-label="Next item"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {title ? (
            <h2 className="ml-2 flex-1 truncate text-sm font-semibold text-foreground">{title}</h2>
          ) : (
            <div className="flex-1" />
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close panel"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
