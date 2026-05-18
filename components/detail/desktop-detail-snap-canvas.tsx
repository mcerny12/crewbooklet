'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type DesktopDetailSnapCanvasProps = {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
};

type SlideElementProps = {
  ariaLabel?: string;
  tabLabel?: string;
};

/**
 * Single full-height horizontal scroll-snap container that pages through
 * `DetailSlide` siblings. Each slide is exactly the canvas width and snaps
 * mandatorily, so the visible area always shows one full slide.
 *
 * Above the scroll area there is a tab bar — one button per slide labelled
 * from the slide's `tabLabel` (or `ariaLabel` as fallback). Clicking a tab
 * jumps to that slide; keyboard arrows / Home / End and wheel scrolling
 * (vertical wheel is converted into horizontal scrolling at ~3× amplification)
 * also navigate.
 */
export function DesktopDetailSnapCanvas({
  children,
  ariaLabel,
  className,
}: DesktopDetailSnapCanvasProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const slides = React.Children.toArray(children).filter(React.isValidElement);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const scrollToIndex = React.useCallback(
    (index: number) => {
      const root = scrollRef.current;
      if (!root) return;
      const clamped = Math.max(0, Math.min(index, slides.length - 1));
      root.scrollTo({ left: clamped * root.clientWidth, behavior: 'smooth' });
    },
    [slides.length]
  );

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const update = () => {
      const w = root.clientWidth;
      if (w === 0) return;
      const idx = Math.round(root.scrollLeft / w);
      setActiveIndex(Math.min(slides.length - 1, Math.max(0, idx)));
    };
    update();
    root.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => {
      root.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [slides.length]);

  const onWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const root = scrollRef.current;
    if (!root) return;
    // Convert vertical wheel into horizontal scroll, amplified so a single
    // trackpad/mouse tick covers meaningful ground toward the next slide.
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && event.deltaY !== 0) {
      const max = root.scrollWidth - root.clientWidth;
      const next = root.scrollLeft + event.deltaY * 3;
      const clamped = Math.max(0, Math.min(max, next));
      if (clamped !== root.scrollLeft) {
        root.scrollLeft = clamped;
        event.preventDefault();
      }
    }
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollToIndex(activeIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollToIndex(activeIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      scrollToIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollToIndex(slides.length - 1);
    }
  };

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      {slides.length > 1 ? (
        <div
          role="tablist"
          aria-label={`${ariaLabel} navigation`}
          className="shrink-0 flex gap-1 overflow-x-auto border-b bg-muted/30 px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, i) => {
            const props = (slide as React.ReactElement<SlideElementProps>).props;
            const label = props.tabLabel ?? props.ariaLabel ?? `Slide ${i + 1}`;
            const isActive = i === activeIndex;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => scrollToIndex(i)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        className={cn(
          'flex min-h-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden',
          'snap-x snap-mandatory scroll-smooth py-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset'
        )}
      >
        {children}
      </div>
    </div>
  );
}
