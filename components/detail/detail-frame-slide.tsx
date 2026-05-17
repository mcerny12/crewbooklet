'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type DetailFrameSlideVariant = 'single' | 'double' | 'wide' | 'compact';

type DetailFrameSlideProps = {
  variant?: DetailFrameSlideVariant;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

const variantClasses: Record<DetailFrameSlideVariant, string> = {
  single: 'w-[calc(100vw-1.5rem)] sm:w-[min(560px,calc(100vw-2rem))] flex flex-col',
  double:
    'w-[calc(100vw-1.5rem)] sm:w-[min(620px,calc(100vw-2rem))] grid grid-rows-2 gap-3 min-h-0',
  wide: 'w-[calc(100vw-1.5rem)] sm:w-[min(860px,calc(100vw-2rem))] flex flex-col',
  compact: 'w-[calc(100vw-1.5rem)] sm:w-[min(420px,calc(100vw-2rem))] flex flex-col',
};

export function DetailFrameSlide({
  variant = 'single',
  children,
  className,
  ariaLabel,
}: DetailFrameSlideProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn('h-full shrink-0 snap-start', variantClasses[variant], className)}
    >
      {children}
    </section>
  );
}
