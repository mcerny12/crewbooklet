'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type DetailFrameCarouselProps = {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  showDots?: boolean;
};

export function DetailFrameCarousel({
  children,
  ariaLabel,
  className,
  showDots = true,
}: DetailFrameCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const slidesArr = React.Children.toArray(children).filter(React.isValidElement);
  const slideCount = slidesArr.length;
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root || slideCount === 0) return;

    const slides = Array.from(
      root.querySelectorAll<HTMLElement>(':scope > [data-detail-slide]')
    );
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = -1;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const index = slides.indexOf(entry.target as HTMLElement);
          if (index < 0) return;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        });
        if (bestIndex >= 0 && bestRatio > 0.5) setActiveIndex(bestIndex);
      },
      { root, threshold: [0.25, 0.5, 0.75, 1] }
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [slideCount]);

  const scrollToIndex = React.useCallback((index: number) => {
    const root = scrollRef.current;
    if (!root) return;
    const slides = Array.from(
      root.querySelectorAll<HTMLElement>(':scope > [data-detail-slide]')
    );
    const target = slides[Math.max(0, Math.min(index, slides.length - 1))];
    if (!target) return;
    root.scrollTo({ left: target.offsetLeft - root.offsetLeft, behavior: 'smooth' });
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
      scrollToIndex(slideCount - 1);
    }
  };

  const childrenWithMarker = slidesArr.map((child, index) => {
    if (!React.isValidElement(child)) return child;
    const existing = (child.props as { 'data-detail-slide'?: string }) ?? {};
    return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      ...existing,
      'data-detail-slide': String(index),
      key: child.key ?? String(index),
    });
  });

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-full min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden',
          'scroll-smooth px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        )}
      >
        {childrenWithMarker}
      </div>
      {showDots && slideCount > 1 ? (
        <div
          className="flex shrink-0 items-center justify-center gap-1.5 py-1.5"
          role="tablist"
          aria-label={`${ariaLabel} navigation`}
        >
          {slidesArr.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slide ${index + 1} of ${slideCount}`}
                onClick={() => scrollToIndex(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  isActive
                    ? 'w-5 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
