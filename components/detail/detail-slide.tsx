'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type DetailSlideProps = {
  children: React.ReactNode;
  className?: string;
  /** Accessible label for the slide as a region. */
  ariaLabel?: string;
  /** Short label shown in the canvas's tab bar (≤ ~14 chars). Falls back to ariaLabel. */
  tabLabel?: string;
};

/**
 * A single page inside the desktop detail snap canvas. Each slide takes the
 * full visible width of the canvas (no inter-slide gap — snap-mandatory lands
 * cleanly on slide boundaries) and holds one or two `DetailFrame`s laid out
 * side by side (each `flex-1`). Snap-start sits on the slide, not on the
 * individual frames, so horizontal navigation moves page by page.
 */
export function DetailSlide({ children, className, ariaLabel }: DetailSlideProps) {
  // `tabLabel` is read by the parent canvas via React children inspection,
  // so it intentionally does not need to be destructured/rendered here.
  return (
    <section
      aria-label={ariaLabel}
      className={cn('flex w-full h-full shrink-0 snap-start items-stretch gap-3 px-3', className)}
    >
      {children}
    </section>
  );
}
