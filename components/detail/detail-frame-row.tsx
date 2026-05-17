'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type DetailFrameRowProps = {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  snap?: boolean;
};

export function DetailFrameRow({
  children,
  ariaLabel,
  className,
  snap = true,
}: DetailFrameRowProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = React.useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });

  const recompute = React.useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;
    const { scrollLeft, scrollWidth, clientWidth } = root;
    setOverflow({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    });
  }, []);

  React.useEffect(() => {
    recompute();
    const root = scrollRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(root);
    return () => ro.disconnect();
  }, [recompute]);

  const onWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const root = scrollRef.current;
    if (!root) return;
    // Convert vertical wheel into horizontal scroll on desktop trackpads/mice
    // unless the user is already scrolling horizontally.
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && event.deltaY !== 0) {
      const next = root.scrollLeft + event.deltaY;
      const max = root.scrollWidth - root.clientWidth;
      if (next > 0 && next < max) {
        root.scrollLeft = next;
        event.preventDefault();
      }
    }
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const root = scrollRef.current;
    if (!root) return;
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      root.scrollBy({ left: 320, behavior: 'smooth' });
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      root.scrollBy({ left: -320, behavior: 'smooth' });
    } else if (event.key === 'Home') {
      event.preventDefault();
      root.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (event.key === 'End') {
      event.preventDefault();
      root.scrollTo({ left: root.scrollWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('relative h-full min-h-0', className)}>
      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={recompute}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-full min-h-0 items-stretch gap-3 overflow-x-auto overflow-y-hidden',
          'scroll-smooth px-3 py-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset',
          snap && 'snap-x snap-proximity'
        )}
      >
        {children}
      </div>
      {overflow.left ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent"
        />
      ) : null}
      {overflow.right ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
        />
      ) : null}
    </div>
  );
}
